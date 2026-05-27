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
              // Validate and normalize local properties
              localProps = rawProps.map(normalizeProperty).filter((p): p is Property => !!p);
              setProperties(localProps);
            } catch (e) {
              console.error("Erro ao carregar os dados do localStorage:", e);
              // Continue with empty array if localStorage is corrupted
            }
          }
    
    const fetchCloudData = async () => {
      // Use baseCreci if provided, otherwise try localStorage
      let creci = baseCreci;
      let name = '';

      if (!creci) {
        const savedProfile = localStorage.getItem('iamobil_profile');
        if (savedProfile) {
          try {
            const profileData = JSON.parse(savedProfile);
            creci = profileData.creci;
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
         const url = `${API_BASE}/api/partner/properties?creci=${encodeURIComponent(creci)}`;
         console.log('[useProperties] Fetching:', url);
         const res = await fetch(url, {
           signal: abortControllerRef.current.signal
         });
         
         console.log('[useProperties] Status:', res.status);
         if (res.ok) {
           const data = await res.json();
           console.log('[useProperties] Data success:', data.success, 'Count:', data.count);
           
           // Validate API response structure
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
               // Basic validation of property input
               return p && typeof p === 'object';
             })
             .filter((p: RawPropertyInput) => {
               const isDeleted = deletedIds.has(p.id || '');
               const isMigrated = typeof p.id === 'string' && p.id.includes("prop_migrated");
               if (isDeleted) {
                 console.log('[useProperties] Filtered out deleted ID:', p.id);
               }
               if (isMigrated) {
                 console.log('[useProperties] Filtered out migrated ID:', p.id);
               }
               return !isDeleted && !isMigrated;
             })
             .map(normalizeProperty)
             .filter((p): p is Property => !!p); // Filter out any invalid normalized properties

           console.log('[useProperties] Cloud items after filter:', cloudItems.length);
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
           
           console.log('[useProperties] Final merged properties:', merged.length);
           
           // Only update state and storage if component is still mounted
           if (isMountedRef.current) {
             setProperties(merged);
             try {
               localStorage.setItem('iamobil_properties', JSON.stringify(merged));
             } catch (storageError) {
               console.warn("Falha ao salvar no localStorage (possivelmente quota excedida):", storageError);
               // Continue anyway - we have the data in state
             }
             setSyncStatus({ syncing: false, lastSync: Date.now(), error: null });
           }
   
           if (localOnly.length > 0 && name && isMountedRef.current) {
             for (const prop of localOnly) {
               try {
                 await fetch(`${API_BASE}/api/partner/properties`, {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ ...prop, brokerName: name, brokerCreci: creci })
                 });
               } catch (e) {
                 console.error("Erro ao sincronizar propriedade local:", e);
                 // Continue with other properties
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
       } catch(e: any) {
         if (e.name !== 'AbortError') {
           console.error('[useProperties] Erro na busca de dados:', e);
           if (isMountedRef.current) {
             setSyncStatus({ 
               syncing: false, 
               lastSync: null, 
               error: e.message || 'Erro de conexão' 
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

  const handleSaveProperty = useCallback(async (property: Property, profile: { name: string, creci: string }) => {
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
    
    (async () => {
        const API_BASE = getApiUrl();
        if (!API_BASE) {
          setSyncStatus({ syncing: false, lastSync: null, error: 'API não configurada' });
          return;
        }
        
        try {
          const response = await fetch(`${API_BASE}/api/partner/properties`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...property,
              brokerName: profile.name,
              brokerCreci: profile.creci
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            setProperties(prev => {
              // Update with remoteId so card shows 'Hub' instead of 'Syncing'
              const updated = prev.map(p =>
                p.id === property.id
                  ? { ...p, id: data.propertyId, remoteId: data.propertyId, remoteStatus: 'approved' as const }
                  : p
              );
              // Persist immediately so reload doesn't lose the remoteId
              try { localStorage.setItem('iamobil_properties', JSON.stringify(updated)); } catch {}
              return updated;
            });
            setSyncStatus({ syncing: false, lastSync: Date.now(), error: null });
          } else {
            setSyncStatus({ syncing: false, lastSync: null, error: 'Erro ao salvar na nuvem' });
          }
        } catch (e: any) {
          console.error("Erro na integração:", e);
          setSyncStatus({ syncing: false, lastSync: null, error: 'Erro de conexão' });
          syncQueue.enqueue({
            type: 'create',
            endpoint: '/api/partner/properties',
            method: 'POST',
            body: {
              ...property,
              brokerName: profile.name,
              brokerCreci: profile.creci
            }
          });
        }
    })();
  }, []);

  const deleteProperty = useCallback((id: string) => {
    const propertyToDelete = properties.find(p => p.id === id);
    const updated = properties.filter(p => p.id !== id);
    saveProperties(updated);

    const deletedIds: string[] = JSON.parse(localStorage.getItem('iamobil_deleted_ids') || '[]');
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('iamobil_deleted_ids', JSON.stringify(deletedIds));
    }

    if (propertyToDelete && (propertyToDelete.remoteId || propertyToDelete.id.startsWith('prop_'))) {
      (async () => {
        const API_BASE = getApiUrl();
        if (!API_BASE) return;
        const targetId = propertyToDelete.remoteId || propertyToDelete.id;
        try {
          await fetch(`${API_BASE}/api/partner/properties?id=${targetId}`, {
            method: "DELETE"
          });
        } catch (e) {
          console.error("Erro ao deletar da nuvem:", e);
          syncQueue.enqueue({
            type: 'delete',
            endpoint: `/api/partner/properties?id=${targetId}`,
            method: 'DELETE'
          });
        }
      })();
    }
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
      } catch (err) { /* silent */ }
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