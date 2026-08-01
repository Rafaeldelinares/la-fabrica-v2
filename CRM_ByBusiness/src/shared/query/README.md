# React Query (TanStack Query) — CRM ByBusiness

## Overview

This module centralizes TanStack Query v5 configuration and utilities for the CRM frontend. The goal is consistent data-fetching patterns across all components.

## Files

| File | Purpose |
|------|---------|
| `queryClient.js` | Central `QueryClient` instance with default options |
| `QueryProvider.jsx` | React context wrapper for the app |
| `api.js` | Low-level fetch helpers (`apiGet`, `apiPost`, etc.) |

## Pattern to Follow

### Reading Data: `useQuery`

```jsx
import { useQuery } from '@tanstack/react-query';
import { n8nGet } from '../../../shared/hooks/useN8n';

// Basic query
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['leads', filtros],
  queryFn: () => n8nGet('crm-leads-admin', { es_simulacion: scope.getFilterValue() }),
  staleTime: 60_000, // Override default if needed
});
```

### Writing Data: `useMutation`

```jsx
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { n8nPost } from '../../../shared/hooks/useN8n';

function MiComponente({ leadId }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body) => n8nPost('crm-update-lead', body),
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      // Handle error
      console.error('Update failed:', error);
    },
  });

  const handleSave = () => {
    mutation.mutate({ id: leadId, estado: 'vendido' });
  };

  return (
    <button onClick={handleSave} disabled={mutation.isPending}>
      {mutation.isPending ? 'Guardando...' : 'Guardar'}
    </button>
  );
}
```

## Query Keys Convention

Use descriptive, hierarchical keys:

| Data | Query Key |
|------|-----------|
| Leads list | `['leads']` or `['leads', filtros]` |
| Single lead | `['lead', leadId]` |
| Cliente timeline | `['cliente-timeline', clienteId]` |
| Operadores | `['operadores-activos']` |
| Agenda | `['agenda', fecha]` |

## Cache Invalidation Strategy

### On Mutations

Always invalidate the parent query key after a successful mutation:

```jsx
// After creating a lead
queryClient.invalidateQueries({ queryKey: ['leads'] });

// After updating a cliente's interaction
queryClient.invalidateQueries({ queryKey: ['cliente-timeline', clienteId] });

// After deleting something
queryClient.invalidateQueries({ queryKey: ['auditoria-llamadas'] });
```

### On Navigation

React Query caches data automatically. When a user navigates away and comes back, cached data is shown immediately (no loading state) while a background refetch happens.

To force a refetch when the component mounts, use `enabled: true` and rely on `staleTime`.

## Common Mistakes to Avoid

### ❌ Don't create new query keys dynamically without cleanup

```jsx
// BAD: creates new query key on every render if `id` is an object
queryKey: ['lead', { id: lead.id, timestamp: Date.now() }]

// GOOD: stable key
queryKey: ['lead', lead.id]
```

### ❌ Don't forget to handle `undefined` data

```jsx
// BAD: crashes if data is undefined
const leads = data.leads.map(l => l.id);

// GOOD: handle undefined
const leads = data?.leads ?? [];
```

### ❌ Don't use `useState` + `useEffect` + `fetch` for server data

```jsx
// BAD: manual fetch pattern
const [data, setData] = useState(null);
useEffect(() => {
  fetch(url).then(r => r.json()).then(setData);
}, []);

// GOOD: React Query
const { data } = useQuery({
  queryKey: ['resource'],
  queryFn: () => fetch(url).then(r => r.json()),
});
```

### ❌ Don't over-fetch with very short `staleTime`

- Default `staleTime`: 30 seconds
- Frequent data (e.g., KPIs): 10-15 seconds
- Static data: 5+ minutes or `Infinity`

## Adding a New Query

1. Identify the n8n webhook path (e.g., `crm-get-leads`)
2. Choose a query key following the convention
3. Wrap the fetch call with `n8nGet` or `n8nPost`
4. Add `staleTime` if different from default
5. Use the returned `data`, `isLoading`, `error` in your render

## Adding a New Mutation

1. Identify the n8n webhook path (e.g., `crm-update-lead`)
2. Use `useMutation` with `mutationFn` calling `n8nPost`
3. In `onSuccess`, call `queryClient.invalidateQueries()` for affected queries
4. Handle errors in `onError`
5. Use `mutation.isPending` to show loading state

## API Helpers (api.js)

These are thin wrappers around `n8nGet`/`n8nPost` for cleaner code:

```js
import { apiGet, apiPost, apiPatch, apiDelete } from '../query/api';

// GET
const data = await apiGet('crm-get-leads', { estado: 'pendiente' });

// POST
const result = await apiPost('crm-create-lead', { nombre: 'Test', telefono: '123' });

// PATCH
await apiPatch('crm-update-lead', { id: 1, estado: 'vendido' });

// DELETE
await apiDelete('crm-lead-borrar', { id: 1 });
```

Note: These are used internally by `n8nGet`/`n8nPost`. Prefer using the hooks `useN8nQuery`/`useN8nMutation` from `useN8n.js` for React components.
