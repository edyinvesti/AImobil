import { useQuery, useMutation } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { Property } from '../types';
import { getApiUrl } from '../utils';

interface RawPropertyInput {
  id?: string;
  size?: number;
  address?: string;
  images?: string[] | string;
  [key: string]: unknown;
}

function normalizeProperty(p: RawPropertyInput): Property {
  if (!p || typeof p !== 'object') {
    return { id: Math.random().toString(36).substring(2), title: 'Item Inválido', images: [] } as any;
  }
  const imgs = (() => {
    let imgs: string[] = [];
    if (Array.isArray(p.images)) imgs = p.images;
    else if (typeof p.images === 'string') { try { imgs = JSON.parse(p.images); } catch { imgs = []; } }
    return imgs;
  })();

  return {
    ...p,
    id: p.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2)),
    size: p.size ?? 0,
    address: p.address ?? '',
    images: imgs,
    thumbnail: p.thumbnail || (imgs.length > 0 ? imgs[0] : undefined)
  } as Property;
}

const API_BASE = getApiUrl();

async function fetchProperties(login: string): Promise<Property[]> {
  const url = `${API_BASE}/api/partner/properties?login=${encodeURIComponent(login)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro na API: ' + res.status);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Falha na operação da API');
  if (!Array.isArray(data.properties)) throw new Error('Formato inválido');
  return data.properties
    .filter((p: RawPropertyInput) => p && typeof p === 'object')
    .map(normalizeProperty)
    .filter((p: Property | undefined): p is Property => !!p);
}

export function useProperties(baseLogin?: string) {
  const resolvedLogin = baseLogin || (() => {
    try {
      const p = JSON.parse(localStorage.getItem('iamobil_profile') || '{}');
      return p.login || '';
    } catch { return ''; }
  })();

  const { data: properties = [], isLoading, refetch } = useQuery({
    queryKey: ['properties', resolvedLogin],
    queryFn: () => fetchProperties(resolvedLogin),
    enabled: !!resolvedLogin,
  });

  const uploadImage = async (img: string): Promise<string> => {
    if (!img.startsWith('data:')) return img;
    try {
      const r = await fetch(`${API_BASE}/api/properties/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img })
      });
      const d = await r.json();
      return d.url || img;
    } catch { return img; }
  };

  const savePropertyMutation = useMutation({
    mutationFn: async ({ property, profile }: { property: Property; profile: { name: string; login: string } }) => {
      let prop = { ...property };
      if (prop.images?.length > 0) {
        const uploaded = await Promise.all(prop.images.map(uploadImage));
        prop = { ...prop, images: uploaded };
        if (prop.thumbnail?.startsWith('data:')) {
          prop.thumbnail = await uploadImage(prop.thumbnail);
        }
      }
      const res = await fetch(`${API_BASE}/api/partner/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...prop, brokerName: profile.name, brokerLogin: profile.login })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    },
    onSuccess: () => {
      refetch();
    },
    onError: (err: Error) => {
      console.error('Erro ao salvar:', err);
    },
  });

  const deleteProperty = useCallback((id: string) => {
    fetch(`${API_BASE}/api/partner/properties?id=${id}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        refetch();
      })
      .catch(e => console.error('Erro ao deletar:', e));
  }, [refetch]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) refetch();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetch]);

  return {
    properties,
    loading: isLoading,
    saveProperty: async (property: Property, profile: { name: string; login: string }) => {
      await savePropertyMutation.mutateAsync({ property, profile });
    },
    deleteProperty,
  };
}
