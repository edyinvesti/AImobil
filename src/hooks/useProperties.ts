import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Property } from '../types';
import { getApiUrl } from '../utils';
import { syncQueue } from '../sync-queue';

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

export interface SyncStatus {
  syncing: boolean;
  lastSync: number | null;
  error: string | null;
}

const API_BASE = getApiUrl();

async function fetchProperties(login: string): Promise<Property[]> {
  const url = `${API_BASE}/api/partner/properties?login=${encodeURIComponent(login)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erro na API: ' + res.status);
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Falha na operação da API');
  if (!Array.isArray(data.properties)) throw new Error('Formato inválido');
  const deletedIds = new Set<string>();
  try {
    const dIds = JSON.parse(localStorage.getItem('iamobil_deleted_ids') || '[]');
    if (Array.isArray(dIds)) dIds.forEach((id: string) => deletedIds.add(String(id)));
  } catch { /* ignore */ }
  return data.properties
    .filter((p: RawPropertyInput) => p && typeof p === 'object')
    .filter((p: RawPropertyInput) => !deletedIds.has(p.id || '') && !(typeof p.id === 'string' && p.id.includes('prop_migrated')))
    .map(normalizeProperty)
    .filter((p: Property | undefined): p is Property => !!p);
}

function loadLocalProperties(): Property[] {
  const saved = localStorage.getItem('iamobil_properties');
  if (saved) {
    try {
      const raw = JSON.parse(saved) as RawPropertyInput[];
      return raw.map(normalizeProperty).filter((p): p is Property => !!p);
    } catch { /* ignore */ }
  }
  return [];
}

function saveLocalProperties(props: Property[]) {
  try { localStorage.setItem('iamobil_properties', JSON.stringify(props)); } catch { /* quota */ }
}

function loadFromIndexedDB(): Promise<Property[]> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('iamobil', 1);
      req.onsuccess = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('properties')) { db.close(); resolve([]); return; }
        const tx = db.transaction('properties', 'readonly');
        const getAll = tx.objectStore('properties').getAll();
        getAll.onsuccess = () => { resolve((getAll.result || []).map(normalizeProperty)); db.close(); };
        getAll.onerror = () => { db.close(); resolve([]); };
      };
      req.onerror = () => resolve([]);
    } catch { resolve([]); }
  });
}

function saveToIndexedDB(props: Property[]) {
  try {
    const req = indexedDB.open('iamobil', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('properties')) db.createObjectStore('properties', { keyPath: 'id' });
    };
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('properties', 'readwrite');
      const store = tx.objectStore('properties');
      props.forEach(p => store.put(p));
      tx.oncomplete = () => db.close();
    };
  } catch { /* idb unavailable */ }
}

export function useProperties(baseLogin?: string) {
  const queryClient = useQueryClient();
  const loginRef = useRef(baseLogin);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ syncing: false, lastSync: null, error: null });
  const [localProps, setLocalProps] = useState<Property[]>(() => loadLocalProperties());
  const [initialLoading, setInitialLoading] = useState(true);

  const resolvedLogin = baseLogin || (() => {
    try {
      const p = JSON.parse(localStorage.getItem('iamobil_profile') || '{}');
      return p.login || '';
    } catch { return ''; }
  })();

  useEffect(() => { loginRef.current = resolvedLogin; }, [resolvedLogin]);

  useEffect(() => {
    if (!resolvedLogin) { setInitialLoading(false); return; }
    const cloudCount = localProps.filter(p => p.remoteId).length;
    if (cloudCount === 0) {
      loadFromIndexedDB().then(idbProps => {
        if (idbProps.length > 0) {
          setLocalProps(idbProps);
          saveLocalProperties(idbProps);
        }
        setInitialLoading(false);
      });
    } else {
      setInitialLoading(false);
    }
  }, []);

  const { data: cloudProperties = [], isLoading: queryLoading, isError, error, refetch } = useQuery({
    queryKey: ['properties', resolvedLogin],
    queryFn: () => fetchProperties(resolvedLogin),
    enabled: !!resolvedLogin,
    staleTime: 30000,
  });

  useEffect(() => {
    if (cloudProperties.length > 0 && resolvedLogin) {
      const cloudIds = new Set(cloudProperties.map(p => p.id));
      const merged = [...cloudProperties];
      localProps.forEach(lp => {
        if (!lp.remoteId && !cloudIds.has(lp.id)) {
          merged.push(lp);
        }
      });
      setLocalProps(merged);
      saveLocalProperties(merged);
      saveToIndexedDB(merged);
      setSyncStatus(prev => prev.error ? { syncing: false, lastSync: Date.now(), error: null } : prev);
    }
  }, [cloudProperties, resolvedLogin]);

  useEffect(() => {
    if (isError && error) {
      setSyncStatus(prev => ({ ...prev, syncing: false, error: error.message }));
    }
  }, [isError, error]);

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
    onMutate: async ({ property }) => {
      setLocalProps(prev => {
        const exists = prev.find(p => p.id === property.id);
        const updated = exists
          ? prev.map(p => p.id === property.id ? property : p)
          : [{ ...property, remoteStatus: 'pending' as const }, ...prev];
        saveLocalProperties(updated);
        return updated;
      });
      setSyncStatus(prev => ({ ...prev, syncing: true }));
    },
    onSuccess: (data, { property }) => {
      setLocalProps(prev => {
        const updated = prev.map(p =>
          p.id === property.id
            ? { ...p, id: data.propertyId, remoteId: data.propertyId, remoteStatus: 'approved' as const }
            : p
        );
        saveLocalProperties(updated);
        return updated;
      });
      setSyncStatus({ syncing: false, lastSync: Date.now(), error: null });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (err: Error, { property }) => {
      console.error('Erro ao salvar:', err);
      setSyncStatus({ syncing: false, lastSync: null, error: err.message });
      syncQueue.enqueue({
        type: 'create',
        endpoint: '/api/partner/properties',
        method: 'POST',
        body: property
      });
    },
  });

  const deleteProperty = useCallback((id: string) => {
    const propertyToDelete = localProps.find(p => p.id === id);
    if (!propertyToDelete) return;

    setLocalProps(prev => {
      const updated = prev.filter(p => p.id !== id);
      saveLocalProperties(updated);
      return updated;
    });

    const deletedIds: string[] = JSON.parse(localStorage.getItem('iamobil_deleted_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('iamobil_deleted_ids', JSON.stringify(deletedIds));
    }

    const targetId = propertyToDelete.remoteId || propertyToDelete.id;
    fetch(`${API_BASE}/api/partner/properties?id=${targetId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      })
      .catch(e => {
        console.error('Erro ao deletar da nuvem:', e);
        setLocalProps(prev => {
          const restored = [...prev, propertyToDelete];
          saveLocalProperties(restored);
          return restored;
        });
        syncQueue.enqueue({
          type: 'delete',
          endpoint: `/api/partner/properties?id=${targetId}`,
          method: 'DELETE'
        });
      });
  }, [localProps, queryClient]);

  useEffect(() => {
    const interval = setInterval(() => {
      const pendingIds = localProps
        .filter(p => p.remoteId && p.remoteStatus !== 'approved' && p.remoteStatus !== 'rejected')
        .map(p => p.remoteId);
      if (pendingIds.length === 0) return;
      fetch(`${API_BASE}/api/partner/properties/status?ids=${pendingIds.join(',')}`)
        .then(r => r.ok && r.json())
        .then(({ statuses }) => {
          if (!statuses) return;
          setLocalProps(prev => {
            let changed = false;
            const updated = prev.map(p => {
              if (p.remoteId && statuses[p.remoteId] && statuses[p.remoteId] !== p.remoteStatus) {
                changed = true;
                return { ...p, remoteStatus: statuses[p.remoteId] };
              }
              return p;
            });
            if (changed) saveLocalProperties(updated);
            return updated;
          });
        })
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [localProps]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) refetch();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refetch]);

  const forceSync = useCallback(() => {
    localStorage.removeItem('iamobil_properties');
    localStorage.removeItem('iamobil_deleted_ids');
    window.location.reload();
  }, []);

  const handleSaveProperty = useCallback(async (property: Property, profile: { name: string; login: string }) => {
    await savePropertyMutation.mutateAsync({ property, profile });
  }, [savePropertyMutation]);

  return {
    properties: localProps,
    loading: initialLoading || queryLoading,
    syncStatus,
    saveProperty: handleSaveProperty,
    deleteProperty,
    forceSync,
    setProperties: (props: Property[]) => {
      setLocalProps(props);
      saveLocalProperties(props);
    }
  };
}
