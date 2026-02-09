import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { logger } from './logger';
import { db, runMigrations } from './db';
import { redis } from './redis';
import { authRoutes } from './routes/auth.routes';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests' } },
});
app.use('/api', limiter);

// Health endpoints
let isReady = false;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

app.get('/ready', (_req: Request, res: Response) => {
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// Routes
app.use('/api/auth', authRoutes);

// Error handler
app.use(errorHandler);

// Graceful shutdown
let server: ReturnType<typeof app.listen>;

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');
  isReady = false;

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  try {
    await redis.quit();
    logger.info('Redis connection closed');
  } catch (err) {
    logger.error({ err }, 'Error closing Redis');
  }

  try {
    await db.destroy();
    logger.info('Database connection closed');
  } catch (err) {
    logger.error({ err }, 'Error closing database');
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Startup
async function start() {
  try {
    logger.info('Starting auth-service...');

    // Connect to Redis
    await redis.connect();

    // Run database migrations
    await runMigrations();

    // Start server
    server = app.listen(config.port, () => {
      isReady = true;
      logger.info({ port: config.port }, 'Auth service started');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start auth-service');
    process.exit(1);
  }
}

start();
