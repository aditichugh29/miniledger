export type Loan = {
  id: string;
  friendName: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  status: 'PENDING' | 'REPAID';
  repaidAt: string | null;
  hasReceipt: boolean;
  isOverdue: boolean;
  createdAt: string;
};

export type Summary = {
  totalLent: number;
  totalRepaid: number;
  totalPending: number;
  overdueAmount: number;
  overdueCount: number;
};

export type User = { id: string; phone: string };
