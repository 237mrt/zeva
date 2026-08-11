import { describe, expect, it } from 'vitest';

import { bootstrapAdmin } from '../src/modules/auth/auth.bootstrap.js';
import { verifyPassword } from '../src/modules/auth/password.js';
import { InMemoryAuthRepository } from './helpers/in-memory-auth-repository.js';

describe('Admin bootstrap', () => {
  it('tekrar çalıştırıldığında aynı admin hesabını çoğaltmaz', async () => {
    const repository = new InMemoryAuthRepository();
    const config = {
      email: ' ADMIN@ZEVA.TEST ',
      password: 'BootstrapPassword123!',
      name: ' Zeva Yöneticisi ',
    };

    const firstUser = await bootstrapAdmin(config, repository);
    const secondUser = await bootstrapAdmin(config, repository);
    const storedUser = await repository.findByEmail('admin@zeva.test');

    expect(repository.count()).toBe(1);
    expect(secondUser.id).toBe(firstUser.id);
    expect(firstUser.email).toBe('admin@zeva.test');
    expect(storedUser?.name).toBe('Zeva Yöneticisi');
    expect(await verifyPassword(storedUser?.passwordHash ?? '', config.password)).toBe(true);
  });
});
