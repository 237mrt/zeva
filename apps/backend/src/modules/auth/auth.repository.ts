import { prisma } from '../../lib/prisma.js';
import type { AdminBootstrapInput, AuthUserRecord, UserRole } from './auth.types.js';

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  findById(id: string): Promise<AuthUserRecord | null>;
  upsertAdmin(input: AdminBootstrapInput): Promise<AuthUserRecord>;
}

function toAuthUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
  };
}

export class PrismaAuthRepository implements AuthRepository {
  public async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toAuthUserRecord(user) : null;
  }

  public async findById(id: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toAuthUserRecord(user) : null;
  }

  public async upsertAdmin(input: AdminBootstrapInput): Promise<AuthUserRecord> {
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: {},
      create: {
        email: input.email,
        passwordHash: input.passwordHash,
        name: input.name,
        role: 'ADMIN',
      },
    });

    return toAuthUserRecord(user);
  }
}

export const authRepository = new PrismaAuthRepository();
