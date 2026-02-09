import { db } from '../db';
import { logger } from '../logger';

export async function runCleanupTokens(): Promise<void> {
  const jobLogger = logger.child({ job: 'cleanup-tokens' });
  jobLogger.info('Starting cleanup expired tokens job');

  try {
    // Delete expired refresh tokens
    const deleted = await db('refresh_tokens')
      .where('expires_at', '<', new Date())
      .del();

    jobLogger.info({ deletedCount: deleted }, 'Deleted expired refresh tokens');

    // Delete revoked tokens older than 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deletedRevoked = await db('refresh_tokens')
      .where('revoked', true)
      .where('created_at', '<', thirtyDaysAgo)
      .del();

    jobLogger.info({ deletedCount: deletedRevoked }, 'Deleted old revoked tokens');

    jobLogger.info('Cleanup tokens job completed');
  } catch (err) {
    jobLogger.error({ err }, 'Cleanup tokens job failed');
    throw err;
  }
}
