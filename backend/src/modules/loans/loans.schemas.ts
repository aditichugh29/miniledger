import { z } from 'zod';

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'That date does not exist');

export const createLoanSchema = z.object({
  friendName: z.string().trim().min(1, 'Friend name is required').max(80),
  amount: z
    .number({ error: 'Amount must be a number' })
    .positive('Amount must be greater than 0')
    .max(10_000_000, 'Amount is too large')
    .refine((n) => Math.round(n * 100) === n * 100 || Math.abs(n * 100 - Math.round(n * 100)) < 1e-6, 'Max 2 decimal places'),
  dueDate: dateString,
});

export const loanIdParams = z.object({ id: z.uuid('Invalid loan id') });

export const listQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'repaid']).default('all'),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;

// The app sends the receipt photo as base64 text inside a normal JSON request.
export const receiptJsonSchema = z.object({
  imageBase64: z.string().min(100, 'Image data is missing'),
});
