// backend/src/index.ts
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT || 5000;
const rateLimitMap = new Map<string, number>();

// Request body validation for the recovery endpoint
const recoveryRequestSchema = z.object({
  input: z.string().trim().min(1, 'Input is required'),
});

// Basic Middleware
// Enable CORS for your client origin
app.use(cors({
  origin: '${process.env.BASE_URL}:${PORT}',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());

// Minimal Health Check Route
app.get('/health', (req: Request, res: Response) => {
  res.json({ ok: true });
});

// Recovery Plan Generation Endpoint
app.post('/recovery-plan', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.API_TOKEN;

  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'A valid bearer token is required.',
    });
  }

  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'The provided token is not allowed.',
    });
  }

  const clientKey = req.ip || req.socket.remoteAddress || 'unknown';
  const currentRequests = rateLimitMap.get(clientKey) || 0;

  if (currentRequests >= 5) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    });
  }

  rateLimitMap.set(clientKey, currentRequests + 1);

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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${process.env.BASE_URL}:${PORT}`);
});