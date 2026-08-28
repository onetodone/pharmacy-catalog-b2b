import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { MoreVertical, Plus } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import { dateTime } from '@/lib/format'
import type { Paginated, Role, User } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { RoleBadge, UserStatusBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'

const ALL = 'all'
const ROLES: Role[] = ['ADMIN', 'SUPPLIER', 'CUSTOMER']

interface UserForm {
  login: string
  password: string
  name: string
  email: string
  role: Role
  phone: string
  taxId: string
  managerName: string
  address: string
}

const emptyForm: UserForm = {
  login: '',
  password: '',
  name: '',
  email: '',
  role: 'CUSTOMER',
  phone: '',
  taxId: '',
  managerName: '',
  address: '',
}

export function UsersPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [role, setRole] = useState(ALL)
  const [dialog, setDialog] = useState<
    { mode: 'create' } | { mode: 'edit'; user: User } | null
  >(null)
  const [form, setForm] = useState<UserForm>(emptyForm)

  const params = {
    page,
    pageSize: 10,
    search: search || undefined,
    role: role === ALL ? undefined : role,
  }

  const { data, isPending } = useQuery({
    queryKey: ['users', params],
    queryFn: async () =>
      (await api.get<Paginated<User>>('/users', { params })).data,
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    // Seed the form fields from the user being edited when the dialog opens.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (dialog?.mode === 'edit') {
      const u = dialog.user
      setForm({
        login: u.login,
        password: '',
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone ?? '',
        taxId: u.taxId ?? '',
        managerName: u.managerName ?? '',
        address: u.address ?? '',
      })
    } else if (dialog?.mode === 'create') {
      setForm(emptyForm)
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dialog])

  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const save = useMutation({
    mutationFn: async () => {
      if (dialog?.mode === 'edit') {
        const payload: Record<string, unknown> = {
          login: form.login,
          name: form.name,
          email: form.email,
          role: form.role,
          phone: form.phone,
          taxId: form.taxId,
          managerName: form.managerName,
          address: form.address,
        }
        if (form.password) payload.password = form.password
        return api.patch(`/users/${dialog.user.id}`, payload)
      }
      return api.post('/users', {
        login: form.login,
        password: form.password,
        name: form.name,
        email: form.email,
        role: form.role,
        phone: form.phone || undefined,
        taxId: form.taxId || undefined,
        managerName: form.managerName || undefined,
        address: form.address || undefined,
      })
    },
    onSuccess: () => {
      invalidate()
      setDialog(null)
      toast.success('Saved')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const approve = useMutation({
    mutationFn: (id: number) => api.patch(`/users/${id}/approve`),
    onSuccess: () => {
      invalidate()
      toast.success('User approved')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const ban = useMutation({
    mutationFn: ({ id, banned }: { id: number; banned: boolean }) =>
      api.patch(`/users/${id}/ban`, { banned }),
    onSuccess: () => {
      invalidate()
      toast.success('Updated')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('User deleted')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const isCustomerForm = form.role === 'CUSTOMER'

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage admins, suppliers and customers."
        actions={
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <Plus /> Add user
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search name, email, login…"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <Select
          value={role}
          onValueChange={(v) => {
            setPage(1)
            setRole(v)
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeletonish />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.login}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell>
                    <UserStatusBadge approved={u.approved} banned={u.banned} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateTime(u.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setDialog({ mode: 'edit', user: u })}
                        >
                          Edit
                        </DropdownMenuItem>
                        {!u.approved && (
                          <DropdownMenuItem
                            onClick={() => approve.mutate(u.id)}
                          >
                            Approve
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            ban.mutate({ id: u.id, banned: !u.banned })
                          }
                        >
                          {u.banned ? 'Unban' : 'Ban'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Delete ${u.name}?`))
                              remove.mutate(u.id)
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {data && (
        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          total={data.total}
          onPage={setPage}
        />
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'edit' ? 'Edit user' : 'New user'}
            </DialogTitle>
          </DialogHeader>
          <form
            className="grid grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <TextField
              label="Login"
              value={form.login}
              onChange={(v) => setForm({ ...form, login: v })}
            />
            <TextField
              label={
                dialog?.mode === 'edit' ? 'New password (optional)' : 'Password'
              }
              type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })}
              required={dialog?.mode === 'create'}
            />
            <TextField
              label="Name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as Role })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isCustomerForm && (
              <>
                <TextField
                  label="Phone"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                />
                <TextField
                  label="Tax ID"
                  value={form.taxId}
                  onChange={(v) => setForm({ ...form, taxId: v })}
                />
                <TextField
                  label="Manager name"
                  value={form.managerName}
                  onChange={(v) => setForm({ ...form, managerName: v })}
                />
                <TextField
                  label="Address"
                  value={form.address}
                  onChange={(v) => setForm({ ...form, address: v })}
                />
              </>
            )}
            <DialogFooter className="col-span-2">
              <Button type="submit" disabled={save.isPending}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </div>
  )
}

function Skeletonish() {
  return <div className="h-6 w-full animate-pulse rounded bg-muted" />
}
