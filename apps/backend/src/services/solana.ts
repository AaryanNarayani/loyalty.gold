import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
} from "@solana/spl-token";
import bs58 from "bs58";
import { WalletService } from "./wallet";

export class SolanaService {

    static async FundMerchantUsdc(
        amount: number,
        merchantWallet: PublicKey
    ) {
        if (!process.env.ORO_PARTNER_PRIVATE_KEY) {
            throw new Error("ORO_PARTNER_PRIVATE_KEY missing in .env");
        }

        const connection = new Connection(process.env.RPC_URL!, "confirmed");

        const secretKey = bs58.decode(process.env.ORO_PARTNER_PRIVATE_KEY);
        const signer = Keypair.fromSecretKey(secretKey);

        const USDC_MINT = new PublicKey(
            "8METbBgV5CSyorAaW5Lm42dbWdE8JU9vfBiM67TK9Mp4"
        );

        const amountInSmallestUnit = amount * 1_000_000;

        const senderATA = await getAssociatedTokenAddress(
            USDC_MINT,
            signer.publicKey
        );

        const merchantATA = await getAssociatedTokenAddress(
            USDC_MINT,
            merchantWallet
        );

        const transaction = new Transaction();

        const merchantAccountInfo = await connection.getAccountInfo(merchantATA);

        if (!merchantAccountInfo) {
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    signer.publicKey,
                    merchantATA,
                    merchantWallet,
                    USDC_MINT
                )
            );
        }

        transaction.add(
            createTransferInstruction(
                senderATA,
                merchantATA,
                signer.publicKey,
                amountInSmallestUnit
            )
        );

        const signature = await sendAndConfirmTransaction(
            connection,
            transaction,
            [signer]
        );

        console.log("USDC sent successfully");
        console.log("Signature:", signature);

        return signature;
    }

    static async SendReward(
        rewardUsd: number,
        amountGoldOz: number,
        merchantWallet: PublicKey,
        encryptedMerchantKey: string,
        userWallet: PublicKey
    ): Promise<{ usdcSignature: string; goldSignature: string }> {
        if (!process.env.ORO_PARTNER_PRIVATE_KEY) throw new Error('ORO_PARTNER_PRIVATE_KEY missing');
        if (!process.env.ORO_PARTNER_WALLET) throw new Error('ORO_PARTNER_WALLET missing');

        const connection = new Connection(process.env.RPC_URL!, 'confirmed');

        const partnerKeypair = Keypair.fromSecretKey(bs58.decode(process.env.ORO_PARTNER_PRIVATE_KEY));
        const partnerWallet = new PublicKey(process.env.ORO_PARTNER_WALLET);

        const merchantSecretBase64 = WalletService.decryptPrivateKey(encryptedMerchantKey);
        const merchantKeypair = Keypair.fromSecretKey(Buffer.from(merchantSecretBase64, 'base64'));

        const USDC_MINT = new PublicKey('8METbBgV5CSyorAaW5Lm42dbWdE8JU9vfBiM67TK9Mp4');
        const GOLD_MINT = new PublicKey('Cu5rvMuh9asSHyCtof81B8sYU8iM62MgaWVVZnQDDZst');

        const usdcRaw = Math.floor(rewardUsd * 1_000_000);
        const goldRaw = Math.floor(amountGoldOz * 1_000_000);

        const merchantUsdcATA = await getAssociatedTokenAddress(USDC_MINT, merchantWallet);
        const partnerUsdcATA = await getAssociatedTokenAddress(USDC_MINT, partnerWallet);

        const usdcTx = new Transaction().add(
            createTransferInstruction(merchantUsdcATA, partnerUsdcATA, merchantKeypair.publicKey, usdcRaw)
        );

        console.log(`[SendReward] Leg 1: ${rewardUsd} USDC merchant → partner...`);
        const usdcSignature = await sendAndConfirmTransaction(connection, usdcTx, [merchantKeypair]);
        console.log(`[SendReward] Leg 1 confirmed. Sig: ${usdcSignature}`);

        const partnerGoldATA = await getAssociatedTokenAddress(GOLD_MINT, partnerWallet);
        const userGoldATA = await getAssociatedTokenAddress(GOLD_MINT, userWallet);

        const goldTx = new Transaction();

        const userGoldAccountInfo = await connection.getAccountInfo(userGoldATA);
        if (!userGoldAccountInfo) {
            goldTx.add(createAssociatedTokenAccountInstruction(
                partnerKeypair.publicKey, userGoldATA, userWallet, GOLD_MINT
            ));
        }
        goldTx.add(createTransferInstruction(partnerGoldATA, userGoldATA, partnerKeypair.publicKey, goldRaw));

        console.log(`[SendReward] Leg 2: ${amountGoldOz.toFixed(6)} oz GOLD partner → user...`);
        const goldSignature = await sendAndConfirmTransaction(connection, goldTx, [partnerKeypair]);
        console.log(`[SendReward] Leg 2 confirmed. Sig: ${goldSignature}`);

        return { usdcSignature, goldSignature };
    }


    static async RelayGoldToUser(
        amountGoldOz: number,
        merchantWallet: PublicKey,
        encryptedMerchantKey: string,
        userWallet: PublicKey
    ): Promise<{ merchantToPartnerSig: string; partnerToUserSig: string }> {
        if (!process.env.ORO_PARTNER_PRIVATE_KEY) throw new Error('ORO_PARTNER_PRIVATE_KEY missing');
        if (!process.env.ORO_PARTNER_WALLET) throw new Error('ORO_PARTNER_WALLET missing');

        const connection = new Connection(process.env.RPC_URL!, 'confirmed');
        const GOLD_MINT = new PublicKey('Cu5rvMuh9asSHyCtof81B8sYU8iM62MgaWVVZnQDDZst');
        const goldRaw = Math.floor(amountGoldOz * 1_000_000);

        const partnerKeypair = Keypair.fromSecretKey(bs58.decode(process.env.ORO_PARTNER_PRIVATE_KEY));
        const partnerWallet = new PublicKey(process.env.ORO_PARTNER_WALLET);

        const merchantSecretBase64 = WalletService.decryptPrivateKey(encryptedMerchantKey);
        const merchantKeypair = Keypair.fromSecretKey(Buffer.from(merchantSecretBase64, 'base64'));

        const merchantGoldATA = await getAssociatedTokenAddress(GOLD_MINT, merchantWallet);
        const partnerGoldATA = await getAssociatedTokenAddress(GOLD_MINT, partnerWallet);
        const userGoldATA = await getAssociatedTokenAddress(GOLD_MINT, userWallet);

        const leg1Tx = new Transaction().add(
            createTransferInstruction(merchantGoldATA, partnerGoldATA, merchantKeypair.publicKey, goldRaw)
        );
        console.log(`[RelayGold] Leg 1: ${amountGoldOz.toFixed(6)} oz merchant → partner...`);
        const merchantToPartnerSig = await sendAndConfirmTransaction(connection, leg1Tx, [merchantKeypair]);
        console.log(`[RelayGold] Leg 1 confirmed. Sig: ${merchantToPartnerSig}`);

        const leg2Tx = new Transaction();
        const userGoldAccountInfo = await connection.getAccountInfo(userGoldATA);
        if (!userGoldAccountInfo) {
            leg2Tx.add(createAssociatedTokenAccountInstruction(
                partnerKeypair.publicKey, userGoldATA, userWallet, GOLD_MINT
            ));
        }
        leg2Tx.add(createTransferInstruction(partnerGoldATA, userGoldATA, partnerKeypair.publicKey, goldRaw));

        console.log(`[RelayGold] Leg 2: ${amountGoldOz.toFixed(6)} oz partner → user...`);
        const partnerToUserSig = await sendAndConfirmTransaction(connection, leg2Tx, [partnerKeypair]);
        console.log(`[RelayGold] Leg 2 confirmed. Sig: ${partnerToUserSig}`);

        return { merchantToPartnerSig, partnerToUserSig };
    }

    static async WithdrawToken(
        amount: number,
        asset: 'USDC' | 'GOLD',
        merchantWallet: PublicKey,
        encryptedMerchantKey: string,
        destinationWallet: PublicKey
    ): Promise<string> {
        const connection = new Connection(process.env.RPC_URL!, 'confirmed');

        const merchantSecretBase64 = WalletService.decryptPrivateKey(encryptedMerchantKey);
        const merchantKeypair = Keypair.fromSecretKey(Buffer.from(merchantSecretBase64, 'base64'));

        const USDC_MINT = new PublicKey('8METbBgV5CSyorAaW5Lm42dbWdE8JU9vfBiM67TK9Mp4');
        const GOLD_MINT = new PublicKey('Cu5rvMuh9asSHyCtof81B8sYU8iM62MgaWVVZnQDDZst');

        const mint = asset === 'USDC' ? USDC_MINT : GOLD_MINT;
        const decimals = asset === 'USDC' ? 6 : 6;
        const rawAmount = Math.floor(amount * Math.pow(10, decimals));

        const sourceATA = await getAssociatedTokenAddress(mint, merchantWallet);
        const destinationATA = await getAssociatedTokenAddress(mint, destinationWallet);

        const tx = new Transaction();

        const destinationAccountInfo = await connection.getAccountInfo(destinationATA);
        if (!destinationAccountInfo) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    merchantKeypair.publicKey, // fee payer
                    destinationATA,
                    destinationWallet,
                    mint
                )
            );
        }

        tx.add(
            createTransferInstruction(
                sourceATA,
                destinationATA,
                merchantKeypair.publicKey,
                rawAmount
            )
        );

        console.log(`[WithdrawToken] Sending ${amount} ${asset} from merchant treasury → ${destinationWallet.toBase58()}...`);
        const signature = await sendAndConfirmTransaction(connection, tx, [merchantKeypair]);
        console.log(`[WithdrawToken] Confirmed. Sig: ${signature}`);

        return signature;
    }


    static async getMerchantBalances(merchantWallet: PublicKey) {
        const connection = new Connection(process.env.RPC_URL!, "confirmed");
        const USDC_MINT = new PublicKey(
            "8METbBgV5CSyorAaW5Lm42dbWdE8JU9vfBiM67TK9Mp4" // the oro test usdc mint
        );
        const merchantATA = await getAssociatedTokenAddress(
            USDC_MINT,
            merchantWallet
        );
        const balance = await connection.getTokenAccountBalance(merchantATA);
        return balance;
    }

    // Client side rpc url checks, if balances differ from localstate then we call the endpoint to updatebalances 
    // Update balance endpoint will use the getMerchantBalances and see if any change is needed if yes then it will
    // update it in the db

    static async getMerchantGoldBalance(merchantWallet: PublicKey) {
        const connection = new Connection(process.env.RPC_URL!, "confirmed");
        const GOLD_MINT = new PublicKey(
            "Cu5rvMuh9asSHyCtof81B8sYU8iM62 MgaWVVZnQDDZst" // the oro test gold mint
        );
        const merchantATA = await getAssociatedTokenAddress(
            GOLD_MINT,
            merchantWallet
        );
        const balance = await connection.getTokenAccountBalance(merchantATA);
        return balance;
    }

    // amount: USDC amount the merchant wants to convert
    // encryptedMerchantKey: the merchant's stored encrypted private key (needed to sign USDC transfer)
    static async ConvertMerchantUsdcToGold(
        amount: number,
        merchantWallet: PublicKey,
        encryptedMerchantKey: string
    ) {
        if (!process.env.ORO_PARTNER_PRIVATE_KEY) {
            throw new Error("ORO_PARTNER_PRIVATE_KEY missing in .env");
        }
        if (!process.env.ORO_PARTNER_WALLET) {
            throw new Error("ORO_PARTNER_WALLET missing in .env");
        }

        const connection = new Connection(process.env.RPC_URL!, "confirmed");

        // Partner keypair (signs gold leg + creates ATAs)
        const partnerSecretKey = bs58.decode(process.env.ORO_PARTNER_PRIVATE_KEY);
        const partnerKeypair = Keypair.fromSecretKey(partnerSecretKey);
        const partnerWallet = new PublicKey(process.env.ORO_PARTNER_WALLET);

        // Merchant keypair (signs USDC leg)
        const merchantSecretBase64 = WalletService.decryptPrivateKey(encryptedMerchantKey);
        const merchantKeypair = Keypair.fromSecretKey(Buffer.from(merchantSecretBase64, 'base64'));

        // Token mints
        const USDC_MINT = new PublicKey("8METbBgV5CSyorAaW5Lm42dbWdE8JU9vfBiM67TK9Mp4");
        const GOLD_MINT = new PublicKey("Cu5rvMuh9asSHyCtof81B8sYU8iM62MgaWVVZnQDDZst");

        // ── Step 1: Fetch live gold price ───────────────────────────────────────
        console.log(`[ConvertUsdcToGold] Fetching gold price from tradebook...`);
        const priceRes = await fetch(
            "https://oro-tradebook-devnet.up.railway.app/api/trading/estimate/buy",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.ORO_EXECUTING_API_KEY || "",
                },
                body: JSON.stringify({ goldAmount: 1 }) // fetch price per 1 oz
            }
        );
        if (!priceRes.ok) {
            throw new Error(`Tradebook price fetch failed: ${priceRes.status} ${await priceRes.text()}`);
        }
        const priceData = await priceRes.json() as {
            success: boolean;
            data: { goldPricePerOunce: number };
        };
        if (!priceData.success) {
            throw new Error("Tradebook returned success=false when fetching gold price");
        }
        const goldPricePerOunce = priceData.data.goldPricePerOunce;
        const goldAmountOz = amount / goldPricePerOunce;
        console.log(`[ConvertUsdcToGold] Gold price: $${goldPricePerOunce}/oz → ${goldAmountOz.toFixed(9)} oz for ${amount} USDC`);

        // Gold uses 9 decimal places on this mint
        const GOLD_DECIMALS = 6;
        const goldSmallestUnit = Math.floor(goldAmountOz * Math.pow(10, GOLD_DECIMALS));

        // USDC uses 6 decimal places
        const usdcSmallestUnit = Math.floor(amount * 1_000_000);

        // ── Step 2: USDC leg — Merchant → Partner ────────────────────────────────
        // Merchant sends `amount` USDC to partner's USDC ATA
        const merchantUsdcATA = await getAssociatedTokenAddress(USDC_MINT, merchantWallet);
        const partnerUsdcATA = await getAssociatedTokenAddress(USDC_MINT, partnerWallet);

        const usdcTx = new Transaction().add(
            createTransferInstruction(
                merchantUsdcATA,
                partnerUsdcATA,
                merchantKeypair.publicKey,
                usdcSmallestUnit
            )
        );

        console.log(`[ConvertUsdcToGold] Sending ${amount} USDC from merchant → partner...`);
        const usdcSignature = await sendAndConfirmTransaction(
            connection,
            usdcTx,
            [merchantKeypair]
        );
        console.log(`[ConvertUsdcToGold] USDC leg confirmed. Sig: ${usdcSignature}`);

        // ── Step 3: GOLD leg — Partner → Merchant ────────────────────────────────
        // Partner sends goldSmallestUnit GOLD to merchant's GOLD ATA (create if needed)
        const partnerGoldATA = await getAssociatedTokenAddress(GOLD_MINT, partnerWallet);
        const merchantGoldATA = await getAssociatedTokenAddress(GOLD_MINT, merchantWallet);

        const goldTx = new Transaction();

        // Create merchant GOLD ATA if it doesn't exist yet
        const merchantGoldAccountInfo = await connection.getAccountInfo(merchantGoldATA);
        if (!merchantGoldAccountInfo) {
            goldTx.add(
                createAssociatedTokenAccountInstruction(
                    partnerKeypair.publicKey, // fee payer
                    merchantGoldATA,
                    merchantWallet,
                    GOLD_MINT
                )
            );
        }

        goldTx.add(
            createTransferInstruction(
                partnerGoldATA,
                merchantGoldATA,
                partnerKeypair.publicKey,
                goldSmallestUnit
            )
        );

        console.log(`[ConvertUsdcToGold] Sending ${goldAmountOz.toFixed(9)} oz GOLD from partner → merchant...`);
        const goldSignature = await sendAndConfirmTransaction(
            connection,
            goldTx,
            [partnerKeypair]
        );
        console.log(`[ConvertUsdcToGold] GOLD leg confirmed. Sig: ${goldSignature}`);

        return {
            goldAmountOz,
            goldPricePerOunce,
            usdcSignature,
            goldSignature,
        };
    }
}