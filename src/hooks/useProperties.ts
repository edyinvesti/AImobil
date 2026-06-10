// src/hooks/useProperties.ts
// Hook de imóveis com React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Property } from '../types';

// Query Keys
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...propertyKeys.lists(), filters] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
};

// Hook para listar imóveis
export function useProperties(filters?: Record<string, unknown>) {
  return useQuery({
    queryKey: filters ? propertyKeys.list(filters) : propertyKeys.lists(),
    queryFn: () => api.get<Property[]>('/api/properties'),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

// Hook para buscar imóvel por ID
export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => api.get<Property>(`/api/properties/${id}`),
    enabled: !!id,
  });
}

// Hook para criar imóvel
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (property: Partial<Property>) => 
      api.post<{ id: string }>('/api/properties', property),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

// Hook para atualizar imóvel
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...property }: Partial<Property> & { id: string }) => 
      api.put<{ id: string }>(`/api/properties/${id}`, property),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
      queryClient.invalidateQueries({ queryKey: propertyKeys.detail(variables.id) });
    },
  });
}

// Hook para deletar imóvel
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      api.delete<{ success: boolean }>(`/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: propertyKeys.all });
    },
  });
}

// Hook para buscar imóveis por corretor
export function usePropertiesByBroker(creci: string) {
  return useQuery({
    queryKey: propertyKeys.list({ broker: creci }),
    queryFn: () => api.get<Property[]>(`/api/properties/broker/${creci}`),
    enabled: !!creci,
  });
}

// Hook para buscar imóveis
export function useSearchProperties(filters: Record<string, unknown>) {
  return useQuery({
    queryKey: propertyKeys.list(filters),
    queryFn: () => {
      const params = new URLSearchParams(filters as Record<string, string>);
      return api.get<Property[]>(`/api/properties/search?${params.toString()}`);
    },
    enabled: Object.values(filters).some(v => v !== undefined && v !== ''),
  });
}

export default useProperties;
