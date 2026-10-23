import { z } from 'zod';
import { normalizeIndianPhone } from '../../utils/loan.js';

const phone = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const normalized = normalizeIndianPhone(v);
    if (!normalized) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid 10-digit Indian mobile number' });
      return z.NEVER;
    }
    return normalized;
  });

export const requestOtpSchema = z.object({ phone });

export const verifyOtpSchema = z.object({
  phone,
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
