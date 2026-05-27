import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserProfile } from '../types';
import { getApiUrl } from '../utils';
import { syncQueue } from '../sync-queue';

interface UserContextType {
  profile: UserProfile;
  updateProfile: (newProfile: UserProfile) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const API_URL = getApiUrl();

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    creci: '',
    photo: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const savedProfile = localStorage.getItem('iamobil_profile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name === 'Buscando perfil...') {
          parsed.name = '';
        }
        setProfile(parsed);
      } catch (e) {
        console.error("Erro ao carregar perfil local:", e);
      }
    }
  }, []);

  useEffect(() => {
    const fetchCloudProfile = async () => {
      if (!API_URL) return;

      try {
        // // console.log removido;
        const response = await fetch(`${API_URL}/api/partner/register?creci=${encodeURIComponent(profile.creci)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.broker) {
            // console.log("[UserContext] Perfil encontrado na nuvem:", data.broker);
            const cloudProfile = {
              creci: data.broker.creci,
              name: data.broker.name || '',
              email: data.broker.email || '',
              phone: data.broker.phone || '',
              photo: data.broker.photo || ''
            };
            setProfile(cloudProfile);
            localStorage.setItem('iamobil_profile', JSON.stringify(cloudProfile));
          } else if (profile.name === 'Buscando perfil...') {
            const resetProfile = { ...profile, name: '' };
            setProfile(resetProfile);
            localStorage.setItem('iamobil_profile', JSON.stringify(resetProfile));
          }
        } else if (profile.name === 'Buscando perfil...') {
          const resetProfile = { ...profile, name: '' };
          setProfile(resetProfile);
          localStorage.setItem('iamobil_profile', JSON.stringify(resetProfile));
        }
      } catch (error) {
        console.error("[UserContext] Erro ao sincronizar perfil com nuvem:", error);
      }
    };

    fetchCloudProfile();
  }, []);

  const syncToCloud = async (userData: UserProfile) => {
    const apiUrl = getApiUrl();
    if (!apiUrl || !userData.creci || userData.name === 'Buscando perfil...') return;
    
    try {
      await fetch(`${apiUrl}/api/partner/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      // console.log("[UserContext] Perfil sincronizado com a nuvem.");
    } catch (error) {
      console.error("[UserContext] Falha ao enviar perfil para nuvem:", error);
      syncQueue.enqueue({
        type: 'update',
        endpoint: '/api/partner/register',
        method: 'POST',
        body: userData
      });
    }
  };

  const updateProfile = useCallback(async (newProfile: UserProfile) => {
    setProfile(newProfile);
    localStorage.setItem('iamobil_profile', JSON.stringify(newProfile));
    return syncToCloud(newProfile);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('iamobil_profile');
    localStorage.removeItem('iamobil_properties');
    setProfile({
      name: '',
      creci: '',
      photo: '',
      email: '',
      phone: ''
    });
  }, []);

  return (
    <UserContext.Provider value={{ profile, updateProfile, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
