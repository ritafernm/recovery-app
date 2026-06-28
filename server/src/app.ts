import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { pathToFileURL } from 'node:url';
import crypto from 'crypto';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5000);

const recoveryRequestSchema = z.object({
  input: z.string().trim().min(1, 'Input is required'),
});

export function createApp() {
  const app = express();
  const recoveryPlanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
      });
    },
    skipFailedRequests: true,
  });

  app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/recovery-plan', recoveryPlanLimiter, (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const expectedToken = process.env.API_TOKEN || process.env.TOKEN;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'A valid bearer token is required.',
      });
    }

    const providedHeader = Buffer.from(authHeader);
    const expectedHeader = Buffer.from(`Bearer ${expectedToken ?? ''}`);
    const maxLength = Math.max(providedHeader.length, expectedHeader.length);
    const paddedProvidedHeader = Buffer.alloc(maxLength, 0);
    const paddedExpectedHeader = Buffer.alloc(maxLength, 0);

    providedHeader.copy(paddedProvidedHeader);
    expectedHeader.copy(paddedExpectedHeader);

    if (!expectedToken || !crypto.timingSafeEqual(paddedProvidedHeader, paddedExpectedHeader)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'The provided token is not allowed.',
      });
    }

    const validation = recoveryRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.flatten(),
      });
    }

    const { input } = validation.data;

    return res.status(201).json({
      message: 'New recovery plan created successfully!',
      input,
    });
  });

  return app;
}

export const app = createApp();

export function startServer() {
  return app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  });
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  startServer();
}
