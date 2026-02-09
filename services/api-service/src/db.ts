import knex, { Knex } from 'knex';
import { config } from './config';
import { logger } from './logger';

export const db: Knex = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  },
  pool: { min: 2, max: 10 },
});

export async function runMigrations() {
  logger.info('Running api-service migrations...');

  // Teams table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS teams (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      owner_id UUID NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Team members table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS team_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      role VARCHAR(50) NOT NULL DEFAULT 'member',
      joined_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, team_id)
    )
  `);

  // Projects table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Tasks table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'todo',
      priority VARCHAR(50) NOT NULL DEFAULT 'medium',
      project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      assignee_id UUID,
      due_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Habits table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS habits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      frequency VARCHAR(50) NOT NULL DEFAULT 'daily',
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      created_by UUID NOT NULL,
      target_count INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Habit logs table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      user_id UUID NOT NULL,
      completed_at TIMESTAMPTZ DEFAULT NOW(),
      note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Incidents table
  await db.raw(`
    CREATE TABLE IF NOT EXISTS incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      severity VARCHAR(50) NOT NULL DEFAULT 'medium',
      status VARCHAR(50) NOT NULL DEFAULT 'open',
      team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      reported_by UUID NOT NULL,
      assigned_to UUID,
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Indexes
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_habits_team_id ON habits(team_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id)`);
  await db.raw(`CREATE INDEX IF NOT EXISTS idx_incidents_team_id ON incidents(team_id)`);

  logger.info('API-service migrations complete');
}
