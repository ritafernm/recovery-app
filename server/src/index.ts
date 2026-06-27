// backend/src/index.ts
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on ${process.env.BASE_URL}:${PORT}`);
});