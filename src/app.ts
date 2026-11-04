import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import aiRoutes from './routes/ai';
import submissionRoutes from './routes/submissionRoutes';
import courseRoutes from './routes/courseRoutes';
import { connectDB, isDbConnected } from './config/db';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const configuredOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredOrigins,
  'http://localhost:5173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
]);

const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    if (!origin || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json());

app.use(async (req, _res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    next();
    return;
  }

  try {
    await connectDB();
    next();
  } catch (error) {
    next(error);
  }
});

async function healthCheck(_req: express.Request, res: express.Response): Promise<void> {
  try {
    await connectDB();
    res.status(200).json({ status: 'ok', db: isDbConnected() });
  } catch {
    res.status(503).json({ status: 'error', db: false });
  }
}

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api/courses', courseRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/submissions', submissionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
