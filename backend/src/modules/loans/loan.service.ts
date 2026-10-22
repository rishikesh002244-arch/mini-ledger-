import { Prisma, type Loan } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ApiError } from '../../common/errors/ApiError';
import {
  daysOverdue,
  daysUntilDue,
  decimalToNumber,
} from '../../common/utils/format';
import { removeReceiptFile } from '../../middlewares/upload.middleware';
import type { CreateLoanInput, ListLoansQuery } from './loan.schemas';

export type LoanStatus = 'pending' | 'overdue' | 'repaid';

export interface LoanDto {
  id: string;
  friendName: string;
  amount: number;
  currency: 'INR';
  dueDate: string;
  receiptImageUrl: string | null;
  isRepaid: boolean;
  repaidAt: string | null;
  status: LoanStatus;
  isOverdue: boolean;
  daysOverdue: number;
  daysUntilDue: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoanSummary {
  currency: 'INR';
  totalLent: number;
  totalRepaid: number;
  totalOverdue: number;
  /** totalLent − totalRepaid */
  outstanding: number;
  totalLoans: number;
  repaidCount: number;
  pendingCount: number;
  overdueCount: number;
  asOf: string;
}

const toLoanDto = (loan: Loan, now = new Date()): LoanDto => {
  const isOverdue = !loan.isRepaid && loan.dueDate.getTime() < now.getTime();
  const status: LoanStatus = loan.isRepaid ? 'repaid' : isOverdue ? 'overdue' : 'pending';

  return {
    id: loan.id,
    friendName: loan.friendName,
    amount: decimalToNumber(loan.amount),
    currency: 'INR',
    dueDate: loan.dueDate.toISOString(),
    receiptImageUrl: loan.receiptImageUrl,
    isRepaid: loan.isRepaid,
    repaidAt: loan.repaidAt?.toISOString() ?? null,
    status,
    isOverdue,
    daysOverdue: isOverdue ? daysOverdue(loan.dueDate, now) : 0,
    daysUntilDue: daysUntilDue(loan.dueDate, now),
    createdAt: loan.createdAt.toISOString(),
    updatedAt: loan.updatedAt.toISOString(),
  };
};

export const loanService = {
  async create(ownerId: string, input: CreateLoanInput, receiptImageUrl?: string): Promise<LoanDto> {
    const loan = await prisma.loan.create({
      data: {
        userId: ownerId,
        friendName: input.friend_name,
        // Store the decimal as a string so no float rounding sneaks into money.
        amount: new Prisma.Decimal(input.amount.toFixed(2)),
        dueDate: input.due_date,
        receiptImageUrl: receiptImageUrl ?? input.receipt_image_url ?? null,
      },
    });

    return toLoanDto(loan);
  },

  async list(ownerId: string, query: ListLoansQuery) {
    const now = new Date();
    const where: Prisma.LoanWhereInput = { userId: ownerId };

    switch (query.status) {
      case 'repaid':
        where.isRepaid = true;
        break;
      case 'pending':
        where.isRepaid = false;
        where.dueDate = { gte: now };
        break;
      case 'overdue':
        where.isRepaid = false;
        where.dueDate = { lt: now };
        break;
      default:
        break;
    }

    if (query.search) {
      where.friendName = { contains: query.search, mode: 'insensitive' };
    }

    const skip = (query.page - 1) * query.limit;
    const orderBy = {
      [query.sortBy]: query.order,
    } as Prisma.LoanOrderByWithRelationInput;

    const [loans, total] = await prisma.$transaction([
      prisma.loan.findMany({
        where,
        orderBy: [orderBy, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      prisma.loan.count({ where }),
    ]);

    return {
      loans: loans.map((loan) => toLoanDto(loan, now)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        status: query.status,
        sortBy: query.sortBy,
        order: query.order,
      },
    };
  },

  async summary(ownerId: string): Promise<LoanSummary> {
    const now = new Date();

    const [all, repaid, overdue] = await prisma.$transaction([
      prisma.loan.aggregate({
        where: { userId: ownerId },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.loan.aggregate({
        where: { userId: ownerId, isRepaid: true },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.loan.aggregate({
        where: { userId: ownerId, isRepaid: false, dueDate: { lt: now } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    const totalLent = decimalToNumber(all._sum.amount ?? 0);
    const totalRepaid = decimalToNumber(repaid._sum.amount ?? 0);
    const totalOverdue = decimalToNumber(overdue._sum.amount ?? 0);
    const totalLoans = all._count._all;
    const repaidCount = repaid._count._all;
    const overdueCount = overdue._count._all;

    return {
      currency: 'INR',
      totalLent,
      totalRepaid,
      totalOverdue,
      outstanding: Math.round((totalLent - totalRepaid) * 100) / 100,
      totalLoans,
      repaidCount,
      pendingCount: Math.max(0, totalLoans - repaidCount - overdueCount),
      overdueCount,
      asOf: now.toISOString(),
    };
  },

  async getById(ownerId: string, loanId: string): Promise<LoanDto> {
    const loan = await prisma.loan.findFirst({ where: { id: loanId, userId: ownerId } });
    if (!loan) throw ApiError.notFound('Loan not found.', 'LOAN_NOT_FOUND');
    return toLoanDto(loan);
  },

  async repay(
    ownerId: string,
    loanId: string,
  ): Promise<{ loan: LoanDto; alreadyRepaid: boolean }> {
    const existing = await prisma.loan.findFirst({
      where: { id: loanId, userId: ownerId },
    });

    if (!existing) throw ApiError.notFound('Loan not found.', 'LOAN_NOT_FOUND');

    if (existing.isRepaid) {
      return { loan: toLoanDto(existing), alreadyRepaid: true };
    }

    const updated = await prisma.loan.update({
      where: { id: existing.id },
      data: { isRepaid: true, repaidAt: new Date() },
    });

    return { loan: toLoanDto(updated), alreadyRepaid: false };
  },

  async remove(ownerId: string, loanId: string): Promise<{ deletedId: string }> {
    const existing = await prisma.loan.findFirst({
      where: { id: loanId, userId: ownerId },
      select: { id: true, receiptImageUrl: true },
    });

    if (!existing) throw ApiError.notFound('Loan not found.', 'LOAN_NOT_FOUND');

    await prisma.loan.delete({ where: { id: existing.id } });
    removeReceiptFile(existing.receiptImageUrl);

    return { deletedId: existing.id };
  },
};

export { toLoanDto };
