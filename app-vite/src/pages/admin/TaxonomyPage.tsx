import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, Plus } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import type { Category } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
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

export function TaxonomyPage({
  resource,
  title,
  singular,
}: {
  resource: 'categories' | 'manufacturers'
  title: string
  singular: string
}) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState<Category | null>(null)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const { data } = useQuery({
    queryKey: [resource],
    queryFn: async () => (await api.get<Category[]>(`/${resource}`)).data,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [resource] })
    qc.invalidateQueries({ queryKey: ['categories'] })
    qc.invalidateQueries({ queryKey: ['manufacturers'] })
  }

  const create = useMutation({
    mutationFn: () => api.post(`/${resource}`, { name }),
    onSuccess: () => {
      invalidate()
      setCreating(false)
      setName('')
      toast.success(`${singular} created`)
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const update = useMutation({
    mutationFn: () => api.patch(`/${resource}/${editing!.id}`, { name }),
    onSuccess: () => {
      invalidate()
      setEditing(null)
      toast.success(`${singular} updated`)
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/${resource}/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success(`${singular} deleted`)
    },
    onError: (err) => toast.error(apiError(err)),
  })

  return (
    <div>
      <PageHeader
        title={title}
        actions={
          <Button
            onClick={() => {
              setName('')
              setCreating(true)
            }}
          >
            <Plus /> Add {singular.toLowerCase()}
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row._count?.products ?? 0}
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
                          onClick={() => {
                            setEditing(row)
                            setName(row.name)
                          }}
                        >
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => remove.mutate(row.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Nothing here yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={creating || !!editing}
        onOpenChange={(o) => {
          if (!o) {
            setCreating(false)
            setEditing(null)
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? `Rename ${singular.toLowerCase()}`
                : `New ${singular.toLowerCase()}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="tax-name">Name</Label>
            <Input
              id="tax-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => (editing ? update.mutate() : create.mutate())}
              disabled={!name.trim() || create.isPending || update.isPending}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
