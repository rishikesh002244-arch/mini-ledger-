import { z } from 'zod';
import { parseDueDate } from '../../common/utils/format';

const friendNameSchema = z
  .string({
    required_error: 'Friend name is required',
    invalid_type_error: 'Friend name must be text',
  })
  .trim()
  .min(2, 'Friend name must be at least 2 characters')
  .max(80, 'Friend name must be at most 80 characters');

const amountSchema = z
  .coerce.number({
    required_error: 'Amount is required',
    invalid_type_error: 'Amount must be a number',
  })
  .refine((value: number) => Number.isFinite(value), 'Amount must be a valid number')
  .refine((value: number) => value > 0, 'Amount must be greater than 0')
  .refine((value: number) => value <= 1_000_000_000, 'Amount is too large')
  .transform((value: number) => Math.round(value * 100) / 100);

const dueDateSchema = z
  .string({
    required_error: 'Due date is required',
    invalid_type_error: 'Due date must be a date string',
  })
  .trim()
  .min(1, 'Due date is required')
  .superRefine((value, ctx) => {
    if (!parseDueDate(value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Due date must be a valid date, e.g. 2026-11-15 or an ISO timestamp',
      });
    }
  })
  .transform((value) => parseDueDate(value) as Date);

const receiptImageUrlSchema = z
  .string()
  .trim()
  .max(2048, 'Receipt URL is too long')
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined))
  .refine(
    (value) => value === undefined || /^https?:\/\//.test(value) || value.startsWith('/uploads/'),
    'Receipt URL must be an http(s) URL or an /uploads path',
  );

export const createLoanSchema = z
  .object({
    friend_name: friendNameSchema,
    amount: amountSchema,
    due_date: dueDateSchema,
    receipt_image_url: receiptImageUrlSchema,
  })
  .strict();

export const listLoansQuerySchema = z
  .object({
    status: z.enum(['all', 'pending', 'overdue', 'repaid']).default('all'),
    search: z
      .string()
      .trim()
      .max(80, 'Search must be at most 80 characters')
      .optional()
      .transform((value) => (value ? value : undefined)),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    sortBy: z.enum(['dueDate', 'amount', 'createdAt']).default('dueDate'),
    order: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

export const loanIdParamSchema = z
  .object({
    id: z.string().uuid('Loan id must be a valid UUID'),
  })
  .strict();

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type ListLoansQuery = z.infer<typeof listLoansQuerySchema>;
export type LoanIdParam = z.infer<typeof loanIdParamSchema>;
