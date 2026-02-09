import { db } from '../db';
import { redis } from '../redis';
import { logger } from '../logger';

interface TeamAnalytics {
  teamId: string;
  teamName: string;
  weekStart: string;
  weekEnd: string;
  tasksCreated: number;
  tasksCompleted: number;
  habitsCompleted: number;
  incidentsOpened: number;
  incidentsResolved: number;
  avgResolutionTimeHours: number | null;
}

interface CountResult {
  count: string | number;
}

export async function runWeeklyAnalytics(): Promise<void> {
  const jobLogger = logger.child({ job: 'weekly-analytics' });
  jobLogger.info('Starting weekly analytics job');

  try {
    const weekEnd = new Date();
    const weekStart = new Date(weekEnd.getTime() - 7 * 24 * 60 * 60 * 1000);

    const teams = await db('teams').select('id', 'name');

    for (const team of teams) {
      // Tasks created this week
      const tasksCreatedResult = await db('tasks')
        .join('projects', 'tasks.project_id', 'projects.id')
        .where('projects.team_id', team.id)
        .whereBetween('tasks.created_at', [weekStart, weekEnd])
        .count('* as count')
        .first() as CountResult | undefined;

      // Tasks completed this week
      const tasksCompletedResult = await db('tasks')
        .join('projects', 'tasks.project_id', 'projects.id')
        .where('projects.team_id', team.id)
        .where('tasks.status', 'done')
        .whereBetween('tasks.updated_at', [weekStart, weekEnd])
        .count('* as count')
        .first() as CountResult | undefined;

      // Habit completions this week
      const habitsCompletedResult = await db('habit_logs')
        .join('habits', 'habit_logs.habit_id', 'habits.id')
        .where('habits.team_id', team.id)
        .whereBetween('habit_logs.completed_at', [weekStart, weekEnd])
        .count('* as count')
        .first() as CountResult | undefined;

      // Incidents opened this week
      const incidentsOpenedResult = await db('incidents')
        .where('team_id', team.id)
        .whereBetween('created_at', [weekStart, weekEnd])
        .count('* as count')
        .first() as CountResult | undefined;

      // Incidents resolved this week
      const incidentsResolvedResult = await db('incidents')
        .where('team_id', team.id)
        .where('status', 'resolved')
        .whereBetween('resolved_at', [weekStart, weekEnd])
        .count('* as count')
        .first() as CountResult | undefined;

      // Average incident resolution time
      const avgResolution = await db('incidents')
        .where('team_id', team.id)
        .where('status', 'resolved')
        .whereBetween('resolved_at', [weekStart, weekEnd])
        .avg(db.raw('EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600') as unknown as string)
        .first() as { avg: string | number | null } | undefined;

      const analytics: TeamAnalytics = {
        teamId: team.id,
        teamName: team.name,
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        tasksCreated: Number(tasksCreatedResult?.count || 0),
        tasksCompleted: Number(tasksCompletedResult?.count || 0),
        habitsCompleted: Number(habitsCompletedResult?.count || 0),
        incidentsOpened: Number(incidentsOpenedResult?.count || 0),
        incidentsResolved: Number(incidentsResolvedResult?.count || 0),
        avgResolutionTimeHours: avgResolution?.avg ? Number(avgResolution.avg) : null,
      };

      // Store analytics in Redis for quick access
      await redis.set(
        `analytics:team:${team.id}:weekly:${weekStart.toISOString().split('T')[0]}`,
        JSON.stringify(analytics),
        'EX',
        30 * 24 * 60 * 60 // 30 days
      );

      jobLogger.info({ teamId: team.id, analytics }, 'Generated weekly analytics');
    }

    jobLogger.info('Weekly analytics job completed');
  } catch (err) {
    jobLogger.error({ err }, 'Weekly analytics job failed');
    throw err;
  }
}
