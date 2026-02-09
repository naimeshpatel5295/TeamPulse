import express, { Request, Response } from 'express';
import cron from 'node-cron';
import { config } from './config';
import { logger } from './logger';
import { db } from './db';
import { redis } from './redis';
import { runHabitReminders } from './jobs/habit-reminders';
import { runWeeklyAnalytics } from './jobs/weekly-analytics';
import { runCleanupTokens } from './jobs/cleanup-tokens';
import { runStaleIncidentChecker } from './jobs/stale-incidents';

const app = express();

// Health endpoints
let isReady = false;
const jobStatus: Record<string, { lastRun: string | null; status: string }> = {
  'habit-reminders': { lastRun: null, status: 'idle' },
  'weekly-analytics': { lastRun: null, status: 'idle' },
  'cleanup-tokens': { lastRun: null, status: 'idle' },
  'stale-incidents': { lastRun: null, status: 'idle' },
};

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'worker-service',
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req: Request, res: Response) => {
  if (isReady) {
    res.json({ status: 'ready', jobs: jobStatus });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// Job wrapper for logging and status tracking
async function runJob(name: string, job: () => Promise<void>): Promise<void> {
  const jobLogger = logger.child({ job: name });
  jobStatus[name].status = 'running';

  try {
    jobLogger.info('Job starting');
    await job();
    jobStatus[name].lastRun = new Date().toISOString();
    jobStatus[name].status = 'success';
    jobLogger.info('Job completed successfully');
  } catch (err) {
    jobStatus[name].status = 'failed';
    jobLogger.error({ err }, 'Job failed');
  }
}

// Schedule cron jobs
function scheduleJobs(): void {
  // Habit reminders - daily at 9am (or configured time)
  cron.schedule(config.jobs.habitRemindersSchedule, () => {
    runJob('habit-reminders', runHabitReminders);
  });
  logger.info(
    { schedule: config.jobs.habitRemindersSchedule },
    'Scheduled habit reminders job'
  );

  // Weekly analytics - Monday at midnight (or configured time)
  cron.schedule(config.jobs.weeklyAnalyticsSchedule, () => {
    runJob('weekly-analytics', runWeeklyAnalytics);
  });
  logger.info(
    { schedule: config.jobs.weeklyAnalyticsSchedule },
    'Scheduled weekly analytics job'
  );

  // Cleanup tokens - daily at 2am (or configured time)
  cron.schedule(config.jobs.cleanupTokensSchedule, () => {
    runJob('cleanup-tokens', runCleanupTokens);
  });
  logger.info(
    { schedule: config.jobs.cleanupTokensSchedule },
    'Scheduled cleanup tokens job'
  );

  // Stale incidents - every 4 hours (or configured time)
  cron.schedule(config.jobs.staleIncidentsSchedule, () => {
    runJob('stale-incidents', runStaleIncidentChecker);
  });
  logger.info(
    { schedule: config.jobs.staleIncidentsSchedule },
    'Scheduled stale incidents job'
  );
}

// Graceful shutdown
let server: ReturnType<typeof app.listen>;

async function shutdown(signal: string): Promise<void> {
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
async function start(): Promise<void> {
  try {
    logger.info('Starting worker-service...');

    // Connect to Redis
    await redis.connect();

    // Test database connection
    await db.raw('SELECT 1');
    logger.info('Database connection verified');

    // Schedule all cron jobs
    scheduleJobs();

    // Start health server
    server = app.listen(config.port, () => {
      isReady = true;
      logger.info({ port: config.port }, 'Worker service started');
    });

    // Run cleanup tokens immediately on startup
    runJob('cleanup-tokens', runCleanupTokens);
  } catch (err) {
    logger.error({ err }, 'Failed to start worker-service');
    process.exit(1);
  }
}

start();
