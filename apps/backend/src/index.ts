import express from 'express';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import webhookRoutes from './routes/webhook';
import shopifyRoutes from './routes/shopify';
import userRoutes from './routes/user';
import merchantRoutes from './routes/merchant';

export const app = express();
export const prisma = new PrismaClient();

app.use(cors({ origin: '*' }));
app.use(cookieParser());

app.use(express.json({
    verify: (req: any, res, buf) => {
        req.rawBody = buf;
    }
}));

app.use('/api/webhooks/shopify', webhookRoutes);
app.use('/api/shopify', shopifyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/merchant', merchantRoutes);

app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'loyalty.gold-backend-devnet' });
});

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Loyalty.gold backend running on port ${PORT}`);
    });
}