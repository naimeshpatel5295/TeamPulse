import { IIncident, IncidentSeverity, IncidentStatus, NotFoundError, IPaginationQuery } from '@teampulse/shared';
import { db } from '../../db';
import { getOffset, buildPaginatedResponse } from '../../utils/pagination';

interface DbIncident {
  id: string;
  title: string;
  description: string | null;
  severity: string;
  status: string;
  team_id: string;
  reported_by: string;
  assigned_to: string | null;
  resolved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function toIncidentResponse(row: DbIncident): IIncident {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    teamId: row.team_id,
    reportedBy: row.reported_by,
    assignedTo: row.assigned_to ?? undefined,
    resolvedAt: row.resolved_at?.toISOString() ?? undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function createIncident(data: {
  title: string;
  teamId: string;
  reportedBy: string;
  description?: string;
  severity?: IncidentSeverity;
  assignedTo?: string;
}): Promise<IIncident> {
  const [row] = await db('incidents')
    .insert({
      title: data.title,
      description: data.description,
      team_id: data.teamId,
      reported_by: data.reportedBy,
      severity: data.severity || IncidentSeverity.MEDIUM,
      status: IncidentStatus.OPEN,
      assigned_to: data.assignedTo,
    })
    .returning('*');

  return toIncidentResponse(row);
}

export async function getIncidentsByTeam(teamId: string, pagination: IPaginationQuery) {
  const offset = getOffset(pagination);
  const limit = pagination.limit || 20;

  const [{ count }] = await db('incidents').where({ team_id: teamId }).count();
  const rows = await db('incidents')
    .where({ team_id: teamId })
    .orderBy(pagination.sortBy || 'created_at', pagination.sortOrder || 'desc')
    .limit(limit)
    .offset(offset);

  return buildPaginatedResponse(rows.map(toIncidentResponse), Number(count), pagination);
}

export async function getOpenIncidentsByTeam(teamId: string): Promise<IIncident[]> {
  const rows = await db('incidents')
    .where({ team_id: teamId })
    .whereNot({ status: IncidentStatus.RESOLVED })
    .orderBy('severity', 'desc')
    .orderBy('created_at', 'asc');

  return rows.map(toIncidentResponse);
}

export async function getIncidentById(incidentId: string): Promise<IIncident> {
  const row = await db('incidents').where({ id: incidentId }).first();
  if (!row) throw new NotFoundError('Incident');
  return toIncidentResponse(row);
}

export async function updateIncident(
  incidentId: string,
  data: {
    title?: string;
    description?: string;
    severity?: IncidentSeverity;
    status?: IncidentStatus;
    assignedTo?: string | null;
  }
): Promise<IIncident> {
  const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };

  if (data.assignedTo !== undefined) {
    updateData.assigned_to = data.assignedTo;
    delete updateData.assignedTo;
  }

  // Auto-set resolved_at when status changes to resolved
  if (data.status === IncidentStatus.RESOLVED) {
    updateData.resolved_at = new Date();
  }

  const [row] = await db('incidents')
    .where({ id: incidentId })
    .update(updateData)
    .returning('*');

  if (!row) throw new NotFoundError('Incident');
  return toIncidentResponse(row);
}

export async function deleteIncident(incidentId: string): Promise<void> {
  const deleted = await db('incidents').where({ id: incidentId }).del();
  if (!deleted) throw new NotFoundError('Incident');
}

export async function getStaleIncidents(teamId: string, hoursStale: number = 24): Promise<IIncident[]> {
  const staleDate = new Date(Date.now() - hoursStale * 60 * 60 * 1000);

  const rows = await db('incidents')
    .where({ team_id: teamId })
    .whereNot({ status: IncidentStatus.RESOLVED })
    .where('updated_at', '<', staleDate)
    .orderBy('severity', 'desc');

  return rows.map(toIncidentResponse);
}
