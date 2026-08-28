import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { MoreVertical, Plus } from 'lucide-react'
import { api, apiError, assetUrl } from '@/lib/api'
import { money } from '@/lib/format'
import { useAuth } from '@/context/auth'
import { useCategories } from '@/lib/queries'
import type { Paginated, Product } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from '@/components/ui/sonner'

const ALL = 'all'

export function AdminProductsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const qc = useQueryClient()
  const categories = useCategories()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(ALL)

  const params = {
    page,
    pageSize: 10,
    search: search || undefined,
    categoryId: categoryId === ALL ? undefined : Number(categoryId),
    includeArchived: true,
  }

  const { data, isPending } = useQuery({
    queryKey: ['admin-products', params],
    queryFn: async () =>
      (await api.get<Paginated<Product>>('/products', { params })).data,
    placeholderData: keepPreviousData,
  })

  const archive = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product archived')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const restore = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/products/${id}`, { archived: false }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Product restored')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  return (
    <div>
      <PageHeader
        title="Products"
        description={isAdmin ? 'All catalog products.' : 'Products you supply.'}
        actions={
          <Button asChild>
            <Link to="/admin/products/new">
              <Plus /> Add product
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          placeholder="Search…"
          className="max-w-xs"
          value={search}
          onChange={(e) => {
            setPage(1)
            setSearch(e.target.value)
          }}
        />
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setPage(1)
            setCategoryId(v)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories.data?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
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
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Code</TableHead>
                {isAdmin && <TableHead>Owner</TableHead>}
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={isAdmin ? 7 : 6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.data.map((p) => (
                <TableRow key={p.id} className={p.archived ? 'opacity-50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.cover ? (
                        <img
                          src={assetUrl(p.cover)}
                          alt=""
                          className="h-9 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded bg-muted" />
                      )}
                      <Link
                        to={`/admin/products/${p.id}`}
                        className="font-medium hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.archived && (
                        <Badge variant="secondary">Archived</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{p.category.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.code}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-sm">{p.owner.name}</TableCell>
                  )}
                  <TableCell className="text-right">{money(p.price)}</TableCell>
                  <TableCell className="text-right">{p.quantity}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/admin/products/${p.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        {p.archived ? (
                          <DropdownMenuItem
                            onClick={() => restore.mutate(p.id)}
                          >
                            Restore
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => archive.mutate(p.id)}
                          >
                            Archive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {data && data.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="py-12 text-center text-muted-foreground"
                  >
                    No products.
                  </TableCell>
                </TableRow>
              )}
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
    </div>
  )
}
