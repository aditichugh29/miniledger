import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../db.js';
import { config } from '../../config.js';

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

function hashOtp(phone: string, otp: string): string {
  return createHmac('sha256', config.jwtSecret).update(`${phone}:${otp}`).digest('hex');
}

export async function issueOtp(phone: string, log: (msg: string) => void): Promise<void> {
  const latest = await prisma.otpCode.findFirst({
    where: { phone },
    orderBy: { createdAt: 'desc' },
  });
  if (latest && Date.now() - latest.createdAt.getTime() < config.otpResendSeconds * 1000) {
    throw new HttpError(429, `Please wait ${config.otpResendSeconds} seconds before requesting a new OTP`);
  }

  const otp = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await prisma.otpCode.create({
    data: {
      phone,
      codeHash: hashOtp(phone, otp),
      expiresAt: new Date(Date.now() + config.otpTtlSeconds * 1000),
    },
  });

  // Mock SMS: the assignment says to just print the OTP in the server log.
  log(`[MOCK OTP] ${phone} -> ${otp} (valid for ${config.otpTtlSeconds / 60} minutes)`);
}

export async function verifyOtp(phone: string, otp: string) {
  const record = await prisma.otpCode.findFirst({
    where: { phone, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });
  if (!record) throw new HttpError(400, 'OTP expired or not requested. Please request a new one');
  if (record.attempts >= config.otpMaxAttempts) {
    throw new HttpError(429, 'Too many wrong attempts. Please request a new OTP');
  }

  const expected = Buffer.from(record.codeHash, 'hex');
  const actual = Buffer.from(hashOtp(phone, otp), 'hex');
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!ok) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    throw new HttpError(400, 'Incorrect OTP');
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { consumed: true } });
  return prisma.user.upsert({ where: { phone }, update: {}, create: { phone } });
}
