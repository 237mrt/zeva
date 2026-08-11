export const userRoles = ['ADMIN'] as const;

export type UserRole = (typeof userRoles)[number];

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthUserRecord extends AuthUser {
  passwordHash: string;
  isActive: boolean;
}

export interface AdminBootstrapInput {
  email: string;
  passwordHash: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthTokenPayload {
  sub: string;
  role: UserRole;
}
