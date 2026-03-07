import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { PublicKey } from '@solana/web3.js';
import { WalletService } from '../services/wallet';
import { SolanaService } from '../services/solana';
import { execSync } from 'child_process';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

const buyingLocks = new Set<string>();

// GET /api/merchant/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;

        const merchant: any = await prisma.merchant.findFirst({
            where: { email },
            include: {
                ledgers: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { user: { select: { email: true } } }
                }
            }
        });

        if (!merchant) {
            return res.status(200).json({ merchant: null });
        }

        if (!merchant.isOnboarded) {
            return res.status(200).json({ merchant: { ...merchant, isOnboarded: false }, history: [] });
        }

        const history = merchant.ledgers.map((l: any) => ({
            id: l.id,
            userEmail: l.user.email,
            orderId: l.orderId,
            amountGold: l.amountGold,
            status: l.status,
            createdAt: l.createdAt
        }));

        res.status(200).json({
            merchant: {
                id: merchant.id,
                name: merchant.name,
                shopDomain: merchant.shopDomain,
                rewardRatio: merchant.rewardRatio,
                balanceUsdc: merchant.balanceUsdc,
                balanceGold: merchant.balanceGold,
                walletAddress: merchant.walletAddress,
                isOnboarded: merchant.isOnboarded,
            },
            history,
            role: 'merchant'
        });

    } catch (error: any) {
        console.error('[Merchant API Error]', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/deposit', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { amount } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid deposit amount' });
        if (amount > 10000) return res.status(400).json({ error: 'Maximum test airdrop cap is 10,000 USDC per request' });

        const merchant = await prisma.merchant.findFirst({
            where: { email }
        });

        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        if (!merchant.walletAddress) {
            return res.status(400).json({ error: 'Merchant wallet not initialized. Please complete onboarding first.' });
        }

        console.log(`[Deposit] Sending ${amount} USDC on-chain to ${merchant.walletAddress}...`);
        const merchantWallet = new PublicKey(merchant.walletAddress);
        const signature = await SolanaService.FundMerchantUsdc(amount, merchantWallet);
        console.log(`[Deposit] Confirmed. Signature: ${signature}`);

        const updated = await prisma.merchant.update({
            where: { id: merchant.id },
            data: { balanceUsdc: merchant.balanceUsdc + amount }
        });

        res.status(200).json({ success: true, balanceUsdc: updated.balanceUsdc, signature });
    } catch (e: any) {
        console.error('[Deposit Error]', e.message);
        res.status(500).json({ error: e.message });
    }
});


router.post('/config', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { rewardRatio } = req.body; // e.g., 0.05 for 5%

        if (rewardRatio === undefined || rewardRatio < 0 || rewardRatio > 1) {
            return res.status(400).json({ error: 'Invalid reward ratio (must be between 0 and 1)' });
        }

        const merchant = await prisma.merchant.findFirst({
            where: { name: { contains: email.split('@')[0] } }
        });

        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        const updated = await prisma.merchant.update({
            where: { id: merchant.id },
            data: { rewardRatio }
        });

        res.status(200).json({ success: true, rewardRatio: updated.rewardRatio });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/onboard', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { name, shopDomain, storeType } = req.body;

        if (!name || !shopDomain) {
            return res.status(400).json({ error: 'Missing required fields: name, shopDomain' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(403).json({ error: 'You are already registered as a Consumer (User). You cannot onboard as a Merchant with this email.' });
        }


        let existingMerchant: any = await prisma.merchant.findFirst({ where: { email } });
        if (existingMerchant && existingMerchant.isOnboarded) {
            return res.status(400).json({ error: 'Merchant already onboarded.' });
        }


        if (existingMerchant && existingMerchant.walletAddress) {
            return res.status(200).json({ success: true, merchant: existingMerchant });
        }

        const wallet = WalletService.generateWallet();
        const encryptedKey = WalletService.encryptPrivateKey(wallet.secretKey);

        try {
            console.log(`[MerchantRoute] Funding merchant wallet ${wallet.publicKey} with 0.005 SOL...`);
            execSync(`solana transfer ${wallet.publicKey} 0.005 --allow-unfunded-recipient`, { stdio: 'pipe' });
            console.log(`[MerchantRoute] Successfully funded merchant wallet.`);
        } catch (e: any) {
            console.error(`[MerchantRoute] Warning: CLI SOL Airdrop failed:`, e.stderr?.toString() || e.message);
        }

        let merchant;
        if (existingMerchant) {
            merchant = await (prisma.merchant as any).update({
                where: { id: existingMerchant.id },
                data: {
                    name,
                    shopDomain,
                    walletAddress: wallet.publicKey,
                    encryptedPrivateKey: encryptedKey,
                    isOnboarded: false
                }
            });
        } else {
            merchant = await (prisma.merchant as any).create({
                data: {
                    name,
                    email,
                    shopDomain,
                    rewardRatio: 0.015, // default 1.5%
                    balanceUsdc: 0,
                    walletAddress: wallet.publicKey,
                    encryptedPrivateKey: encryptedKey,
                    isOnboarded: false
                }
            });
        }

        res.status(200).json({ success: true, merchant });

    } catch (error: any) {
        console.error('[Merchant Onboard Error]', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/onboard/complete', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { rewardRatio } = req.body;

        if (rewardRatio === undefined) {
            return res.status(400).json({ error: 'rewardRatio is required' });
        }

        const merchant = await prisma.merchant.findFirst({ where: { email } });
        if (!merchant) return res.status(404).json({ error: 'Merchant not found. Complete step 1 first.' });

        if (merchant.isOnboarded) {
            return res.status(400).json({ error: 'Already onboarded.' });
        }

        const updated = await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
                rewardRatio: rewardRatio,
                isOnboarded: true
            }
        });

        res.status(200).json({ success: true, merchant: updated });

    } catch (error: any) {
        console.error('[Merchant Onboard Complete Error]', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.put('/profile', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { name, shopDomain } = req.body;

        const merchant = await prisma.merchant.findFirst({ where: { email } });
        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        const updated = await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
                name: name || merchant.name,
                shopDomain: shopDomain || merchant.shopDomain
            }
        });

        res.status(200).json({ success: true, merchant: updated });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/withdraw', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { asset, amount, destinationWallet: destinationWalletStr } = req.body;

        // Input validation
        if (!asset || (asset !== 'USDC' && asset !== 'GOLD') || !amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid withdrawal request. Required: asset (USDC|GOLD), amount, destinationWallet' });
        }
        if (!destinationWalletStr) {
            return res.status(400).json({ error: 'destinationWallet is required' });
        }

        // Validate destination address
        let destinationWallet: PublicKey;
        try {
            destinationWallet = new PublicKey(destinationWalletStr);
        } catch {
            return res.status(400).json({ error: 'Invalid destinationWallet address' });
        }

        const merchant = await prisma.merchant.findFirst({ where: { email } });
        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        if (!merchant.walletAddress || !merchant.encryptedPrivateKey) {
            return res.status(400).json({ error: 'Merchant wallet not initialized. Complete onboarding first.' });
        }

        if (asset === 'USDC' && merchant.balanceUsdc < amount) {
            return res.status(400).json({ error: `Insufficient USDC balance. Available: ${merchant.balanceUsdc.toFixed(2)} USDC` });
        }
        if (asset === 'GOLD' && merchant.balanceGold < amount) {
            return res.status(400).json({ error: `Insufficient Gold balance. Available: ${merchant.balanceGold.toFixed(6)} oz` });
        }

        console.log(`[Withdraw] Merchant ${merchant.id} withdrawing ${amount} ${asset} → ${destinationWalletStr}`);

        const signature = await SolanaService.WithdrawToken(
            amount,
            asset as 'USDC' | 'GOLD',
            new PublicKey(merchant.walletAddress),
            merchant.encryptedPrivateKey,
            destinationWallet
        );

        const updated = await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
                balanceUsdc: asset === 'USDC' ? { decrement: amount } : undefined,
                balanceGold: asset === 'GOLD' ? { decrement: amount } : undefined,
            }
        });

        console.log(`[Withdraw] Success — ${amount} ${asset} sent. Sig: ${signature}`);
        res.status(200).json({
            success: true,
            message: `Successfully withdrew ${amount} ${asset} to ${destinationWalletStr}`,
            signature,
            balanceUsdc: updated.balanceUsdc,
            balanceGold: updated.balanceGold,
        });
    } catch (e: any) {
        console.error('[Withdraw Error]', e.message);
        res.status(500).json({ error: e.message });
    }
});


router.get('/keys', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const merchant = await prisma.merchant.findFirst({ where: { email } });
        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        const keys = await (prisma as any).merchantApiKey.findMany({
            where: { merchantId: merchant.id },
            orderBy: { createdAt: 'asc' }
        });

        res.status(200).json({ keys });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/keys', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { name } = req.body;

        const merchant = await prisma.merchant.findFirst({ where: { email } });
        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        const existingCount = await (prisma as any).merchantApiKey.count({
            where: { merchantId: merchant.id }
        });

        if (existingCount >= 4) {
            return res.status(400).json({ error: 'Maximum 4 key pairs allowed per merchant' });
        }

        const newKey = await (prisma as any).merchantApiKey.create({
            data: {
                merchantId: merchant.id,
                name: name || 'Default'
            }
        });

        res.status(201).json({ key: newKey });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.delete('/keys/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const { id } = req.params;

        const merchant = await prisma.merchant.findFirst({ where: { email } });
        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

        const key = await (prisma as any).merchantApiKey.findFirst({
            where: { id, merchantId: merchant.id }
        });

        if (!key) return res.status(404).json({ error: 'Key pair not found' });

        await (prisma as any).merchantApiKey.delete({ where: { id } });

        res.status(200).json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/buy', requireAuth, async (req: Request, res: Response) => {
    const email = res.locals.email;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    let merchantId: string | null = null;

    try {
        const merchant = await prisma.merchant.findFirst({ where: { email } });

        if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
        if (!merchant.walletAddress || !merchant.encryptedPrivateKey) {
            return res.status(400).json({ error: 'Merchant wallet not initialized. Complete onboarding first.' });
        }

        merchantId = merchant.id;

        if (buyingLocks.has(merchantId)) {
            return res.status(409).json({ error: 'A conversion is already in progress for this account. Please wait.' });
        }
        buyingLocks.add(merchantId);

        if (merchant.balanceUsdc < amount) {
            return res.status(400).json({
                error: `Insufficient USDC balance. Available: ${merchant.balanceUsdc.toFixed(2)} USDC`
            });
        }

        console.log(`[Buy] Merchant ${merchant.id} converting ${amount} USDC → Gold...`);

        const result = await SolanaService.ConvertMerchantUsdcToGold(
            amount,
            new PublicKey(merchant.walletAddress),
            merchant.encryptedPrivateKey
        );

        const updated = await prisma.merchant.update({
            where: { id: merchant.id },
            data: {
                balanceUsdc: { decrement: amount },
                balanceGold: { increment: result.goldAmountOz }
            }
        });

        console.log(`[Buy] Success — ${result.goldAmountOz.toFixed(6)} oz gold credited to merchant ${merchant.id}`);

        return res.status(200).json({
            success: true,
            goldAmountOz: result.goldAmountOz,
            goldPricePerOunce: result.goldPricePerOunce,
            usdcSpent: amount,
            balanceUsdc: updated.balanceUsdc,
            balanceGold: updated.balanceGold,
            usdcSignature: result.usdcSignature,
            goldSignature: result.goldSignature,
        });

    } catch (e: any) {
        console.error('[Buy Error]', e.message);
        return res.status(500).json({ error: e.message });
    } finally {
        if (merchantId) buyingLocks.delete(merchantId);
    }
});

router.get('/export-keys', requireAuth, async (req: Request, res: Response) => {
    try {
        const email = res.locals.email;
        const merchant = await prisma.merchant.findFirst({ where: { email } });

        if (!merchant || !merchant.encryptedPrivateKey || !merchant.walletAddress) {
            return res.status(404).json({ error: 'Wallet keys not found. Complete onboarding first.' });
        }

        const decryptedBase64 = WalletService.decryptPrivateKey(merchant.encryptedPrivateKey);
        const secretKeyBytes = Array.from(Buffer.from(decryptedBase64, 'base64'));

        res.status(200).json({
            publicKey: merchant.walletAddress,
            secretKey: secretKeyBytes
        });
    } catch (error: any) {
        console.error('[Merchant API Export Error]', error.message);
        res.status(500).json({ error: 'Failed to export keys' });
    }
});

export default router;

