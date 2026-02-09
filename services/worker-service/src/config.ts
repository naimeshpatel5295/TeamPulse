import { SERVICES } from '@teampulse/shared';

export const config = {
  port: Number(process.env.WORKER_PORT) || SERVICES.WORKER_PORT,
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'teampulse',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jobs: {
    habitRemindersSchedule: process.env.HABIT_REMINDERS_CRON || '0 9 * * *', // 9am daily
    weeklyAnalyticsSchedule: process.env.WEEKLY_ANALYTICS_CRON || '0 0 * * 1', // Monday midnight
    cleanupTokensSchedule: process.env.CLEANUP_TOKENS_CRON || '0 2 * * *', // 2am daily
    staleIncidentsSchedule: process.env.STALE_INCIDENTS_CRON || '0 */4 * * *', // Every 4 hours
  },
};
