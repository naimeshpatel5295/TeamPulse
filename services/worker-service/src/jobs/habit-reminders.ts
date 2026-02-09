import { db } from '../db';
import { redis } from '../redis';
import { logger } from '../logger';
import { HabitFrequency } from '@teampulse/shared';

interface CountResult {
  count: string | number;
}

export async function runHabitReminders(): Promise<void> {
  const jobLogger = logger.child({ job: 'habit-reminders' });
  jobLogger.info('Starting habit reminders job');

  try {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayOfMonth = now.getDate();

    // Get all habits that need reminders today
    let habitsQuery = db('habits')
      .select('habits.*', 'teams.name as team_name')
      .join('teams', 'habits.team_id', 'teams.id')
      .where('habits.frequency', HabitFrequency.DAILY);

    // On Mondays, also include weekly habits
    if (dayOfWeek === 1) {
      habitsQuery = habitsQuery.orWhere('habits.frequency', HabitFrequency.WEEKLY);
    }

    // On 1st of month, also include monthly habits
    if (dayOfMonth === 1) {
      habitsQuery = habitsQuery.orWhere('habits.frequency', HabitFrequency.MONTHLY);
    }

    const habits = await habitsQuery;

    jobLogger.info({ habitCount: habits.length }, 'Found habits for reminders');

    for (const habit of habits) {
      // Get team members
      const members = await db('team_members')
        .where({ team_id: habit.team_id })
        .select('user_id');

      for (const member of members) {
        // Check if user has already completed habit today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const completedToday = await db('habit_logs')
          .where({
            habit_id: habit.id,
            user_id: member.user_id,
          })
          .where('completed_at', '>=', startOfDay)
          .count('* as count')
          .first() as CountResult | undefined;

        const count = Number(completedToday?.count || 0);

        if (count < habit.target_count) {
          // Queue reminder (in production, this would send an email/push notification)
          await redis.lpush(
            'notifications:queue',
            JSON.stringify({
              type: 'habit_reminder',
              userId: member.user_id,
              habitId: habit.id,
              habitName: habit.name,
              teamName: habit.team_name,
              remaining: habit.target_count - count,
              timestamp: new Date().toISOString(),
            })
          );

          jobLogger.debug(
            { userId: member.user_id, habitId: habit.id },
            'Queued habit reminder'
          );
        }
      }
    }

    jobLogger.info('Habit reminders job completed');
  } catch (err) {
    jobLogger.error({ err }, 'Habit reminders job failed');
    throw err;
  }
}
