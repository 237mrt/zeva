import type { AuthRepository } from './auth.repository.js';
import { authRepository } from './auth.repository.js';
import type { AuthUser } from './auth.types.js';
import { hashPassword } from './password.js';

export interface AdminBootstrapConfig {
  email: string;
  password: string;
  name: string;
}

export async function bootstrapAdmin(
  config: AdminBootstrapConfig,
  repository: AuthRepository = authRepository,
): Promise<AuthUser> {
  const email = config.email.trim().toLowerCase();
  const passwordHash = await hashPassword(config.password);
  const user = await repository.upsertAdmin({
    email,
    passwordHash,
    name: config.name.trim(),
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}
