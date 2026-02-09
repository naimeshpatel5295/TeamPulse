import { db } from '../db';
import { redis } from '../redis';
import { logger } from '../logger';
import { IncidentStatus } from '@teampulse/shared';

const STALE_THRESHOLD_HOURS = 24;

export async function runStaleIncidentChecker(): Promise<void> {
  const jobLogger = logger.child({ job: 'stale-incidents' });
  jobLogger.info('Starting stale incident checker job');

  try {
    const staleThreshold = new Date(
      Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000
    );

    // Find incidents that haven't been updated in 24+ hours and aren't resolved
    const staleIncidents = await db('incidents')
      .select('incidents.*', 'teams.name as team_name')
      .join('teams', 'incidents.team_id', 'teams.id')
      .whereNot('incidents.status', IncidentStatus.RESOLVED)
      .where('incidents.updated_at', '<', staleThreshold)
      .orderBy('incidents.severity', 'desc');

    jobLogger.info(
      { staleCount: staleIncidents.length },
      'Found stale incidents'
    );

    for (const incident of staleIncidents) {
      // Queue alert notification
      await redis.lpush(
        'notifications:queue',
        JSON.stringify({
          type: 'stale_incident_alert',
          incidentId: incident.id,
          incidentTitle: incident.title,
          teamId: incident.team_id,
          teamName: incident.team_name,
          severity: incident.severity,
          status: incident.status,
          lastUpdated: incident.updated_at,
          hoursStale: Math.floor(
            (Date.now() - new Date(incident.updated_at).getTime()) /
              (60 * 60 * 1000)
          ),
          assignedTo: incident.assigned_to,
          timestamp: new Date().toISOString(),
        })
      );

      // If assigned, notify the assignee
      if (incident.assigned_to) {
        await redis.lpush(
          'notifications:queue',
          JSON.stringify({
            type: 'stale_incident_reminder',
            userId: incident.assigned_to,
            incidentId: incident.id,
            incidentTitle: incident.title,
            severity: incident.severity,
            timestamp: new Date().toISOString(),
          })
        );
      }

      jobLogger.debug(
        { incidentId: incident.id, severity: incident.severity },
        'Queued stale incident alert'
      );
    }

    // Track stale incident metrics
    await redis.set(
      'metrics:stale_incidents:count',
      staleIncidents.length.toString(),
      'EX',
      3600 // 1 hour
    );

    // Group by severity for metrics
    const bySeverity = staleIncidents.reduce(
      (acc, inc) => {
        acc[inc.severity] = (acc[inc.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    await redis.set(
      'metrics:stale_incidents:by_severity',
      JSON.stringify(bySeverity),
      'EX',
      3600
    );

    jobLogger.info('Stale incident checker job completed');
  } catch (err) {
    jobLogger.error({ err }, 'Stale incident checker job failed');
    throw err;
  }
}
