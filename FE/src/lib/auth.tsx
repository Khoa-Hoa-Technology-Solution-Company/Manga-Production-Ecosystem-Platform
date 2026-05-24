import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { authAPI } from './api'

export type User = {
  _id: string
  email: string
  displayName: string
  role: string
  avatar?: string
  permissions: string[]
}

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; password: string; displayName: string; role?: string }) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AUTH_TOKEN_KEY = 'mangaflow-token'
const AUTH_USER_KEY = 'mangaflow-user'

const AuthContext = createContext<AuthContextType | null>(null)

function readStoredUser() {
  const saved = localStorage.getItem(AUTH_USER_KEY)
  if (!saved) return null

  try {
    const parsed = JSON.parse(saved) as Partial<User>
    if (!parsed.permissions) parsed.permissions = []
    return parsed as User
  } catch {
    localStorage.removeItem(AUTH_USER_KEY)
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [loading, setLoading] = useState(true)

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
  }

  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    setLoading(false)

    return () => window.removeEventListener('auth:logout', handler)
  }, [])

  const persistAuth = (nextToken: string, nextUser: User) => {
    setToken(nextToken)
    setUser(nextUser)
    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(nextUser))
  }

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password)
    persistAuth(data.token, data.user)
  }

  const register = async (regData: { email: string; password: string; displayName: string; role?: string }) => {
    const { data } = await authAPI.register(regData)
    persistAuth(data.token, data.user)
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, register, logout, isAuthenticated: !!token }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
