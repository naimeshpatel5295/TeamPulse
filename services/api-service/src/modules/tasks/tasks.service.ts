import { ITask, TaskStatus, TaskPriority, NotFoundError, IPaginationQuery } from '@teampulse/shared';
import { db } from '../../db';
import { getOffset, buildPaginatedResponse } from '../../utils/pagination';

interface DbTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  project_id: string;
  assignee_id: string | null;
  due_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toTaskResponse(row: DbTask): ITask {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    status: row.status as TaskStatus,
    priority: row.priority as TaskPriority,
    projectId: row.project_id,
    assigneeId: row.assignee_id ?? undefined,
    dueDate: row.due_date?.toISOString() ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createTask(data: {
  title: string;
  projectId: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string;
  dueDate?: string;
}): Promise<ITask> {
  const [row] = await db('tasks')
    .insert({
      title: data.title,
      description: data.description,
      project_id: data.projectId,
      priority: data.priority || TaskPriority.MEDIUM,
      status: TaskStatus.TODO,
      assignee_id: data.assigneeId,
      due_date: data.dueDate ? new Date(data.dueDate) : null,
    })
    .returning('*');

  return toTaskResponse(row);
}

export async function getTasksByProject(projectId: string, pagination: IPaginationQuery) {
  const offset = getOffset(pagination);
  const limit = pagination.limit || 20;

  const [{ count }] = await db('tasks').where({ project_id: projectId }).count();
  const rows = await db('tasks')
    .where({ project_id: projectId })
    .orderBy(pagination.sortBy || 'created_at', pagination.sortOrder || 'desc')
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(rows.map(toTaskResponse), Number(count), pagination);
}

export async function getTaskById(taskId: string): Promise<ITask> {
  const row = await db('tasks').where({ id: taskId }).first();
  if (!row) throw new NotFoundError('Task');
  return toTaskResponse(row);
}

export async function updateTask(
  taskId: string,
  data: {
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string | null;
    dueDate?: string | null;
  }
): Promise<ITask> {
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };

  if (data.assigneeId !== undefined) {
    updateData.assignee_id = data.assigneeId;
    delete updateData.assigneeId;
  }
  if (data.dueDate !== undefined) {
    updateData.due_date = data.dueDate ? new Date(data.dueDate) : null;
    delete updateData.dueDate;
  }

  const [row] = await db('tasks')
    .where({ id: taskId })
    .update(updateData)
    .returning('*');

  if (!row) throw new NotFoundError('Task');
  return toTaskResponse(row);
}

export async function deleteTask(taskId: string): Promise<void> {
  const deleted = await db('tasks').where({ id: taskId }).del();
  if (!deleted) throw new NotFoundError('Task');
}

export async function getTasksByAssignee(assigneeId: string, pagination: IPaginationQuery) {
  const offset = getOffset(pagination);
  const limit = pagination.limit || 20;

  const [{ count }] = await db('tasks').where({ assignee_id: assigneeId }).count();
  const rows = await db('tasks')
    .where({ assignee_id: assigneeId })
    .orderBy(pagination.sortBy || 'due_date', pagination.sortOrder || 'asc')
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(rows.map(toTaskResponse), Number(count), pagination);
}
