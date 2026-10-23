import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// These tests only exercise validation and auth guards, so no real database is needed.
vi.mock('../src/db.js', () => ({ prisma: {} }));
vi.mock('@prisma/client', () => ({
  LoanStatus: { PENDING: 'PENDING', REPAID: 'REPAID' },
  Prisma: { Decimal: Number },
}));

import { buildApp } from '../src/app.js';

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  app = await buildApp();
});
afterAll(async () => {
  await app.close();
});

describe('API guards', () => {
  it('GET /health works', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
  });

  it('rejects an invalid phone number with 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/request-otp', payload: { phone: '123' } });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/valid/i);
  });

  it('rejects loans routes without a token with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/loans' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects the summary without a token with 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/loans/summary' });
    expect(res.statusCode).toBe(401);
  });
});
