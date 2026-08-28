import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Globe, Monitor } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import type { Session } from '@/lib/types'
import { useConfirm } from '@/context/confirm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/sonner'

const SESSIONS_KEY = ['sessions']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString()
}

export function SessionsList() {
  const confirm = useConfirm()
  const queryClient = useQueryClient()

  const { data: sessions, isPending } = useQuery({
    queryKey: SESSIONS_KEY,
    queryFn: async () => (await api.get<Session[]>('/users/me/sessions')).data,
  })

  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/users/me/sessions/${id}`),
    onSuccess: () => {
      toast.success('Session signed out')
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const revokeOthers = useMutation({
    mutationFn: () => api.delete<{ count: number }>('/users/me/sessions'),
    onSuccess: (res) => {
      toast.success(`Signed out ${res.data.count} other session(s)`)
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY })
    },
    onError: (err) => toast.error(apiError(err)),
  })

  if (isPending) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  const otherCount = sessions?.filter((s) => !s.isCurrent).length ?? 0

  return (
    <div className="space-y-3">
      {otherCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            disabled={revokeOthers.isPending}
            onClick={async () => {
              if (
                await confirm({
                  title: 'Sign out all other sessions?',
                  description:
                    'Every other device signed in to this account will be logged out. This session stays active.',
                  confirmText: 'Sign out others',
                  destructive: true,
                })
              )
                revokeOthers.mutate()
            }}
          >
            Sign out other sessions
          </Button>
        </div>
      )}

      <ul className="space-y-2">
        {sessions?.map((session) => (
          <li
            key={session.id}
            className="flex items-center gap-3 rounded-md border p-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
              <Monitor className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={session.userAgent ?? undefined}>
                {session.userAgent ?? 'Unknown device'}
              </p>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Globe className="size-3" />
                  {session.ipAddress ?? '—'}
                </span>
                <span>Signed in: {formatDate(session.createdAt)}</span>
                <span>Expires: {formatDate(session.expiresAt)}</span>
              </p>
            </div>
            {session.isCurrent ? (
              <Badge variant="secondary" className="shrink-0">
                This device
              </Badge>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                disabled={revoke.isPending}
                onClick={async () => {
                  if (
                    await confirm({
                      title: 'Sign out this session?',
                      description: 'The device using this session will need to sign in again.',
                      confirmText: 'Sign out',
                      destructive: true,
                    })
                  )
                    revoke.mutate(session.id)
                }}
              >
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
