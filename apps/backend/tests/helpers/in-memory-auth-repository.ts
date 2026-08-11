import type { AuthRepository } from '../../src/modules/auth/auth.repository.js';
import type {
  AdminBootstrapInput,
  AuthUserRecord,
} from '../../src/modules/auth/auth.types.js';

export class InMemoryAuthRepository implements AuthRepository {
  private readonly users = new Map<string, AuthUserRecord>();

  public constructor(initialUsers: AuthUserRecord[] = []) {
    initialUsers.forEach((user) => this.users.set(user.email, { ...user }));
  }

  public async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return Promise.resolve(this.users.get(email) ?? null);
  }

  public async findById(id: string): Promise<AuthUserRecord | null> {
    return Promise.resolve(
      [...this.users.values()].find((user) => user.id === id) ?? null,
    );
  }

  public async upsertAdmin(input: AdminBootstrapInput): Promise<AuthUserRecord> {
    const existingUser = this.users.get(input.email);

    if (existingUser) {
      return Promise.resolve(existingUser);
    }

    const user: AuthUserRecord = {
      id: `user-${this.users.size + 1}`,
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      role: 'ADMIN',
      isActive: true,
    };
    this.users.set(user.email, user);

    return Promise.resolve(user);
  }

  public count(): number {
    return this.users.size;
  }
}
