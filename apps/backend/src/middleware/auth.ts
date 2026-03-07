import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "development-super-secret-key";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, NEXTAUTH_SECRET) as { email?: string; sub?: string };

        if (!decoded.email) {
            return res.status(401).json({ error: 'Unauthorized: invalid token payload' });
        }

        res.locals.email = decoded.email;
        res.locals.userId = decoded.sub;

        next();
    } catch (error) {
        console.error('[Auth Middleware Error]', error);
        return res.status(401).json({ error: 'Unauthorized: invalid or expired token' });
    }
};
