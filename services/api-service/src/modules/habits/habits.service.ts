import { IHabit, IHabitLog, HabitFrequency, NotFoundError, IPaginationQuery } from '@teampulse/shared';
import { db } from '../../db';
import { getOffset, buildPaginatedResponse } from '../../utils/pagination';

interface DbHabit {
  id: string;
  name: string;
  description: string | null;
  frequency: string;
  team_id: string;
  created_by: string;
  target_count: number;
  created_at: Date;
  updated_at: Date;
}

interface DbHabitLog {
  id: string;
  habit_id: string;
  user_id: string;
  completed_at: Date;
  note: string | null;
  created_at: Date;
}

function toHabitResponse(row: DbHabit): IHabit {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    frequency: row.frequency as HabitFrequency,
    teamId: row.team_id,
    createdBy: row.created_by,
    targetCount: row.target_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toHabitLogResponse(row: DbHabitLog): IHabitLog {
  return {
    id: row.id,
    habitId: row.habit_id,
    userId: row.user_id,
    completedAt: row.completed_at.toISOString(),
    note: row.note ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.created_at.toISOString(),
  };
}

export async function createHabit(data: {
  name: string;
  teamId: string;
  createdBy: string;
  description?: string;
  frequency?: HabitFrequency;
  targetCount?: number;
}): Promise<IHabit> {
  const [row] = await db('habits')
    .insert({
      name: data.name,
      description: data.description,
      team_id: data.teamId,
      created_by: data.createdBy,
      frequency: data.frequency || HabitFrequency.DAILY,
      target_count: data.targetCount || 1,
    })
    .returning('*');

  return toHabitResponse(row);
}

export async function getHabitsByTeam(teamId: string, pagination: IPaginationQuery) {
  const offset = getOffset(pagination);
  const limit = pagination.limit || 20;

  const [{ count }] = await db('habits').where({ team_id: teamId }).count();
  const rows = await db('habits')
    .where({ team_id: teamId })
    .orderBy(pagination.sortBy || 'created_at', pagination.sortOrder || 'desc')
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(rows.map(toHabitResponse), Number(count), pagination);
}

export async function getHabitById(habitId: string): Promise<IHabit> {
  const row = await db('habits').where({ id: habitId }).first();
  if (!row) throw new NotFoundError('Habit');
  return toHabitResponse(row);
}

export async function updateHabit(
  habitId: string,
  data: {
    name?: string;
    description?: string;
    frequency?: HabitFrequency;
    targetCount?: number;
  }
): Promise<IHabit> {
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
  if (data.targetCount !== undefined) {
    updateData.target_count = data.targetCount;
    delete updateData.targetCount;
  }

  const [row] = await db('habits')
    .where({ id: habitId })
    .update(updateData)
    .returning('*');

  if (!row) throw new NotFoundError('Habit');
  return toHabitResponse(row);
}

export async function deleteHabit(habitId: string): Promise<void> {
  const deleted = await db('habits').where({ id: habitId }).del();
  if (!deleted) throw new NotFoundError('Habit');
}

export async function logHabitCompletion(
  habitId: string,
  userId: string,
  note?: string
): Promise<IHabitLog> {
  const [row] = await db('habit_logs')
    .insert({
      habit_id: habitId,
      user_id: userId,
      note,
      completed_at: new Date(),
    })
    .returning('*');

  return toHabitLogResponse(row);
}

export async function getHabitLogs(habitId: string, pagination: IPaginationQuery) {
  const offset = getOffset(pagination);
  const limit = pagination.limit || 20;

  const [{ count }] = await db('habit_logs').where({ habit_id: habitId }).count();
  const rows = await db('habit_logs')
    .where({ habit_id: habitId })
    .orderBy('completed_at', 'desc')
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(rows.map(toHabitLogResponse), Number(count), pagination);
}

export async function getUserHabitLogsToday(userId: string, habitId: string): Promise<IHabitLog[]> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await db('habit_logs')
    .where({ habit_id: habitId, user_id: userId })
    .where('completed_at', '>=', startOfDay);

  return rows.map(toHabitLogResponse);
}
