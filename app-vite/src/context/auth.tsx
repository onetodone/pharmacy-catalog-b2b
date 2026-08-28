import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, TOKEN_KEY } from '@/lib/api'
import type { User } from '@/lib/types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (login: string, password: string) => Promise<User>
  logout: () => void
  refresh: () => Promise<void>
  setUser: (user: User) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const { data } = await api.get<User>('/auth/me')
      setUser(data)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // One-shot session restore on mount: syncs React state with localStorage
    // and the /auth/me endpoint. The setState calls here are intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [])

  const login = async (loginName: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; user: User }>(
      '/auth/login',
      {
        login: loginName,
        password,
      },
    )
    localStorage.setItem(TOKEN_KEY, data.accessToken)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refresh, setUser }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export const homePathFor = (role: User['role']) =>
  role === 'CUSTOMER' ? '/' : '/admin'
