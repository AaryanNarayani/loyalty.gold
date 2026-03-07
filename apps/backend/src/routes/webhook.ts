import { Router, type Request, type Response } from 'express';
import { verifyShopifyWebhook } from '../middleware/shopify';
import { RewardService } from '../services/reward';

const router = Router();

router.post('/order', verifyShopifyWebhook, (req: Request, res: Response) => {
  const merchantId = res.locals.merchantId;
  const orderPayload = req.body;

  res.status(200).json({ status: 'received' });

  RewardService.processShopifyOrder(merchantId, orderPayload)
    .then((result) => {
      console.log(`[Webhook Background] Order processed successfully:`, result);
    })
    .catch((error: any) => {
      console.error(`[Webhook Background] Error processing order:`, error.message);
    });
});

export default router;
