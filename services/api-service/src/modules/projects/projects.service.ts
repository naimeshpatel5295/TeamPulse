import { IProject, ProjectStatus, NotFoundError, IPaginationQuery } from '@teampulse/shared';
import { db } from '../../db';
import { getOffset, buildPaginatedResponse } from '../../utils/pagination';

interface DbProject {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

function toProjectResponse(row: DbProject): IProject {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    teamId: row.team_id,
    status: row.status as ProjectStatus,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createProject(
  name: string,
  teamId: string,
  description?: string
): Promise<IProject> {
  const [row] = await db('projects')
    .insert({ name, description, team_id: teamId, status: ProjectStatus.ACTIVE })
    .returning('*');

  return toProjectResponse(row);
}

export async function getProjectsByTeam(teamId: string, pagination: IPaginationQuery) {
  const offset = getOffset(pagination);
  const limit = pagination.limit || 20;

  const [{ count }] = await db('projects').where({ team_id: teamId }).count();
  const rows = await db('projects')
    .where({ team_id: teamId })
    .orderBy(pagination.sortBy || 'created_at', pagination.sortOrder || 'desc')
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(rows.map(toProjectResponse), Number(count), pagination);
}

export async function getProjectById(projectId: string): Promise<IProject> {
  const row = await db('projects').where({ id: projectId }).first();
  if (!row) throw new NotFoundError('Project');
  return toProjectResponse(row);
}

export async function updateProject(
  projectId: string,
  data: { name?: string; description?: string; status?: ProjectStatus }
): Promise<IProject> {
  const [row] = await db('projects')
    .where({ id: projectId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');

  if (!row) throw new NotFoundError('Project');
  return toProjectResponse(row);
}

export async function deleteProject(projectId: string): Promise<void> {
  const deleted = await db('projects').where({ id: projectId }).del();
  if (!deleted) throw new NotFoundError('Project');
}
