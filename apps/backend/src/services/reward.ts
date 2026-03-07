import { PrismaClient } from "@prisma/client";
import { PublicKey } from "@solana/web3.js";
import { execSync } from "child_process";
import { GrailService } from "./grail";
import { KycService } from "./kyc";
import { WalletService } from "./wallet";
import { SolanaService } from "./solana";

const prisma = new PrismaClient();

export class RewardService {

  static async processShopifyOrder(merchantId: string, orderPayload: any) {
    const orderId = orderPayload.id.toString();
    const customerEmail = orderPayload.email || orderPayload.contact_email;
    const totalPriceUsd = parseFloat(orderPayload.total_price);

    console.log(`[RewardEngine] Processing Order ${orderId} for \$${totalPriceUsd}`);

    if (!customerEmail) {
      throw new Error(`Order ${orderId} missing customer email`);
    }

    const existingLedger = await prisma.ledger.findUnique({
      where: {
        orderId_merchantId: { orderId, merchantId }
      }
    });
    if (existingLedger) {
      console.log(`[RewardEngine] Order ${orderId} already processed (Idempotency skip).`);
      return { status: "skipped", message: "Already processed", ledger: existingLedger };
    }

    if (!merchantId) {
      throw new Error(`No merchantId resolved from webhook. Check that X-Shopify-Shop-Domain matches a registered merchant.`);
    }
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) throw new Error(`Merchant ${merchantId} not found`);
    if (!merchant.walletAddress || !merchant.encryptedPrivateKey) {
      throw new Error(`Merchant ${merchantId} wallet not initialized`);
    }

    const kycHash = KycService.generateHash(customerEmail);
    let user = await prisma.user.findUnique({ where: { kycHash } })
      ?? await prisma.user.findUnique({ where: { email: customerEmail } });

    if (!user) {
      console.log(`[RewardEngine] Existing user not found. Creating User Vault for ${customerEmail}`);
      const wallet = WalletService.generateWallet();
      const encryptedKey = WalletService.encryptPrivateKey(wallet.secretKey);

      const grailUser = await GrailService.createUser(kycHash, wallet.publicKey);

      try {
        console.log(`[RewardEngine] Funding new user wallet ${wallet.publicKey} with 0.005 SOL...`);
        execSync(`solana transfer ${wallet.publicKey} 0.005 --allow-unfunded-recipient`, { stdio: 'pipe' });
        console.log(`[RewardEngine] Successfully funded wallet.`);
      } catch (e: any) {
        console.error(`[RewardEngine] Warning: CLI SOL Airdrop failed:`, e.stderr?.toString() || e.message);
      }

      user = await prisma.user.create({
        data: {
          email: customerEmail,
          kycHash,
          walletAddress: wallet.publicKey,
          encryptedPrivateKey: encryptedKey,
          userPda: grailUser.userPda,
          balanceGold: 0.0
        }
      });
    }

    const rewardUsd = totalPriceUsd * merchant.rewardRatio;
    console.log(`[RewardEngine] Calculated reward: $${rewardUsd.toFixed(2)} (Ratio: ${merchant.rewardRatio * 100}%)`);

    if (rewardUsd < 0.01) {
      console.log(`[RewardEngine] Reward too small to process.`);
      return { status: "skipped", message: "Reward amount negligible" };
    }

    console.log(`[RewardEngine] Fetching live gold price from tradebook...`);
    const priceRes = await fetch(
      "https://oro-tradebook-devnet.up.railway.app/api/trading/estimate/buy",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": process.env.ORO_EXECUTING_API_KEY || "" },
        body: JSON.stringify({ goldAmount: 1 })
      }
    );
    if (!priceRes.ok) throw new Error(`Tradebook price fetch failed: ${priceRes.status}`);
    const priceData = await priceRes.json() as { success: boolean; data: { goldPricePerOunce: number } };
    if (!priceData.success) throw new Error("Tradebook returned success=false");

    const goldPricePerOunce = priceData.data.goldPricePerOunce;
    const amountGoldOz = rewardUsd / goldPricePerOunce;
    console.log(`[RewardEngine] Gold price: $${goldPricePerOunce}/oz → rewarding ${amountGoldOz.toFixed(6)} oz`);

    if (merchant.balanceGold < amountGoldOz) {
      console.error(`[RewardEngine] Insufficient Gold. Required: ${amountGoldOz.toFixed(6)} oz, Available: ${merchant.balanceGold.toFixed(6)} oz`);
      const ledger = await prisma.ledger.create({
        data: { merchantId: merchant.id, userId: user.id, orderId, amountGold: 0, status: "FAILED_INSUFFICIENT_FUNDS" }
      });
      return { status: "failed", message: "Insufficient merchant gold balance", ledger };
    }

    let merchantToPartnerSig: string | null = null;
    let partnerToUserSig: string | null = null;
    let status = "PENDING";

    try {
      const result = await SolanaService.RelayGoldToUser(
        amountGoldOz,
        new PublicKey(merchant.walletAddress),
        merchant.encryptedPrivateKey,
        new PublicKey(user.walletAddress)
      );
      merchantToPartnerSig = result.merchantToPartnerSig;
      partnerToUserSig = result.partnerToUserSig;
      status = "SUCCESS";
      console.log(`[RewardEngine] Relay done! Leg1: ${merchantToPartnerSig} | Leg2: ${partnerToUserSig}`);

      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { balanceGold: { decrement: amountGoldOz } }
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { balanceGold: { increment: amountGoldOz } }
      });

      console.log(`[RewardEngine] Deducted ${amountGoldOz.toFixed(6)} oz gold from Merchant ${merchant.name}`);
    } catch (e: any) {
      console.error(`[RewardEngine] Relay failed:`, e.message);
      status = "FAILED";
    }

    const ledger = await prisma.ledger.create({
      data: {
        merchantId: merchant.id,
        userId: user.id,
        orderId,
        amountGold: amountGoldOz,
        status,
        txSignature: partnerToUserSig
      }
    });

    return { status, ledger, rewardUsd, amountGoldOz, merchantToPartnerSig, partnerToUserSig };
  }
}

