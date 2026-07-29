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
import { isApiError } from './errors';

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
  authNotice: string | null;
  clearAuthNotice: () => void;
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
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  // Register unauthorized callback to redirect to login
  useEffect(() => {
    setUnauthorizedCallback((reason) => {
      setUser(null);
      setToken(null);
      setAuthNotice(reason || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    });
    return () => setUnauthorizedCallback(null);
  }, []);

  // Connect/disconnect socket based on auth status
  useEffect(() => {
    if (token) {
      void socketService.connect().catch((error) => {
        console.warn('Unable to connect the mobile realtime channel:', error);
      });
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
        let verifiedUser = parsedUser;
        try {
          const session = await authAPI.getMe();
          if (isStoredUser(session?.user)) verifiedUser = session.user;
          else throw new Error('Invalid user response');
        } catch (error) {
          if (isApiError(error) && [401, 403, 404].includes(error.status)) {
            await clearPersistedSession();
            return;
          }
          // Keep a valid cached session during temporary network/server outages.
          console.warn('Unable to verify the saved session; using cached profile:', error);
        }
        if (mounted) {
          setUser(verifiedUser);
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
    setAuthNotice(null);
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
    setAuthNotice(null);
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
    setAuthNotice(null);
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
        authNotice,
        clearAuthNotice: () => setAuthNotice(null),
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
