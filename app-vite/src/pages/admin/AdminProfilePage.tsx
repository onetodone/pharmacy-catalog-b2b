import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, apiError } from '@/lib/api'
import { useAuth } from '@/context/auth'
import type { User } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/sonner'
import { SessionsList } from '@/components/SessionsList'

export function AdminProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
  })
  const [pwd, setPwd] = useState({ currentPassword: '', newPassword: '' })

  const saveProfile = useMutation({
    mutationFn: async () => (await api.patch<User>('/users/me', profile)).data,
    onSuccess: (u) => {
      setUser(u)
      toast.success('Profile updated')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const savePassword = useMutation({
    mutationFn: () => api.post('/users/me/password', pwd),
    onSuccess: () => {
      setPwd({ currentPassword: '', newPassword: '' })
      toast.success('Password changed')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  return (
    <div className="max-w-lg">
      <PageHeader title="Profile" />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              saveProfile.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              />
            </div>
            <Button type="submit" disabled={saveProfile.isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              savePassword.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="cur">Current password</Label>
              <Input
                id="cur"
                type="password"
                value={pwd.currentPassword}
                onChange={(e) =>
                  setPwd({ ...pwd, currentPassword: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <Input
                id="new"
                type="password"
                value={pwd.newPassword}
                onChange={(e) =>
                  setPwd({ ...pwd, newPassword: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" disabled={savePassword.isPending}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionsList />
        </CardContent>
      </Card>
    </div>
  )
}
