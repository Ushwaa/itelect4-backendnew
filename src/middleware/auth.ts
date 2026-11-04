import type { NextFunction, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'default_development_secret';

export function protectRoute(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication required. Please provide a valid Bearer token.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      username: string;
    };

    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username,
    };
    req.userId = decoded.id;

    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

export const requireAuth = protectRoute;

