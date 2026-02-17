import api from './api';

const TOKEN_KEY = 'sitedoc_token';

function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  // Mirror to cookie so Next.js middleware (edge runtime) can read it
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export async function login(email: string, password: string): Promise<string> {
  const response = await api.post<{ access_token: string }>('/api/v1/auth/login', {
    email,
    password,
  });
  const token = response.data.access_token;
  setToken(token);
  return token;
}

export async function register(email: string, password: string): Promise<string> {
  const response = await api.post<{ access_token: string }>('/api/v1/auth/register', {
    email,
    password,
  });
  const token = response.data.access_token;
  setToken(token);
  return token;
}

export function logout(): void {
  clearToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
