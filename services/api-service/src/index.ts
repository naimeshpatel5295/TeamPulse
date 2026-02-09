import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { logger } from './logger';
import { db, runMigrations } from './db';
import { redis } from './redis';
import { errorHandler } from './middleware/error-handler';
import { teamsRoutes } from './modules/teams/teams.routes';
import { projectsRoutes } from './modules/projects/projects.routes';
import { tasksRoutes } from './modules/tasks/tasks.routes';
import { habitsRoutes } from './modules/habits/habits.routes';
import { incidentsRoutes } from './modules/incidents/incidents.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

// Health endpoints
let isReady = false;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'api-service', timestamp: new Date().toISOString() });
});

app.get('/ready', (_req: Request, res: Response) => {
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// API routes
app.use('/api/teams', teamsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/incidents', incidentsRoutes);

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
    logger.info('Starting api-service...');

    // Connect to Redis
    await redis.connect();

    // Run database migrations
    await runMigrations();

    // Start server
    server = app.listen(config.port, () => {
      isReady = true;
      logger.info({ port: config.port }, 'API service started');
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start api-service');
    process.exit(1);
  }
}

start();
