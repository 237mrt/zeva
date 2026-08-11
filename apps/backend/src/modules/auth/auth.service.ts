import { AppError } from '../../shared/errors/app-error.js';
import type { AuthRepository } from './auth.repository.js';
import { authRepository } from './auth.repository.js';
import type { AuthUser, AuthUserRecord, LoginInput } from './auth.types.js';
import { verifyPassword } from './password.js';

const invalidCredentialPasswordHash =
  '$argon2id$v=19$m=19456,p=1,t=2$n7dCUjniFlburp2xhJIuQQ$xMP13tn1PwRt1yCWRnSKjwyC5FfADOXU+u6F6+Ft4gA';

function toAuthUser(user: AuthUserRecord): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export class AuthService {
  public constructor(private readonly repository: AuthRepository = authRepository) {}

  public async login(input: LoginInput): Promise<AuthUser> {
    const user = await this.repository.findByEmail(input.email.trim().toLowerCase());
    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? invalidCredentialPasswordHash,
      input.password,
    );

    if (!user || !passwordMatches) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'E-posta veya şifre hatalı.');
    }

    if (!user.isActive) {
      throw new AppError(
        403,
        'ACCOUNT_DISABLED',
        'Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.',
      );
    }

    return toAuthUser(user);
  }

  public async getCurrentUser(id: string): Promise<AuthUser> {
    const user = await this.repository.findById(id);

    if (!user) {
      throw new AppError(401, 'UNAUTHORIZED', 'Oturumunuz geçersiz veya süresi dolmuş.');
    }

    if (!user.isActive) {
      throw new AppError(
        403,
        'ACCOUNT_DISABLED',
        'Hesabınız devre dışı bırakılmış. Yöneticinizle iletişime geçin.',
      );
    }

    return toAuthUser(user);
  }
}

export const authService = new AuthService();
