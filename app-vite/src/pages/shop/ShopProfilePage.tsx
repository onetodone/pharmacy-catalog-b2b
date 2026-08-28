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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/sonner'

const PROFILE_FIELDS: Array<{
  name: keyof ProfileForm
  label: string
  type?: string
}> = [
  { name: 'name', label: 'Pharmacy / company name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'managerName', label: 'Manager name' },
  { name: 'phone', label: 'Phone' },
  { name: 'taxId', label: 'Tax ID' },
  { name: 'address', label: 'Address' },
]

interface ProfileForm {
  name: string
  email: string
  managerName: string
  phone: string
  taxId: string
  address: string
}

export function ShopProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState<ProfileForm>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    managerName: user?.managerName ?? '',
    phone: user?.phone ?? '',
    taxId: user?.taxId ?? '',
    address: user?.address ?? '',
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
    <div>
      <PageHeader title="Profile settings" />
      <Tabs defaultValue="profile" className="max-w-xl">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account details</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  saveProfile.mutate()
                }}
              >
                {PROFILE_FIELDS.map((f) => (
                  <div key={f.name} className="space-y-1.5">
                    <Label htmlFor={f.name}>{f.label}</Label>
                    <Input
                      id={f.name}
                      type={f.type ?? 'text'}
                      value={profile[f.name]}
                      onChange={(e) =>
                        setProfile({ ...profile, [f.name]: e.target.value })
                      }
                    />
                  </div>
                ))}
                <Button type="submit" disabled={saveProfile.isPending}>
                  Save changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
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
                  <Label htmlFor="currentPassword">Current password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={pwd.currentPassword}
                    onChange={(e) =>
                      setPwd({ ...pwd, currentPassword: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={pwd.newPassword}
                    onChange={(e) =>
                      setPwd({ ...pwd, newPassword: e.target.value })
                    }
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    8-32 chars, letters/digits/-/_
                  </p>
                </div>
                <Button type="submit" disabled={savePassword.isPending}>
                  Update password
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
