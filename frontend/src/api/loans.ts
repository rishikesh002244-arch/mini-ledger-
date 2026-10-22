import { Platform } from 'react-native';
import { apiRequest } from '../lib/api';
import type {
  Loan,
  LoanFilter,
  LoanSummary,
  NewLoanInput,
  PaginationMeta,
  RepayResult,
} from '../types';

const appendReceipt = async (form: FormData, input: NewLoanInput): Promise<void> => {
  const hasFile = Boolean(input.receiptUri || input.receiptFile);
  if (!hasFile) return;

  const filename = input.receiptName ?? `receipt-${Date.now()}.jpg`;
  const type = input.receiptType ?? 'image/jpeg';

  if (Platform.OS === 'web') {
    // On web the picker gives us the File/Blob directly.
    if (input.receiptFile) {
      form.append('receipt', input.receiptFile, filename);
      return;
    }
    if (input.receiptUri) {
      const blob = await (await fetch(input.receiptUri)).blob();
      form.append('receipt', blob, filename);
    }
    return;
  }

  // React Native's FormData accepts a file descriptor object.
  form.append('receipt', {
    uri: input.receiptUri,
    name: filename,
    type,
  } as unknown as Blob);
};

export const loansApi = {
  async list(token: string, status: LoanFilter = 'all'): Promise<{ loans: Loan[]; meta: PaginationMeta }> {
    const query = `status=${encodeURIComponent(status)}&limit=100&sortBy=dueDate&order=asc`;
    const { data, meta } = await apiRequest<Loan[]>(`/loans?${query}`, { token });

    return {
      loans: data,
      meta: (meta ?? {
        page: 1,
        limit: 100,
        total: data.length,
        totalPages: 1,
        status,
        sortBy: 'dueDate',
        order: 'asc',
      }) as unknown as PaginationMeta,
    };
  },

  async summary(token: string): Promise<LoanSummary> {
    const { data } = await apiRequest<LoanSummary>('/loans/summary', { token });
    return data;
  },

  async create(token: string, input: NewLoanInput): Promise<Loan> {
    const form = new FormData();
    form.append('friend_name', input.friendName.trim());
    form.append('amount', input.amount.trim());
    form.append('due_date', input.dueDate.toISOString());
    await appendReceipt(form, input);

    const { data } = await apiRequest<Loan>('/loans', {
      method: 'POST',
      token,
      body: form,
    });
    return data;
  },

  async repay(token: string, id: string): Promise<RepayResult> {
    const { data } = await apiRequest<RepayResult>(`/loans/${id}/repay`, {
      method: 'PUT',
      token,
    });
    return data;
  },

  async remove(token: string, id: string): Promise<void> {
    await apiRequest<{ deletedId: string }>(`/loans/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};
