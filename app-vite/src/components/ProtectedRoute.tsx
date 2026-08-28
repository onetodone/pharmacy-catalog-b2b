import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { homePathFor, useAuth } from '@/context/auth'
import type { Role } from '@/lib/types'

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Role[]
  children: ReactNode
}) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />
  }
  return <>{children}</>
}
