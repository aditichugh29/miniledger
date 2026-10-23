// Pure helper functions (no database), so they are easy to unit test.

/** Today's date as YYYY-MM-DD in the given timezone (default: India). */
export function todayInTz(timeZone: string, now: Date = new Date()): string {
  // 'en-CA' formats dates as YYYY-MM-DD
  return now.toLocaleDateString('en-CA', { timeZone });
}

/** A loan is overdue if it is still pending and its due date is before today. */
export function isOverdue(
  dueDate: string,
  status: 'PENDING' | 'REPAID',
  today: string,
): boolean {
  return status === 'PENDING' && dueDate < today;
}

/** Turns +91 98765 43210 / 09876543210 / 9876543210 into +919876543210. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s\-()]/g, '');
  const match = digits.match(/^(?:\+?91|0)?([6-9]\d{9})$/);
  return match ? `+91${match[1]}` : null;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
