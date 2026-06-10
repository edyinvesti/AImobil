// src/services/api.ts
// Instância fetch configurada com JWT

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
    const error = await response.json().catch(() => ({ error: 'Erro desconhecido' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint),
  
  post: <T>(endpoint: string, data: unknown) => 
    request<T>(endpoint, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),
  
  put: <T>(endpoint: string, data: unknown) => 
    request<T>(endpoint, { 
      method: 'PUT', 
      body: JSON.stringify(data) 
    }),
  
  delete: <T>(endpoint: string) => 
    request<T>(endpoint, { method: 'DELETE' }),
};

export default api;
