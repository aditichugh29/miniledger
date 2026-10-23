import { describe, expect, it } from 'vitest';
import { requestOtpSchema, verifyOtpSchema } from '../src/modules/auth/auth.schemas.js';
import { createLoanSchema } from '../src/modules/loans/loans.schemas.js';

describe('auth schemas', () => {
  it('normalizes the phone number', () => {
    expect(requestOtpSchema.parse({ phone: '98765 43210' }).phone).toBe('+919876543210');
  });
  it('rejects an invalid phone', () => {
    expect(requestOtpSchema.safeParse({ phone: '123' }).success).toBe(false);
  });
  it('requires a 6 digit OTP', () => {
    expect(verifyOtpSchema.safeParse({ phone: '9876543210', otp: '12345' }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ phone: '9876543210', otp: '123456' }).success).toBe(true);
  });
});

describe('createLoanSchema', () => {
  const valid = { friendName: ' Riya ', amount: 500.5, dueDate: '2026-11-01' };

  it('accepts valid input and trims the name', () => {
    expect(createLoanSchema.parse(valid).friendName).toBe('Riya');
  });
  it('rejects empty name, bad amounts and impossible dates', () => {
    expect(createLoanSchema.safeParse({ ...valid, friendName: '  ' }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...valid, amount: -5 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...valid, amount: 10.123 }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...valid, dueDate: '2026-02-31' }).success).toBe(false);
    expect(createLoanSchema.safeParse({ ...valid, dueDate: '01/11/2026' }).success).toBe(false);
  });
});
