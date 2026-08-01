/**
 * Centralized TanStack Query client for CRM ByBusiness.
 *
 * Default options are tuned for the CRM workload:
 * - staleTime 30s: most data is not super time-sensitive
 * - retry 1: don't hammer n8n on flaky network
 * - refetchOnWindowFocus false: CRM is task-oriented, not realtime
 */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // 30 seconds
      gcTime: 5 * 60_000,        // 5 minutes (formerly cacheTime)
      retry: 1,                   // 1 retry on failure
      refetchOnWindowFocus: false, // CRM is task-oriented, not realtime
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0, // mutations don't retry
    },
  },
});

export default queryClient;
