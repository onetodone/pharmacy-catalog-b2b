import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, setAccessToken } from '@/lib/api'
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

interface SessionResponse {
  accessToken: string
  user: User
}

// Module-scoped single-flight guard: React StrictMode mounts effects twice in
// dev, which would otherwise fire two /auth/refresh calls — the backend rotates
// the refresh token on every use, so the second would race the first and fail,
// clobbering a just-restored session.
let bootstrapPromise: Promise<SessionResponse | null> | null = null

function bootstrapSession(): Promise<SessionResponse | null> {
  if (!bootstrapPromise) {
    bootstrapPromise = api
      .post<SessionResponse>('/auth/refresh')
      .then((res) => res.data)
      .catch(() => null)
      .finally(() => {
        bootstrapPromise = null
      })
  }
  return bootstrapPromise
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    const session = await bootstrapSession()
    if (session) {
      setAccessToken(session.accessToken)
      setUser(session.user)
    } else {
      setAccessToken(null)
      setUser(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // One-shot session restore on mount: exchange the httpOnly refresh cookie
    // for an access token. The setState calls here are intentional.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [])

  const login = async (loginName: string, password: string) => {
    const { data } = await api.post<SessionResponse>('/auth/login', {
      login: loginName,
      password,
    })
    setAccessToken(data.accessToken)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    // Best-effort: delete the server-side session and clear the cookie. Local
    // state is cleared regardless of whether the call succeeds.
    void api.post('/auth/logout').catch(() => undefined)
    setAccessToken(null)
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
