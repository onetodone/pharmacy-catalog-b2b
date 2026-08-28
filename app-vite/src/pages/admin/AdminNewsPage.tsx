import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { MoreVertical, Plus } from 'lucide-react'
import { api, apiError } from '@/lib/api'
import { dateTime } from '@/lib/format'
import type { Paginated, Post } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { useConfirm } from '@/context/confirm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

export function AdminNewsPage() {
  const qc = useQueryClient()
  const confirm = useConfirm()
  const [dialog, setDialog] = useState<
    { mode: 'create' } | { mode: 'edit'; post: Post } | null
  >(null)
  const [form, setForm] = useState({ title: '', content: '' })

  const { data } = useQuery({
    queryKey: ['posts', 'admin'],
    queryFn: async () =>
      (await api.get<Paginated<Post>>('/posts', { params: { pageSize: 100 } }))
        .data,
  })

  useEffect(() => {
    // Seed the form fields from the post being edited when the dialog opens.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (dialog?.mode === 'edit')
      setForm({ title: dialog.post.title, content: dialog.post.content })
    else if (dialog?.mode === 'create') setForm({ title: '', content: '' })
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [dialog])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['posts'] })
    qc.invalidateQueries({ queryKey: ['stats'] })
  }

  const save = useMutation({
    mutationFn: () =>
      dialog?.mode === 'edit'
        ? api.patch(`/posts/${dialog.post.id}`, form)
        : api.post('/posts', form),
    onSuccess: () => {
      invalidate()
      setDialog(null)
      toast.success('Saved')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/posts/${id}`),
    onSuccess: () => {
      invalidate()
      toast.success('Post deleted')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  return (
    <div>
      <PageHeader
        title="News"
        actions={
          <Button onClick={() => setDialog({ mode: 'create' })}>
            <Plus /> New post
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.data.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {post.author.name}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {dateTime(post.updatedAt)}
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
                          onClick={() => setDialog({ mode: 'edit', post })}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={async () => {
                            if (
                              await confirm({
                                title: 'Delete this post?',
                                description: 'The news post will be permanently removed.',
                                confirmText: 'Delete',
                                destructive: true,
                              })
                            )
                              remove.mutate(post.id)
                          }}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No posts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog?.mode === 'edit' ? 'Edit post' : 'New post'}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                rows={8}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
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
