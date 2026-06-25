import { Request } from 'express';
import { ApiTier } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      apiKey?: {
        id: string;
        tier: ApiTier;
        permissions: string[];
        userId: string;
      };
      cookies?: Record<string, string>;
    }
  }
}
