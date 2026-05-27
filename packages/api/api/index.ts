import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiLimiter } from '../src/middleware/rateLimit.js';
import { errorMiddleware } from '../src/middleware/error.js';
import routes from '../src/routes/index.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(apiLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', routes);

app.use(errorMiddleware);

export default app;
