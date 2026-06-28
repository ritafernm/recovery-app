// backend/src/index.ts
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { z } from 'zod';

const app = express();
const PORT = process.env.PORT || 5000;

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
app.post('/recovery', (req: Request, res: Response) => {
  const validation = recoveryRequestSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: validation.error.flatten(),
    });
  }

  const { input } = validation.data;

  return res.status(200).json({
    message: 'recovery request received',
    input,
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${process.env.BASE_URL}:${PORT}`);
});