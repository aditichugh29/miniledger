import { describe, expect, it } from 'vitest';
import { isOverdue, normalizeIndianPhone, roundMoney, todayInTz } from '../src/utils/loan.js';

describe('isOverdue', () => {
  it('is overdue when pending and due before today', () => {
    expect(isOverdue('2026-10-01', 'PENDING', '2026-10-22')).toBe(true);
  });
  it('is not overdue on the due date itself', () => {
    expect(isOverdue('2026-10-22', 'PENDING', '2026-10-22')).toBe(false);
  });
  it('is never overdue once repaid', () => {
    expect(isOverdue('2026-01-01', 'REPAID', '2026-10-22')).toBe(false);
  });
});

describe('normalizeIndianPhone', () => {
  it.each(['9876543210', '+91 98765 43210', '09876543210', '91-9876543210'])('accepts %s', (v) => {
    expect(normalizeIndianPhone(v)).toBe('+919876543210');
  });
  it.each(['12345', '5876543210', 'abcdefghij', ''])('rejects %s', (v) => {
    expect(normalizeIndianPhone(v)).toBeNull();
  });
});

describe('todayInTz', () => {
  it('uses the timezone, not UTC', () => {
    // 20:00 UTC on 21 Oct is already 22 Oct in India
    expect(todayInTz('Asia/Kolkata', new Date('2026-10-21T20:00:00Z'))).toBe('2026-10-22');
  });
});

describe('roundMoney', () => {
  it('rounds to 2 decimals', () => {
    expect(roundMoney(10.005 + 0.1)).toBe(10.11);
  });
});
