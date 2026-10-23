import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const { dir } = vi.hoisted(() => {
  const d = `${process.env.TMPDIR ?? '/tmp'}/miniledger-test-uploads`;
  process.env.UPLOADS_DIR = d;
  return { dir: d };
});

const loanRow = {
  id: '11111111-1111-4111-8111-111111111111',
  userId: 'user-1',
  friendName: 'Riya',
  amount: 100,
  dueDate: new Date('2026-11-01T00:00:00Z'),
  status: 'PENDING',
  repaidAt: null,
  receiptFile: null,
  createdAt: new Date(),
};

vi.mock('@prisma/client', () => ({
  LoanStatus: { PENDING: 'PENDING', REPAID: 'REPAID' },
  Prisma: { Decimal: Number },
}));
vi.mock('../src/db.js', () => ({
  prisma: {
    loan: {
      findFirst: vi.fn(async () => loanRow),
      update: vi.fn(async ({ data }: { data: object }) => ({ ...loanRow, ...data })),
    },
  },
}));

import { buildApp } from '../src/app.js';

const BOUNDARY = '----miniledgertest';
function multipart(file: Buffer, type: string) {
  return Buffer.concat([
    Buffer.from(
      `--${BOUNDARY}\r\nContent-Disposition: form-data; name="receipt"; filename="receipt.jpg"\r\nContent-Type: ${type}\r\n\r\n`,
    ),
    file,
    Buffer.from(`\r\n--${BOUNDARY}--\r\n`),
  ]);
}

const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(200)]);
const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200)]);

let app: Awaited<ReturnType<typeof buildApp>>;
let token: string;

beforeAll(async () => {
  app = await buildApp();
  token = app.jwt.sign({ sub: 'user-1', phone: '+919876543210' });
});
afterAll(async () => {
  await app.close();
});

const upload = (payload: Buffer) =>
  app.inject({
    method: 'POST',
    url: `/loans/${loanRow.id}/receipt`,
    headers: { authorization: `Bearer ${token}`, 'content-type': `multipart/form-data; boundary=${BOUNDARY}` },
    payload,
  });

describe('receipt upload', () => {
  it('accepts a PNG (e.g. a phone screenshot)', async () => {
    const res = await upload(multipart(PNG, 'image/png'));
    expect(res.statusCode).toBe(200);
    expect(res.json().hasReceipt).toBe(true);
  });

  it('accepts a JPG even if the phone sends an odd type like image/jpg', async () => {
    const res = await upload(multipart(JPG, 'image/jpg'));
    expect(res.statusCode).toBe(200);
  });

  it('rejects a non-image file', async () => {
    const res = await upload(multipart(Buffer.from('hello this is not an image'), 'image/jpeg'));
    expect(res.statusCode).toBe(400);
  });

  it('accepts a JPG sent as base64 JSON (what the app uses)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/loans/${loanRow.id}/receipt`,
      headers: { authorization: `Bearer ${token}` },
      payload: { imageBase64: JPG.toString('base64') },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().hasReceipt).toBe(true);
  });

  it('rejects base64 JSON that is not an image', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/loans/${loanRow.id}/receipt`,
      headers: { authorization: `Bearer ${token}` },
      payload: { imageBase64: Buffer.from('x'.repeat(300)).toString('base64') },
    });
    expect(res.statusCode).toBe(400);
  });

  it('returns the receipt as a base64 data URI', async () => {
    const { prisma } = await import('../src/db.js');
    const name = (await import('node:fs')).readdirSync(dir).find((f) => f.endsWith('.png'))!;
    (prisma.loan.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ...loanRow, receiptFile: name });
    const res = await app.inject({
      method: 'GET',
      url: `/loans/${loanRow.id}/receipt?format=base64`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().dataUri).toMatch(/^data:image\/png;base64,/);
  });

  it('streams the raw image by default', async () => {
    const { prisma } = await import('../src/db.js');
    const name = (await import('node:fs')).readdirSync(dir).find((f) => f.endsWith('.png'))!;
    (prisma.loan.findFirst as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ...loanRow, receiptFile: name });
    const res = await app.inject({
      method: 'GET',
      url: `/loans/${loanRow.id}/receipt`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
  });

  it('writes the file into the uploads folder', async () => {
    const { readdirSync } = await import('node:fs');
    expect(readdirSync(dir).length).toBeGreaterThan(0);
  });
});
