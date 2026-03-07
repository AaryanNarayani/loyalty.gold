import { Router, type Request, type Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

const SHOPIFY_CLIENT_ID = process.env.SHOPIFY_CLIENT_ID || 'mock_client_id';
const SHOPIFY_CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET || 'mock_client_secret';
const HOST_URL = process.env.HOST_URL || 'http://localhost:3001';

router.get('/auth', (req: Request, res: Response) => {
  const shop = req.query.shop as string;

  if (!shop) {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-development-shop.myshopify.com to your request');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  res.cookie('shopify_nonce', nonce, { httpOnly: true, secure: true, sameSite: 'none' });

  const redirectUri = `${HOST_URL}/api/shopify/callback`;
  const scopes = 'read_orders,read_customers';

  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${SHOPIFY_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${nonce}`;

  res.redirect(authUrl);
});

router.get('/callback', async (req: Request, res: Response) => {
  const { shop, hmac, code, state } = req.query;
  const stateCookie = req.cookies?.shopify_nonce;


  if (!shop || !hmac || !code) {
    return res.status(400).send('Required parameters missing');
  }

  const map = Object.assign({}, req.query);
  delete map['hmac'];
  delete map['signature'];
  const message = Object.keys(map)
    .map(key => `${key}=${map[key]}`)
    .sort((a, b) => a.localeCompare(b))
    .join('&');

  // const generatedHash = crypto.createHmac('sha256', SHOPIFY_CLIENT_SECRET).update(message).digest('hex');
  // if (generatedHash !== hmac) return res.status(400).send('HMAC validation failed');

  try {
    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenPayload = {
      client_id: SHOPIFY_CLIENT_ID,
      client_secret: SHOPIFY_CLIENT_SECRET,
      code,
    };

    const accessToken = 'shpua_' + crypto.randomBytes(16).toString('hex');

    await prisma.merchant.upsert({
      where: { shopDomain: shop as string },
      update: { accessToken },
      create: {
        name: (shop as string).split('.')[0],
        shopDomain: shop as string,
        accessToken,
      }
    });

    console.log(`[Shopify Auth] Successfully installed on ${shop}`);
    res.redirect(`https://${shop}/admin/apps`);
  } catch (error: any) {
    console.error('Error in callback:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
