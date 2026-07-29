import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setToken as setApiToken, clearToken, setUnauthorizedCallback } from './api';
import { socketService } from './socket';

// ── Types ───────────────────────────────────────────
export type User = {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  avatar?: string;
  bio?: string;
  totalEarnings?: number;
  isEbHead?: boolean;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = 'mangaflow-user';
const TOKEN_KEY = 'mangaflow-token';

function isStoredUser(value: unknown): value is User {
  if (!value || typeof value !== 'object') return false;
  const user = value as Partial<User>;
  return typeof user._id === 'string'
    && typeof user.email === 'string'
    && typeof user.displayName === 'string'
    && typeof user.role === 'string';
}

async function clearPersistedSession() {
  await clearToken().catch(() => {});
  await Promise.allSettled([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
  ]);
}

// ── Provider ────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Register unauthorized callback to redirect to login
  useEffect(() => {
    setUnauthorizedCallback(() => {
      setUser(null);
      setToken(null);
    });
  }, []);

  // Connect/disconnect socket based on auth status
  useEffect(() => {
    if (token) {
      socketService.connect();
    } else {
      socketService.disconnect();
    }
  }, [token]);

  // Load saved auth on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (!savedToken || !savedUser) {
          if (savedToken || savedUser) await clearPersistedSession();
          return;
        }

        let parsedUser: unknown;
        try {
          parsedUser = JSON.parse(savedUser);
        } catch {
          await clearPersistedSession();
          return;
        }

        if (!isStoredUser(parsedUser)) {
          await clearPersistedSession();
          return;
        }

        await setApiToken(savedToken);
        if (mounted) {
          setUser(parsedUser);
          setToken(savedToken);
        }
      } catch {
        await clearPersistedSession();
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authAPI.login(email, password);
    if (!data?.token || !isStoredUser(data.user)) {
      throw new Error('Invalid login response');
    }
    await setApiToken(data.token);
    setUser(data.user);
    setToken(data.token);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, data.token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)),
    ]).catch((error) => console.error('Failed to persist login session:', error));
  };

  const register = async (regData: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
  }) => {
    const data = await authAPI.register(regData);
    if (!data?.token || !isStoredUser(data.user)) {
      throw new Error('Invalid registration response');
    }
    await setApiToken(data.token);
    setUser(data.user);
    setToken(data.token);
    await Promise.all([
      AsyncStorage.setItem(TOKEN_KEY, data.token),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user)),
    ]).catch((error) => console.error('Failed to persist registration session:', error));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await clearPersistedSession();
  };

  const updateUser = async (data: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...data };
      AsyncStorage.setItem(USER_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  };

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
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
