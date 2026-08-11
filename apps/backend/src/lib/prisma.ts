import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

const databaseUrl = new URL(env.DATABASE_URL);
const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\//, ''));

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: databaseUrl.port ? Number.parseInt(databaseUrl.port, 10) : 3306,
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseName,
  connectionLimit: 10,
});

export const prisma = new PrismaClient({ adapter });
