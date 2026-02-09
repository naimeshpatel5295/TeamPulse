import knex, { Knex } from 'knex';
import { config } from './config';

export const db: Knex = knex({
  client: 'pg',
  connection: {
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
  },
  pool: { min: 1, max: 5 },
});
