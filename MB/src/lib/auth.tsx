import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, setToken as setApiToken, clearToken, setUnauthorizedCallback } from './api';

// ── Types ───────────────────────────────────────────
export type User = {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  avatar?: string;
  totalEarnings?: number;
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
  logout: () => void;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = 'mangaflow-user';
const TOKEN_KEY = 'mangaflow-token';

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

  // Load saved auth on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);

        if (savedToken && savedUser) {
          await setApiToken(savedToken);
          setUser(JSON.parse(savedUser));
          setToken(savedToken);
        }
      } catch {
        // Ignore storage errors on startup
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await authAPI.login(email, password);
    await setApiToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
  };

  const register = async (regData: {
    email: string;
    password: string;
    displayName: string;
    role?: string;
  }) => {
    const data = await authAPI.register(regData);
    await setApiToken(data.token);
    await AsyncStorage.setItem(TOKEN_KEY, data.token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setUser(data.user);
    setToken(data.token);
  };

  const logout = async () => {
    await clearToken();
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setUser(null);
    setToken(null);
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
