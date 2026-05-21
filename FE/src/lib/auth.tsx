import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from './api';

type User = {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string; role?: string }) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('mangaflow-token');
    const savedUser = localStorage.getItem('mangaflow-user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Listen for auth:logout events (from API interceptor)
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('mangaflow-token', data.token);
    localStorage.setItem('mangaflow-user', JSON.stringify(data.user));
  };

  const register = async (regData: { email: string; password: string; displayName: string; role?: string }) => {
    const { data } = await authAPI.register(regData);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('mangaflow-token', data.token);
    localStorage.setItem('mangaflow-user', JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('mangaflow-token');
    localStorage.removeItem('mangaflow-user');
  };

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
