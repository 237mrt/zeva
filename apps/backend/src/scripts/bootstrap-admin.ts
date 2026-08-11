import { getAdminBootstrapEnvironment } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { bootstrapAdmin } from '../modules/auth/auth.bootstrap.js';

try {
  const environment = getAdminBootstrapEnvironment();
  const user = await bootstrapAdmin({
    email: environment.ZEVA_ADMIN_EMAIL,
    password: environment.ZEVA_ADMIN_PASSWORD,
    name: environment.ZEVA_ADMIN_NAME,
  });

  console.info(`Yönetici hesabı hazır: ${user.email}`);
} finally {
  await prisma.$disconnect();
}
