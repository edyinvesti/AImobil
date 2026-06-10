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

export function useProperties(baseCreci?: string) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    syncing: false,
    lastSync: null,
    error: null
  });
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  const propertiesRef = useRef<Property[]>(properties);

  useEffect(() => { propertiesRef.current = properties; });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let localProps: Property[] = [];
     const savedProperties = localStorage.getItem('iamobil_properties');
          if (savedProperties) {
            try {
              const rawProps = JSON.parse(savedProperties) as RawPropertyInput[];
              localProps = rawProps.map(normalizeProperty).filter((p): p is Property => !!p);
              setProperties(localProps);
    if (localProps.length === 0) {
      try {
        const dbReq = indexedDB.open('iamobil', 1);
        dbReq.onsuccess = () => {
          const db = dbReq.result;
          if (!db.objectStoreNames.contains('properties')) { db.close(); return; }
          const tx = db.transaction('properties', 'readonly');
          const store = tx.objectStore('properties');
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            if (getAll.result?.length > 0) {
              setProperties(getAll.result.map(normalizeProperty));
            }
            db.close();
          };
        };
      } catch(e) { console.warn("IndexedDB recovery failed:", e); }
    }
            } catch (e) {
              console.error("Erro ao carregar os dados do localStorage:", e);
            }
          }
    
    const fetchCloudData = async () => {
      let creci = baseCreci;
      let name = '';

      if (!creci) {
        const savedProfile = localStorage.getItem('iamobil_profile');
        if (savedProfile) {
          try {
            const profileData = JSON.parse(savedProfile);
            creci = profileData.login || profileData.creci;
            name = profileData.name;
          } catch(e) {
            console.error("Erro ao ler perfil do localStorage:", e);
          }
        }
      }

      if (!creci) {
        setLoading(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setSyncStatus(prev => ({ ...prev, syncing: true, error: null }));
      const API_BASE = getApiUrl();
      
       try {
         const url = `${API_BASE}/api/partner/properties?login=${encodeURIComponent(creci)}`;
         const res = await fetch(url, {
           signal: abortControllerRef.current.signal
         });
         
         if (res.ok) {
           const data = await res.json();
           
           if (!data || typeof data !== 'object') {
             throw new Error('Resposta da API inválida');
           }
           
           if (!data.success) {
             throw new Error(data.message || 'Falha na operação da API');
           }
           
           if (!Array.isArray(data.properties)) {
             throw new Error('Formato de propriedades inválido na resposta');
           }
           
           const deletedIds = new Set<string>(JSON.parse(localStorage.getItem('iamobil_deleted_ids') || '[]'));
           const cloudItems = data.properties
             .filter((p: RawPropertyInput): p is RawPropertyInput => {
               return p && typeof p === 'object';
             })
             .filter((p: RawPropertyInput) => {
               const isDeleted = deletedIds.has(p.id || '');
               const isMigrated = typeof p.id === 'string' && p.id.includes("prop_migrated");
               return !isDeleted && !isMigrated;
             })
             .map(normalizeProperty)
             .filter((p): p is Property => !!p);

           const cloudIds = new Set(cloudItems.map((p: Property) => p.id));
           
           const merged = [...cloudItems];
           const localOnly: Property[] = [];
           
           localProps.forEach(lp => {
             if (!lp.remoteId) {
               if (!cloudIds.has(lp.id)) {
                 merged.push(lp);
                 localOnly.push(lp);
               }
             }
           });
           
           if (isMountedRef.current) {
             setProperties(merged);
             try {
               localStorage.setItem('iamobil_properties', JSON.stringify(merged));
             } catch (storageError) {
               console.warn("Falha ao salvar no localStorage:", storageError);
            }
              setSyncStatus({ syncing: false, lastSync: Date.now(), error: null });
            try {
              const dbReq = indexedDB.open('iamobil', 1);
              dbReq.onupgradeneeded = () => {
                const db = dbReq.result;
                if (!db.objectStoreNames.contains('properties')) {
                  db.createObjectStore('properties', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('profile')) {
                  db.createObjectStore('profile', { keyPath: 'id' });
                }
              };
              dbReq.onsuccess = () => {
                const db = dbReq.result;
                const tx = db.transaction('properties', 'readwrite');
                const store = tx.objectStore('properties');
                merged.forEach(p => store.put(p));
                tx.oncomplete = () => db.close();
              };
               dbReq.onerror = () => { console.warn('[IDB] Open error'); };
            } catch(e) { console.warn('[IDB] Not available:', e); }
            }
    
            if (localOnly.length > 0 && name && isMountedRef.current) {
              for (const prop of localOnly) {
                try {
                  let imgProp = { ...prop };
                  if (imgProp.images?.length > 0) {
                    const uploadedUrls = await Promise.all(imgProp.images.map(async (img) => {
                      if (img.startsWith('data:')) {
                        try {
                          const r = await fetch(`${API_BASE}/api/properties/upload-image`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image: img })
                          });
                          const d = await r.json();
                          return d.url || img;
                        } catch { console.warn('[IDB] Upload failed, using base64'); return img; }
                      }
                      return img;
                    }));
                    imgProp.images = uploadedUrls;
                  }
                  await fetch(`${API_BASE}/api/partner/properties`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...imgProp, brokerName: name, brokerCreci: creci })
                  });
                } catch (e) {
                  console.error("Erro ao sincronizar propriedade local:", e);
                }
              }
           }
         } else {
           let errorMessage = 'Erro na API: ' + res.status;
           if (res.status === 401) {
             errorMessage = 'Não autorizado - verifique suas credenciais';
           } else if (res.status === 403) {
             errorMessage = 'Acesso negado';
           } else if (res.status >= 500) {
             errorMessage = 'Erro interno do servidor';
           }
           
           if (isMountedRef.current) {
             setSyncStatus({ syncing: false, lastSync: null, error: errorMessage });
           }
         }
       } catch(e: unknown) {
          const err = e as Error;
          if (err.name !== 'AbortError') {
           console.error('[useProperties] Erro na busca de dados:', e);
           if (isMountedRef.current) {
             setSyncStatus({ 
               syncing: false, 
               lastSync: null, 
                error: err.message || 'Erro de conexão' 
             });
           }
         }
       } finally {
         if (isMountedRef.current) {
           setLoading(false);
         }
       }
     };
     
     fetchCloudData();
  }, [baseCreci]);

  const saveProperties = useCallback((newProperties: Property[]) => {
    try {
      setProperties(newProperties);
      localStorage.setItem('iamobil_properties', JSON.stringify(newProperties));
    } catch (e) {
      console.warn("Storage quota exceeded", e);
      setProperties(newProperties);
    }
  }, []);

  const handleSaveProperty = useCallback(async (property: Property, profile: { name: string; login: string }) => {
    const prevSnapshot = propertiesRef.current;
    setProperties(prev => {
      const exists = prev.find(p => p.id === property.id);
      let updated: Property[];
      if (exists) {
        updated = prev.map(p => p.id === property.id ? property : p);
      } else {
        const newProp: Property = { ...property, remoteStatus: 'pending' };
        updated = [newProp, ...prev];
      }
      return updated;
    });
    
    setSyncStatus(prev => ({ ...prev, syncing: true }));
    
    const API_BASE = getApiUrl();
    if (!API_BASE) {
      setSyncStatus({ syncing: false, lastSync: null, error: 'API não configurada' });
      return;
    }
    
    try {
      let prop = { ...property };
      if (prop.images?.length > 0) {
        const uploaded = await Promise.all(prop.images.map(async (img) => {
          if (img.startsWith('data:')) {
            try {
              const res = await fetch(`${API_BASE}/api/properties/upload-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: img })
              });
              const data = await res.json();
              return data.url || img;
            } catch {
              console.warn('Image upload failed, using base64');
              return img;
            }
          }
          return img;
        }));
        prop = { ...prop, images: uploaded };
        if (prop.thumbnail?.startsWith('data:')) {
          try {
            const res = await fetch(`${API_BASE}/api/properties/upload-image`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: prop.thumbnail })
            });
            const data = await res.json();
            prop.thumbnail = data.url || prop.thumbnail;
          } catch { console.warn('Thumbnail upload failed'); }
        }
      }
      const response = await fetch(`${API_BASE}/api/partner/properties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prop,
          brokerName: profile.name,
          brokerCreci: profile.login
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setProperties(prev => {
          const updated = prev.map(p =>
            p.id === property.id
              ? { ...p, id: data.propertyId, remoteId: data.propertyId, remoteStatus: 'approved' as const }
              : p
          );
          try { localStorage.setItem('iamobil_properties', JSON.stringify(updated)); } catch { console.warn('Failed to persist after save'); }
          return updated;
        });
        setSyncStatus({ syncing: false, lastSync: Date.now(), error: null });
      } else {
        setProperties(prevSnapshot);
        try { localStorage.setItem('iamobil_properties', JSON.stringify(prevSnapshot)); } catch {}
        setSyncStatus({ syncing: false, lastSync: null, error: 'Erro ao salvar na nuvem' });
      }
    } catch (e: unknown) {
      console.error("Erro na integração:", e);
      setProperties(prevSnapshot);
      try { localStorage.setItem('iamobil_properties', JSON.stringify(prevSnapshot)); } catch {}
      setSyncStatus({ syncing: false, lastSync: null, error: 'Erro de conexão' });
      syncQueue.enqueue({
        type: 'create',
        endpoint: '/api/partner/properties',
        method: 'POST',
        body: {
          ...property,
          brokerName: profile.name,
              brokerCreci: profile.login
            }
          });
        }
  }, []);

  const deleteProperty = useCallback((id: string) => {
    const propertyToDelete = properties.find(p => p.id === id);
    if (!propertyToDelete) return;
    const prevSnapshot = propertiesRef.current;
    saveProperties(prevSnapshot.filter(p => p.id !== id));

    const deletedIds: string[] = JSON.parse(localStorage.getItem('iamobil_deleted_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('iamobil_deleted_ids', JSON.stringify(deletedIds));
    }

    (async () => {
      const API_BASE = getApiUrl();
      if (!API_BASE) return;
      const targetId = propertyToDelete.remoteId || propertyToDelete.id;
      try {
        const res = await fetch(`${API_BASE}/api/partner/properties?id=${targetId}`, {
          method: "DELETE"
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
      } catch (e) {
        console.error("Erro ao deletar da nuvem:", e);
        setProperties(prevSnapshot);
        try { localStorage.setItem('iamobil_properties', JSON.stringify(prevSnapshot)); } catch {}
        const rollbackIds: string[] = JSON.parse(localStorage.getItem('iamobil_deleted_ids') || '[]').filter((did: string) => did !== id);
        localStorage.setItem('iamobil_deleted_ids', JSON.stringify(rollbackIds));
        syncQueue.enqueue({
          type: 'delete',
          endpoint: `/api/partner/properties?id=${targetId}`,
          method: 'DELETE'
        });
      }
    })();
  }, [properties, saveProperties]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const pendingIds = properties
      .filter(p => p.remoteId && p.remoteStatus !== 'approved' && p.remoteStatus !== 'rejected')
      .map(p => p.remoteId);

    if (pendingIds.length === 0) return;

    const checkStatuses = async () => {
      const API_BASE = getApiUrl();
      if (!API_BASE) return;
      
      try {
        const res = await fetch(`${API_BASE}/api/partner/properties/status?ids=${pendingIds.join(',')}`);
        if (res.ok) {
          const { statuses } = await res.json();
          setProperties(prev => {
            let changed = false;
            const updated = prev.map(p => {
              if (p.remoteId && statuses[p.remoteId] && statuses[p.remoteId] !== p.remoteStatus) {
                changed = true;
                return { ...p, remoteStatus: statuses[p.remoteId] };
              }
              return p;
            });
            if (changed) {
              localStorage.setItem('iamobil_properties', JSON.stringify(updated));
            }
            return updated;
          });
        }
      } catch (err) { console.warn('Status polling failed:', err); }
    };

    checkStatuses();
    intervalRef.current = setInterval(checkStatuses, 60000);
    
    const handleVisibility = () => {
      if (!document.hidden) checkStatuses();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const forceSync = useCallback(() => {
    localStorage.removeItem('iamobil_properties');
    localStorage.removeItem('iamobil_deleted_ids');
    window.location.reload();
  }, []);

  return {
    properties,
    loading,
    syncStatus,
    saveProperty: handleSaveProperty,
    deleteProperty,
    forceSync,
    setProperties: saveProperties
  };
}
