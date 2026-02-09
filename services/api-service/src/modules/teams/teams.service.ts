import { ITeam, ITeamMember, UserRole, NotFoundError } from '@teampulse/shared';
import { db } from '../../db';

interface DbTeam {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
}

interface DbTeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  joined_at: Date;
}

function toTeamResponse(row: DbTeam): ITeam {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    ownerId: row.owner_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function toMemberResponse(row: DbTeamMember): ITeamMember {
  return {
    userId: row.user_id,
    teamId: row.team_id,
    role: row.role as UserRole,
    joinedAt: row.joined_at.toISOString(),
  };
}

export async function createTeam(
  name: string,
  ownerId: string,
  description?: string
): Promise<ITeam> {
  const [row] = await db('teams')
    .insert({ name, description, owner_id: ownerId })
    .returning('*');

  // Add owner as team member
  await db('team_members').insert({
    user_id: ownerId,
    team_id: row.id,
    role: UserRole.OWNER,
  });

  return toTeamResponse(row);
}

export async function getTeamsByUser(userId: string): Promise<ITeam[]> {
  const rows = await db('teams')
    .join('team_members', 'teams.id', 'team_members.team_id')
    .where('team_members.user_id', userId)
    .select('teams.*');

  return rows.map(toTeamResponse);
}

export async function getTeamById(teamId: string): Promise<ITeam> {
  const row = await db('teams').where({ id: teamId }).first();
  if (!row) throw new NotFoundError('Team');
  return toTeamResponse(row);
}

export async function updateTeam(
  teamId: string,
  data: { name?: string; description?: string }
): Promise<ITeam> {
  const [row] = await db('teams')
    .where({ id: teamId })
    .update({ ...data, updated_at: new Date() })
    .returning('*');

  if (!row) throw new NotFoundError('Team');
  return toTeamResponse(row);
}

export async function deleteTeam(teamId: string): Promise<void> {
  const deleted = await db('teams').where({ id: teamId }).del();
  if (!deleted) throw new NotFoundError('Team');
}

export async function getTeamMembers(teamId: string): Promise<ITeamMember[]> {
  const rows = await db('team_members').where({ team_id: teamId });
  return rows.map(toMemberResponse);
}

export async function addTeamMember(
  teamId: string,
  userId: string,
  role: UserRole = UserRole.MEMBER
): Promise<ITeamMember> {
  const [row] = await db('team_members')
    .insert({ user_id: userId, team_id: teamId, role })
    .returning('*');

  return toMemberResponse(row);
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: UserRole
): Promise<ITeamMember> {
  const [row] = await db('team_members')
    .where({ team_id: teamId, user_id: userId })
    .update({ role })
    .returning('*');

  if (!row) throw new NotFoundError('Team member');
  return toMemberResponse(row);
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const deleted = await db('team_members')
    .where({ team_id: teamId, user_id: userId })
    .del();

  if (!deleted) throw new NotFoundError('Team member');
}
