import { createContext, useCallback, useContext, useState, useEffect, type ReactNode } from 'react';
import { authAPI } from './api';

type User = {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  avatar?: string;
  subscribedToNewSeries?: boolean;
  isEbHead?: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; displayName: string; role?: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updatedFields: Partial<User>) => void;
  isAuthenticated: boolean;
  authNotice: string | null;
  clearAuthNotice: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);
const TOKEN_KEY = 'mangaflow-token';
const USER_KEY = 'mangaflow-user';

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<User>;
  return typeof candidate._id === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.displayName === 'string'
    && typeof candidate.role === 'string';
}

function readStoredUser(): User | null {
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;
    const parsed: unknown = JSON.parse(saved);
    if (isStoredUser(parsed)) return parsed;
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    try {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // Browser storage may be disabled; continue with an in-memory session.
    }
  }
  return null;
}

function persistSession(token: string, user: User): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Browser storage may be disabled; the current in-memory session still works.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readStoredUser);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [loading] = useState(false);

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthNotice(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // State has already been cleared.
    }
  };

  // Listen for auth:logout events (from API interceptor)
  useEffect(() => {
    const handler = (event: Event) => {
      setToken(null);
      setUser(null);
      const reason = (event as CustomEvent<string>).detail;
      setAuthNotice(reason || 'Your session has expired. Please sign in again.');
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);
    if (!data?.token || !isStoredUser(data.user)) throw new Error('Invalid login response.');
    setToken(data.token);
    setUser(data.user);
    setAuthNotice(null);
    persistSession(data.token, data.user);
  };

  const register = async (regData: { email: string; password: string; displayName: string; role?: string }) => {
    const { data } = await authAPI.register(regData);
    if (!data?.token || !isStoredUser(data.user)) throw new Error('Invalid registration response.');
    setToken(data.token);
    setUser(data.user);
    setAuthNotice(null);
    persistSession(data.token, data.user);
  };

  const updateUser = useCallback((updatedFields: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const newUser = { ...current, ...updatedFields };
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(newUser));
      } catch {
        // Keep the current in-memory profile.
      }
      return newUser;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!token && !!user,
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
