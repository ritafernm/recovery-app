import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'crypto';
import { generateRecoveryPlan, saveRecoveryPlan } from './recovery-plan.js';
import { createLog, markLogDone, getUserLogs } from './recovery-plan-logs.js';

function loadServerEnv() {
  try {
    const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '.env');

    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envFilePath);
    }
  } catch {
    console.warn('No .env file found — relying on environment variables already set.');
  }
}

loadServerEnv();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = Number(process.env.PORT || 5000);
const allowedStatuses = [200, 201, 401, 403];

const recoveryRequestSchema = z.object({
  input: z.string().trim().min(1, 'Input is required'),
  userId: z.uuid('userId must be a valid UUID').optional(),
});

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.API_TOKEN || process.env.TOKEN;

  if (!authHeader) {
    res.status(401).json({ error: 'Unauthorized', message: 'A valid bearer token is required.' });
    return;
  }

  const providedHeader = Buffer.from(authHeader);
  const expectedHeader = Buffer.from(`Bearer ${expectedToken ?? ''}`);
  const maxLength = Math.max(providedHeader.length, expectedHeader.length);
  const paddedProvided = Buffer.alloc(maxLength, 0);
  const paddedExpected = Buffer.alloc(maxLength, 0);
  providedHeader.copy(paddedProvided);
  expectedHeader.copy(paddedExpected);

  if (!expectedToken || !crypto.timingSafeEqual(paddedProvided, paddedExpected)) {
    res.status(403).json({ error: 'Forbidden', message: 'The provided token is not allowed.' });
    return;
  }

  next();
}

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
    requestWasSuccessful: (_req, res) => allowedStatuses.includes(res.statusCode),
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.CORS_ORIGIN ?? (isProduction ? '' : 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000')).split(',').map((origin) => origin.trim()).filter(Boolean);

  const corsOrigin = isProduction
    ? (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('Not allowed by CORS'));
      }
    : true;

  app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  }));
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/recovery-plan', recoveryPlanLimiter, requireAuth, async (req: Request, res: Response) => {
    const validation = recoveryRequestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: validation.error.flatten(),
      });
    }

    const { input, userId } = validation.data;

    try {
      const plan = await generateRecoveryPlan(input);
      const savedPlan = await saveRecoveryPlan(plan);
      const savedLog = await createLog(savedPlan.id, userId);

      return res.status(201).json({
        message: 'New recovery plan created successfully!',
        input,
        plan,
        savedPlanId: savedPlan.id,
        logId: savedLog.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create recovery plan.';

      return res.status(502).json({
        error: 'Recovery plan generation failed',
        message,
      });
    }
  });

  const uuidSchema = z.uuid('Invalid UUID format');
  const userIdQuerySchema = z.object({
    userId: z.uuid('Invalid userId UUID format'),
  });

  app.patch('/logs/:id/done', requireAuth, async (req: Request, res: Response) => {
    const idValidation = uuidSchema.safeParse(req.params.id);
    if (!idValidation.success) {
      return res.status(400).json({ error: 'Invalid log id', details: idValidation.error.flatten() });
    }

    try {
      const updated = await markLogDone(idValidation.data);
      return res.json({ message: 'Log marked as done.', log: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update log.';
      const status = message.includes('not found') ? 404 : 502;
      return res.status(status).json({ error: 'Update failed', message });
    }
  });

  app.get('/logs', requireAuth, async (req: Request, res: Response) => {
    const queryValidation = userIdQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({ error: 'Invalid query parameters', details: queryValidation.error.flatten() });
    }

    try {
      const logs = await getUserLogs(queryValidation.data.userId);
      return res.json({ logs });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch logs.';
      return res.status(502).json({ error: 'Fetch failed', message });
    }
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
