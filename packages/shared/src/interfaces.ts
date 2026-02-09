import {
  UserRole,
  TaskStatus,
  TaskPriority,
  IncidentSeverity,
  IncidentStatus,
  HabitFrequency,
  ProjectStatus,
} from './enums';

// ── Base ──────────────────────────────────────────
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ── Auth ──────────────────────────────────────────
export interface IUser extends BaseEntity {
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface ITokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthPayload {
  userId: string;
  email: string;
}

export interface ILoginRequest {
  email: string;
  password: string;
}

export interface IRegisterRequest {
  email: string;
  password: string;
  name: string;
}

// ── Teams ─────────────────────────────────────────
export interface ITeam extends BaseEntity {
  name: string;
  description?: string;
  ownerId: string;
}

export interface ITeamMember {
  userId: string;
  teamId: string;
  role: UserRole;
  user?: IUser;
  joinedAt: string;
}

// ── Projects ──────────────────────────────────────
export interface IProject extends BaseEntity {
  name: string;
  description?: string;
  teamId: string;
  status: ProjectStatus;
}

// ── Tasks ─────────────────────────────────────────
export interface ITask extends BaseEntity {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
}

// ── Habits ────────────────────────────────────────
export interface IHabit extends BaseEntity {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  teamId: string;
  createdBy: string;
  targetCount: number;
}

export interface IHabitLog extends BaseEntity {
  habitId: string;
  userId: string;
  completedAt: string;
  note?: string;
}

// ── Incidents ─────────────────────────────────────
export interface IIncident extends BaseEntity {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  teamId: string;
  reportedBy: string;
  assignedTo?: string;
  resolvedAt?: string;
}

// ── Pagination ────────────────────────────────────
export interface IPaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IPaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ── API Response ──────────────────────────────────
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
