import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function verifyShopifyWebhook(req: Request, res: Response, next: NextFunction) {
  const hmacHeader = req.get('X-Oro-Signature') || req.get('X-Shopify-Hmac-Sha256');

  if (!hmacHeader) {
    return res.status(401).json({ error: 'Missing Webhook Signature (X-Oro-Signature or X-Shopify-Hmac-Sha256)' });
  }

  const shopDomain = req.get('X-Shop-Domain');
  if (!shopDomain) {
    return res.status(400).json({ error: 'Missing X-Shop-Domain header' });
  }


  try {
    const merchant = await prisma.merchant.findUnique({ where: { shopDomain } });
    if (!merchant) {
      return res.status(400).json({ error: 'Merchant not found or missing webhook secret' });
    }

    res.locals.merchantId = merchant.id;

    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      return res.status(400).json({ error: 'Missing raw body for HMAC verification' });
    }

    const apiKeys = await (prisma as any).merchantApiKey.findMany({
      where: { merchantId: merchant.id }
    });

    if (apiKeys.length === 0) {
      return res.status(400).json({ error: 'Merchant has no active API key pairs. Please create one in the Merchant Portal.' });
    }

    const isValid = apiKeys.some((keyPair: any) => {
      const generatedHash = crypto
        .createHmac('sha256', keyPair.webhookSecret)
        .update(rawBody, 'utf8')
        .digest('base64');
      return generatedHash === hmacHeader;
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Shopify HMAC signature' });
    }

    next();
  } catch (err) {
    console.error('[ShopifyWebhook] Verification error:', err);
    return res.status(500).json({ error: 'Internal Server Error during verification' });
  }
}
