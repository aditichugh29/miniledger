import { LoanStatus, Prisma, type Loan } from '@prisma/client';
import { prisma } from '../../db.js';
import { config } from '../../config.js';
import { HttpError } from '../auth/auth.service.js';
import { isOverdue, roundMoney, todayInTz } from '../../utils/loan.js';
import type { CreateLoanInput } from './loans.schemas.js';

// Shape returned to the app. Amount becomes a plain number, and we add isOverdue.
export function serializeLoan(loan: Loan, today = todayInTz(config.timezone)) {
  const dueDate = loan.dueDate.toISOString().slice(0, 10);
  return {
    id: loan.id,
    friendName: loan.friendName,
    amount: Number(loan.amount),
    dueDate,
    status: loan.status,
    repaidAt: loan.repaidAt,
    hasReceipt: Boolean(loan.receiptFile),
    isOverdue: isOverdue(dueDate, loan.status, today),
    createdAt: loan.createdAt,
  };
}

export async function createLoan(userId: string, input: CreateLoanInput) {
  const loan = await prisma.loan.create({
    data: {
      userId,
      friendName: input.friendName,
      amount: new Prisma.Decimal(input.amount.toFixed(2)),
      dueDate: new Date(`${input.dueDate}T00:00:00Z`),
    },
  });
  return serializeLoan(loan);
}

export async function listLoans(userId: string, status: 'all' | 'pending' | 'repaid') {
  const where: Prisma.LoanWhereInput = { userId };
  if (status === 'pending') where.status = LoanStatus.PENDING;
  if (status === 'repaid') where.status = LoanStatus.REPAID;

  const loans = await prisma.loan.findMany({ where, orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] });
  const today = todayInTz(config.timezone);
  const items = loans.map((l) => serializeLoan(l, today));
  // Overdue first, then the rest by due date (repaid ones sink to the bottom).
  items.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'PENDING' ? -1 : 1;
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return a.dueDate.localeCompare(b.dueDate);
  });
  return items;
}

async function getOwnedLoan(userId: string, id: string) {
  const loan = await prisma.loan.findFirst({ where: { id, userId } });
  if (!loan) throw new HttpError(404, 'Loan not found');
  return loan;
}

export async function assertLoanOwned(userId: string, id: string) {
  await getOwnedLoan(userId, id);
}

export async function markRepaid(userId: string, id: string) {
  const loan = await getOwnedLoan(userId, id);
  if (loan.status === LoanStatus.REPAID) throw new HttpError(409, 'This loan is already marked as repaid');
  const updated = await prisma.loan.update({
    where: { id },
    data: { status: LoanStatus.REPAID, repaidAt: new Date() },
  });
  return serializeLoan(updated);
}

export async function getSummary(userId: string) {
  const today = todayInTz(config.timezone);
  const startOfToday = new Date(`${today}T00:00:00Z`);

  const [lent, repaid, overdue] = await Promise.all([
    prisma.loan.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.loan.aggregate({ where: { userId, status: LoanStatus.REPAID }, _sum: { amount: true } }),
    prisma.loan.aggregate({
      where: { userId, status: LoanStatus.PENDING, dueDate: { lt: startOfToday } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalLent = Number(lent._sum.amount ?? 0);
  const totalRepaid = Number(repaid._sum.amount ?? 0);
  return {
    totalLent: roundMoney(totalLent),
    totalRepaid: roundMoney(totalRepaid),
    totalPending: roundMoney(totalLent - totalRepaid),
    overdueAmount: roundMoney(Number(overdue._sum.amount ?? 0)),
    overdueCount: overdue._count,
  };
}

export async function saveReceiptFile(userId: string, id: string, fileName: string) {
  await getOwnedLoan(userId, id);
  const updated = await prisma.loan.update({ where: { id }, data: { receiptFile: fileName } });
  return serializeLoan(updated);
}

export async function getReceiptFileName(userId: string, id: string) {
  const loan = await getOwnedLoan(userId, id);
  if (!loan.receiptFile) throw new HttpError(404, 'No receipt uploaded for this loan');
  return loan.receiptFile;
}
