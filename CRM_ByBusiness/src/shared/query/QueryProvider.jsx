/**
 * QueryProvider — wraps the app with TanStack Query's QueryClientProvider.
 *
 * This component exists as a dedicated wrapper so that:
 * 1. All QueryClient configuration is centralized in queryClient.js
 * 2. Future project-specific context (e.g., auth token refresh) can be
 *    injected here without touching App.jsx
 *
 * Usage:
 *   <QueryProvider>
 *     <App />
 *   </QueryProvider>
 */
import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

export function QueryProvider({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
