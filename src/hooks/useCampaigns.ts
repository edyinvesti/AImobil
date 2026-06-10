// src/hooks/useCampaigns.ts
// Hook de campanhas com React Query

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

interface Campaign {
  id: string;
  property_id: string;
  property_title: string;
  instagram_status?: string;
  instagram_post_id?: string;
  instagram_url?: string;
  campaign_status?: string;
  campaign_id?: string;
  has_carousel?: boolean;
  created_at?: number;
}

// Query Keys
export const campaignKeys = {
  all: ['campaigns'] as const,
  lists: () => [...campaignKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...campaignKeys.lists(), filters] as const,
  details: () => [...campaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...campaignKeys.details(), id] as const,
};

// Hook para listar campanhas
export function useCampaigns() {
  return useQuery({
    queryKey: campaignKeys.lists(),
    queryFn: () => api.get<Campaign[]>('/api/marketing/campaigns'),
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para buscar campanha por ID
export function useCampaign(id: string) {
  return useQuery({
    queryKey: campaignKeys.detail(id),
    queryFn: () => api.get<Campaign>(`/api/marketing/campaigns/${id}`),
    enabled: !!id,
  });
}

// Hook para criar campanha
export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (campaign: Partial<Campaign>) => 
      api.post<{ id: string }>('/api/marketing/campaigns', campaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// Hook para deletar campanha
export function useDeleteCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => 
      api.delete<{ success: boolean }>(`/api/marketing/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// Hook para postar no Instagram
export function usePostToInstagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ propertyId, ...options }: { propertyId: string; [key: string]: unknown }) => 
      api.post<{ postId: string; url: string }>('/api/marketing/instagram/post', { property_id: propertyId, ...options }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// Hook para deletar post do Instagram
export function useDeleteInstagramPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => 
      api.delete<{ success: boolean }>(`/api/marketing/instagram/${postId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
    },
  });
}

// Hook para status do marketing
export function useMarketingStatus() {
  return useQuery({
    queryKey: [...campaignKeys.all, 'status'],
    queryFn: () => api.get<{ instagramConfigured: boolean; metaAdsConfigured: boolean; geminiConfigured: boolean }>('/api/marketing/status'),
    staleTime: 10 * 60 * 1000,
  });
}

export type { Campaign };
export default useCampaigns;
