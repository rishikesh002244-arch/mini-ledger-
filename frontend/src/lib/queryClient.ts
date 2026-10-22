import { QueryClient } from '@tanstack/react-query';
import { ApiClientError } from './api';
import type { LoanFilter } from '../types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  loans: (filter: LoanFilter) => ['loans', filter] as const,
  summary: ['loans', 'summary'] as const,
  me: ['auth', 'me'] as const,
};
