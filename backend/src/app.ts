import express from 'express';
import type { Request } from 'express';
import compression from 'compression';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { sendSuccess } from './common/http/response';
import { requestIdMiddleware } from './middlewares/requestId.middleware';
import { apiLimiter } from './middlewares/rateLimit.middleware';
import { uploadsRoot } from './middlewares/upload.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import apiRoutes from './routes';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

// Correlation id first so logs and every response carry it.
app.use(requestIdMiddleware);

app.use(
  helmet({
    // Receipt images are served to the Expo app from a different origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'RateLimit', 'RateLimit-Policy'],
    maxAge: 86_400,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression());

if (!env.isTest) {
  morgan.token('request-id', (req) => (req as Request).requestId);
  app.use(
    morgan(
      env.isProduction
        ? ':method :url :status :response-time ms'
        : ':method :url :status :response-time ms · :request-id',
    ),
  );
}

// Locally stored receipts, e.g. GET /uploads/receipt-....jpg
app.use(
  '/uploads',
  express.static(uploadsRoot, {
    maxAge: '7d',
    etag: true,
    index: false,
  }),
);

app.get(['/health', '/api/health'], async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    sendSuccess(res, {
      status: 'ok',
      database: 'connected',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  } catch {
    res.status(503).json({
      success: false,
      error: {
        code: 'DATABASE_UNAVAILABLE',
        message: 'The API is running but cannot reach PostgreSQL.',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api', apiLimiter, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
