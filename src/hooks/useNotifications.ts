import { useEffect } from 'react';
import { getApiUrl } from '../utils';

export function useNotifications() {
  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const reg = await navigator.serviceWorker.ready;
        console.log('[Push] Service worker ready');
      } catch (e) {
        console.warn('[Push] Erro ao registrar:', e);
      }
    };

    register();
  }, []);
}
