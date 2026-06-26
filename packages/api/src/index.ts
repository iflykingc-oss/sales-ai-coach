import 'dotenv/config';
import crypto from 'crypto';
import { logger as _encLogger } from './lib/logger.js';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as Sentry from '@sentry/node';
import { logger } from './lib/logger.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { errorMiddleware } from './middleware/error.js';
import routes from './routes/index.js';

// Global error handlers for unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection', reason);
  process.exit(1);
});

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

// Fail-fast on startup if ENCRYPTION_KEY is missing or wrong length.
// In production, hard-exit; in dev, log a warning so the operator notices.
if (!process.env.ENCRYPTION_KEY || process.env.ENCRYPTION_KEY.length !== 64) {
  _encLogger.error(
    'ENCRYPTION_KEY is missing or not 64 hex chars (32 bytes). ' +
    'Generate with: openssl rand -hex 32'
  );
  if (process.env.NODE_ENV === 'production') process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// Sentry initialization (requires SENTRY_DSN env var)
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  });
}

app.use(helmet());
// Sentry request handler — must be first middleware
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}
// Dynamic CORS whitelist
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(cors({
  origin(origin, callback) {
    // Allow requests with no origin (curl, server-to-server, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

// Stripe webhook needs raw body for signature verification
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(apiLimiter);

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  next();
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

// Sentry error handler — must be before custom error middleware
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

app.use(errorMiddleware);

app.listen(PORT, () => {
  logger.info(`API server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
});

export default app;
