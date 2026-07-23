import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { markLogDone, getUserLogs } from './recovery-plan-logs.js';
import { requireAuth, type AuthenticatedRequest } from './auth-middleware.js';
import { authRouter } from './auth-routes.js';

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
const PORT = Number(process.env.PORT || 5050);

export function createApp() {
  const app = express();

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

  app.use('/auth', authRouter);

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  const uuidSchema = z.uuid('Invalid UUID format');

  app.patch('/logs/:id/done', requireAuth, async (req: Request, res: Response) => {
    const idValidation = uuidSchema.safeParse(req.params.id);
    if (!idValidation.success) {
      return res.status(400).json({ error: 'Invalid log id', details: z.flattenError(idValidation.error) });
    }

    try {
      const { token } = req as AuthenticatedRequest;
      const updated = await markLogDone(idValidation.data, token);
      return res.json({ message: 'Log marked as done.', log: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update log.';
      const status = message.includes('not found') ? 404 : 502;
      return res.status(status).json({ error: 'Update failed', message });
    }
  });

  app.get('/logs', requireAuth, async (req: Request, res: Response) => {
    try {
      const { userId, token } = req as AuthenticatedRequest;
      const logs = await getUserLogs(userId, token);
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
