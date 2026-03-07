import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const email = res.locals.email;
    const existingMerchant = await prisma.merchant.findFirst({ where: { email } });
    if (existingMerchant) {
      return res.status(403).json({ error: 'You are registered as a Merchant. You cannot access the User Vault.' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        ledgers: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            merchant: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found in system' });
    }

    const successfulLedgers = user.ledgers.filter((l: any) => l.status === 'SUCCESS');
    const totalGoldBalance = successfulLedgers.reduce((sum: number, ledger: any) => sum + ledger.amountGold, 0);

    const history = user.ledgers.map((l: any) => ({
      id: l.id,
      merchantName: l.merchant.name,
      orderId: l.orderId,
      amountGold: l.amountGold,
      status: l.status,
      txSignature: l.txSignature,
      createdAt: l.createdAt
    }));

    res.status(200).json({
      user: {
        email: user.email,
        walletAddress: user.walletAddress,
        userPda: user.userPda,
      },
      balance: {
        goldOz: totalGoldBalance
      },
      history,
      role: 'user'
    });

  } catch (error: any) {
    console.error('[User API Error]', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/keys', requireAuth, async (req: Request, res: Response) => {
  try {
    const email = res.locals.email;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.encryptedPrivateKey) {
      return res.status(404).json({ error: 'Keys not found' });
    }

    const { WalletService } = await import('../services/wallet');
    const decryptedBase64 = WalletService.decryptPrivateKey(user.encryptedPrivateKey);
    const secretKeyBytes = Array.from(Buffer.from(decryptedBase64, 'base64'));

    res.status(200).json({
      publicKey: user.walletAddress,
      secretKey: secretKeyBytes
    });

  } catch (error: any) {
    console.error('[User API Export Error]', error.message);
    res.status(500).json({ error: 'Failed to export keys' });
  }
});

router.post('/init', requireAuth, async (req: Request, res: Response) => {
  try {
    const email = res.locals.email;

    const existingMerchant = await prisma.merchant.findFirst({ where: { email } });
    if (existingMerchant) {
      return res.status(403).json({ error: 'Cannot init user: Email is already registered as a Merchant.' });
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        walletAddress: '',
        encryptedPrivateKey: '',
        userPda: '',
        kycHash: ''
      }
    });

    res.status(200).json({ message: 'User role acquired successfully', user });
  } catch (error: any) {
    console.error('[User API Init Error]', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
