import { SERVICES, AUTH, RATE_LIMIT } from '@teampulse/shared';

export const config = {
  port: Number(process.env.AUTH_PORT) || SERVICES.AUTH_PORT,
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

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    accessExpiry: AUTH.ACCESS_TOKEN_EXPIRY,
    refreshExpiryMs: AUTH.REFRESH_TOKEN_EXPIRY_MS,
  },

  bcryptRounds: AUTH.BCRYPT_ROUNDS,

  rateLimit: {
    windowMs: RATE_LIMIT.AUTH_WINDOW_MS,
    max: RATE_LIMIT.AUTH_MAX_REQUESTS,
  },

  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
