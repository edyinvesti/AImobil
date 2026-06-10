# Shard 5: Frontend React Query

> **Source:** fullstack-architecture.md §5.4  
> **For:** @sm, @dev

---

## Problema Atual

- React Query instalado mas não usado
- `useProperties.ts` é um "god hook" (507 linhas) com fetch manual
- Data fetching com useState + useEffect
- Cache manual via localStorage

## Solução

### API Service

```typescript
// src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10002';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('iamobil_token');
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  post: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
```

### Properties Hook (React Query)

```typescript
// src/hooks/useProperties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Property } from '../types';

export function useProperties(creci: string) {
  const queryClient = useQueryClient();

  const { data: properties = [], isLoading, error } = useQuery<Property[]>({
    queryKey: ['properties', creci],
    queryFn: () => api.get(`/properties?creci=${creci}`),
    staleTime: 30_000,
    retry: 2,
  });

  const createProperty = useMutation({
    mutationFn: (data: Partial<Property>) => api.post('/properties', data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  const deleteProperty = useMutation({
    mutationFn: (id: string) => api.delete(`/properties/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['properties'] }),
  });

  return { properties, isLoading, error, createProperty, deleteProperty };
}
```

### Leads Hook (React Query)

```typescript
// src/hooks/useLeads.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useLeads(creci: string) {
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', creci],
    queryFn: () => api.get(`/leads?creci=${creci}`),
    refetchInterval: 30_000,
  });

  return { leads, isLoading };
}
```

### Campaigns Hook (React Query)

```typescript
// src/hooks/useCampaigns.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useCampaigns(creci: string) {
  const queryClient = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', creci],
    queryFn: () => api.get(`/campaigns/list?creci=${creci}`),
  });

  const deleteCampaign = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['campaigns'] }),
  });

  return { campaigns, isLoading, deleteCampaign };
}
```

### Tarefas

- [ ] Criar `src/services/api.ts`
- [ ] Criar `src/hooks/useAuth.ts`
- [ ] Refatorar `src/hooks/useProperties.ts` para React Query
- [ ] Refatorar `src/hooks/useLeads.ts` para React Query
- [ ] Criar `src/hooks/useCampaigns.ts`
- [ ] Remover fetch manual de todos os componentes
- [ ] Atualizar componentes para usar novos hooks

---

*Shard 5: Frontend React Query — IAmobil Architecture*
