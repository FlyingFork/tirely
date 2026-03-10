export const createMockUser = (overrides?: Record<string, unknown>) => ({
  id: 'test-user-id',
  name: 'Test User',
  email: 'test@test.com',
  role: 'user',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

export const createMockSession = (overrides?: Record<string, unknown>) => ({
  id: 'test-session-id',
  userId: 'test-user-id',
  token: 'test-token',
  expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
