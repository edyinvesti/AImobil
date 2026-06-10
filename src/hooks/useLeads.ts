// src/hooks/useLeads.ts
// Hook de leads com React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface Lead {
  id: number;
  name: string;
  phone: string;
  interest?: string;
  notes?: string;
  score?: number;
  status?: string;
  date?: string;
  potential_value?: number;
  property_id?: number;
  last_contacted?: string;
  created_at?: number;
}

// Query Keys
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: number) => [...leadKeys.details(), id] as const,
  byStatus: (status: string) => [...leadKeys.all, 'status', status] as const,
};

// Hook para listar leads
export function useLeads() {
  return useQuery({
    queryKey: leadKeys.lists(),
    queryFn: () => api.get<Lead[]>('/api/leads'),
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para buscar lead por ID
export function useLead(id: number) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: () => api.get<Lead>(`/api/leads/${id}`),
    enabled: !!id,
  });
}

// Hook para criar lead
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lead: Partial<Lead>) => 
      api.post<{ id: number }>('/api/leads', lead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

// Hook para atualizar lead
export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...lead }: Partial<Lead> & { id: number }) => 
      api.put<{ id: number }>(`/api/leads/${id}`, lead),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.id) });
    },
  });
}

// Hook para deletar lead
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => 
      api.delete<{ success: boolean }>(`/api/leads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
    },
  });
}

// Hook para atualizar score do lead
export function useUpdateLeadScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, score }: { id: number; score: number }) => 
      api.put<{ id: number; score: number }>(`/api/leads/${id}/score`, { score }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.id) });
    },
  });
}

// Hook para atualizar status do lead
export function useUpdateLeadStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => 
      api.put<{ id: number; status: string }>(`/api/leads/${id}/status`, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: leadKeys.all });
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.byStatus(variables.status) });
    },
  });
}

// Hook para buscar leads por status
export function useLeadsByStatus(status: string) {
  return useQuery({
    queryKey: leadKeys.byStatus(status),
    queryFn: () => api.get<Lead[]>(`/api/leads/status/${status}`),
    enabled: !!status,
  });
}

export type { Lead };
export default useLeads;
