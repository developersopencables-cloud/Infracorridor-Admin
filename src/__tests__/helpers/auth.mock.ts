import { vi } from 'vitest';
import { checkAdminSession, UserWithRole } from '@/database/auth-utils';

type AdminSessionResult = Awaited<ReturnType<typeof checkAdminSession>>;

/**
 * Mock authenticated admin user
 */
export const mockAdminAuth = () => {
  vi.mocked(checkAdminSession).mockResolvedValue({
    isAdmin: true,
    user: {
      id: 'admin-test-id',
      email: 'admin@test.com',
      role: 'admin',
      name: 'Test Admin',
    } as UserWithRole,
    session: {
      session: {
        id: 'session-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'admin-test-id',
        expiresAt: new Date(Date.now() + 86400000),
        token: 'test-token',
      },
      user: {
        id: 'admin-test-id',
        email: 'admin@test.com',
        name: 'Test Admin',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  } as AdminSessionResult);
};

/**
 * Mock authenticated regular user (non-admin)
 */
export const mockUserAuth = () => {
  vi.mocked(checkAdminSession).mockResolvedValue({
    isAdmin: false,
    user: {
      id: 'user-test-id',
      email: 'user@test.com',
      role: 'user',
      name: 'Test User',
    } as UserWithRole,
    session: {
      session: {
        id: 'session-456',
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: 'user-test-id',
        expiresAt: new Date(Date.now() + 86400000),
        token: 'test-token',
      },
      user: {
        id: 'user-test-id',
        email: 'user@test.com',
        name: 'Test User',
        emailVerified: true,
        image: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  } as AdminSessionResult);
};

/**
 * Mock unauthenticated request
 */
export const mockUnauthenticated = () => {
  vi.mocked(checkAdminSession).mockResolvedValue(null);
};

/**
 * Mock custom auth scenario
 */
export const mockCustomAuth = (session: AdminSessionResult) => {
  vi.mocked(checkAdminSession).mockResolvedValue(session);
};
