export type LoanStatus = 'pending' | 'overdue' | 'repaid';
export type LoanFilter = 'all' | 'pending' | 'overdue' | 'repaid';

export interface User {
  id: string;
  phone: string;
  name: string | null;
  createdAt: string;
}

export interface Loan {
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
  outstanding: number;
  totalLoans: number;
  repaidCount: number;
  pendingCount: number;
  overdueCount: number;
  asOf: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  status: LoanFilter;
  sortBy: string;
  order: 'asc' | 'desc';
}

export interface AuthResult {
  token: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: User;
  message: string;
}

export interface OtpRequestResult {
  phone: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  message: string;
  devOtp?: string;
}

export interface LoanListResult {
  loans: Loan[];
  meta: PaginationMeta;
}

export interface RepayResult {
  loan: Loan;
  alreadyRepaid: boolean;
  message: string;
}

export interface FieldIssue {
  field: string;
  message: string;
}

export interface NewLoanInput {
  friendName: string;
  amount: string;
  dueDate: Date;
  receiptUri?: string;
  receiptName?: string;
  receiptType?: string;
  receiptFile?: Blob | null;
}
