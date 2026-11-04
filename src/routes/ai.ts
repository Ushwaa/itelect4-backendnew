import { Router, type Response } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth';
import type { AuthRequest } from '../types';
import {
  GeminiConfigurationError,
  GeminiInvalidResponseError,
  GeminiQuotaExceededError,
  GeminiUnavailableError,
  reviewProjectWithErrorHandling,
} from '../ai/gemini';

const aiRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(20, { message: 'Project description must be at least 20 characters long.' })
    .max(2000, { message: 'Project description must be no more than 2,000 characters long.' }),
});

const aiRouter = Router();

aiRouter.post(
  '/',
  requireAuth,
  rateLimit({
    windowMs: 60_000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const authReq = req as AuthRequest;
      return authReq.userId ?? authReq.user?.id ?? 'anonymous';
    },
    message: {
      message: 'AI review rate limit exceeded. Please wait a minute before trying again.',
    },
    statusCode: 429,
  }),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = aiRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      const issueMessage = parsed.error.issues[0]?.message ?? 'Invalid request body.';
      res.status(400).json({ message: issueMessage });
      return;
    }

    try {
      const result = await reviewProjectWithErrorHandling(parsed.data.prompt);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof GeminiQuotaExceededError) {
        res.status(429).json({ message: error.message });
        return;
      }

      if (error instanceof GeminiUnavailableError) {
        res.status(503).json({ message: error.message });
        return;
      }

      if (error instanceof GeminiInvalidResponseError) {
        res.status(502).json({ message: error.message });
        return;
      }

      if (error instanceof GeminiConfigurationError) {
        res.status(500).json({ message: error.message });
        return;
      }

      if (error instanceof Error) {
        res.status(500).json({ message: 'Unexpected server error while reviewing the project.' });
        return;
      }

      res.status(500).json({ message: 'Unexpected server error while reviewing the project.' });
    }
  }
);

export default aiRouter;
