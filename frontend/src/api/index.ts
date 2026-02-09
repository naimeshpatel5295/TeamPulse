import { api } from './client';

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }),

  logout: () => api.post('/auth/logout'),

  getProfile: () => api.get('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
};

// Teams API
export const teamsApi = {
  list: () => api.get('/teams'),
  get: (id: string) => api.get(`/teams/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post('/teams', data),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/teams/${id}`, data),
  delete: (id: string) => api.delete(`/teams/${id}`),
  getMembers: (teamId: string) => api.get(`/teams/${teamId}/members`),
  addMember: (teamId: string, userId: string, role?: string) =>
    api.post(`/teams/${teamId}/members`, { userId, role }),
  removeMember: (teamId: string, userId: string) =>
    api.delete(`/teams/${teamId}/members/${userId}`),
};

// Projects API
export const projectsApi = {
  listByTeam: (teamId: string, page = 1, limit = 20) =>
    api.get(`/projects/team/${teamId}?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/projects/${id}`),
  create: (data: { name: string; teamId: string; description?: string }) =>
    api.post('/projects', data),
  update: (id: string, data: { name?: string; description?: string; status?: string }) =>
    api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
};

// Tasks API
export const tasksApi = {
  listByProject: (projectId: string, page = 1, limit = 20) =>
    api.get(`/tasks/project/${projectId}?page=${page}&limit=${limit}`),
  getMyTasks: (page = 1, limit = 20) =>
    api.get(`/tasks/my?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/tasks/${id}`),
  create: (data: {
    title: string;
    projectId: string;
    description?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
  }) => api.post('/tasks', data),
  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }
  ) => api.patch(`/tasks/${id}`, data),
  delete: (id: string) => api.delete(`/tasks/${id}`),
};

// Habits API
export const habitsApi = {
  listByTeam: (teamId: string, page = 1, limit = 20) =>
    api.get(`/habits/team/${teamId}?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/habits/${id}`),
  create: (data: {
    name: string;
    teamId: string;
    description?: string;
    frequency?: string;
    targetCount?: number;
  }) => api.post('/habits', data),
  update: (
    id: string,
    data: { name?: string; description?: string; frequency?: string; targetCount?: number }
  ) => api.patch(`/habits/${id}`, data),
  delete: (id: string) => api.delete(`/habits/${id}`),
  logCompletion: (habitId: string, note?: string) =>
    api.post(`/habits/${habitId}/log`, { note }),
  getLogs: (habitId: string, page = 1, limit = 20) =>
    api.get(`/habits/${habitId}/logs?page=${page}&limit=${limit}`),
  getMyProgress: (habitId: string) => api.get(`/habits/${habitId}/my-progress`),
};

// Incidents API
export const incidentsApi = {
  listByTeam: (teamId: string, page = 1, limit = 20) =>
    api.get(`/incidents/team/${teamId}?page=${page}&limit=${limit}`),
  getOpen: (teamId: string) => api.get(`/incidents/team/${teamId}/open`),
  getStale: (teamId: string, hours = 24) =>
    api.get(`/incidents/team/${teamId}/stale?hours=${hours}`),
  get: (id: string) => api.get(`/incidents/${id}`),
  create: (data: {
    title: string;
    teamId: string;
    description?: string;
    severity?: string;
    assignedTo?: string;
  }) => api.post('/incidents', data),
  update: (
    id: string,
    data: {
      title?: string;
      description?: string;
      severity?: string;
      status?: string;
      assignedTo?: string | null;
    }
  ) => api.patch(`/incidents/${id}`, data),
  delete: (id: string) => api.delete(`/incidents/${id}`),
};
