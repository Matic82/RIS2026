import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { isTokenBlacklisted } from '../services/tokenBlacklist.js';

export type JwtPayload = {
  accountId: number;
  role: 'CLAN' | 'ADMIN';
  memberId?: number;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function requireAuth(roles?: Array<'CLAN' | 'ADMIN'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const token = header.slice(7);
      if (isTokenBlacklisted(token)) {
        res.status(401).json({ error: 'Token revoked' });
        return;
      }
      const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
      if (roles && !roles.includes(payload.role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}
