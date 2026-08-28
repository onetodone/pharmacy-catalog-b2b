import { useMemo, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { PackageSearch, Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { assetUrl } from '@/lib/api'
import { money } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/cart'
import { useCategories, useManufacturers } from '@/lib/queries'
import type { Paginated, Product } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

const ALL = 'all'
const MAX_QTY = 20

function QuantitySelect({
  value,
  onValueChange,
  max,
  disabled,
  className,
}: {
  value: string
  onValueChange: (value: string) => void
  max: number
  disabled?: boolean
  className?: string
}) {
  const cap = Math.min(Math.max(max, 1), MAX_QTY)
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn('w-[4.5rem] shrink-0', className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Array.from({ length: cap }, (_, i) => i + 1).map((n) => (
          <SelectItem key={n} value={String(n)}>
            {n}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ProductCard({
  product,
  onOpen,
  onAdd,
}: {
  product: Product
  onOpen: () => void
  onAdd: (quantity: number) => void
}) {
  const price = Number(product.price)
  const out = product.quantity <= 0
  const [qty, setQty] = useState('1')

  return (
    <Card className="flex flex-col overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-muted"
      >
        {product.cover ? (
          <img
            src={assetUrl(product.cover)}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : (
          <PackageSearch className="h-10 w-10 text-muted-foreground" />
        )}
      </button>
      <CardContent className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="text-left font-medium hover:underline"
            onClick={onOpen}
          >
            {product.name}
          </button>
          <span className="font-semibold whitespace-nowrap">
            {money(price)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          <Badge variant="outline">{product.category.name}</Badge>
          <Badge variant="outline">{product.manufacturer.name}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          {product.code} · {product.owner.name}
        </p>
        <div className="mt-auto flex items-center gap-2 pt-2">
          <span
            className={cn(
              'mr-auto text-xs',
              out ? 'text-destructive' : 'text-muted-foreground',
            )}
          >
            {out ? 'Out of stock' : `${product.quantity} in stock`}
          </span>
          <QuantitySelect
            value={qty}
            onValueChange={setQty}
            max={product.quantity}
            disabled={out}
          />
          <Button size="sm" disabled={out} onClick={() => onAdd(Number(qty))}>
            <Plus /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProductDetail({
  product,
  onAdd,
}: {
  product: Product
  onAdd: (quantity: number) => void
}) {
  const out = product.quantity <= 0
  const [qty, setQty] = useState('1')

  return (
    <>
      <DialogHeader>
        <DialogTitle>{product.name}</DialogTitle>
        <DialogDescription>
          {product.code} · {product.category.name} · {product.manufacturer.name}
        </DialogDescription>
      </DialogHeader>
      {product.cover && (
        <img
          src={assetUrl(product.cover)}
          alt={product.name}
          className="max-h-60 w-full rounded-md object-contain"
        />
      )}
      <p className="text-sm text-muted-foreground">{product.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold">{money(product.price)}</span>
        <span className="text-sm text-muted-foreground">
          Supplier: {product.owner.name}
        </span>
      </div>
      <div className="flex items-center gap-2 pt-2">
        <span className="mr-auto text-xs text-muted-foreground">
          {out ? 'Out of stock' : `${product.quantity} in stock`}
        </span>
        <QuantitySelect
          value={qty}
          onValueChange={setQty}
          max={product.quantity}
          disabled={out}
        />
        <Button disabled={out} onClick={() => onAdd(Number(qty))}>
          <Plus /> Add
        </Button>
      </div>
    </>
  )
}

export function CatalogPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState(ALL)
  const [manufacturerId, setManufacturerId] = useState(ALL)
  const [detail, setDetail] = useState<Product | null>(null)

  const categories = useCategories()
  const manufacturers = useManufacturers()
  const add = useCart((s) => s.add)

  const params = useMemo(
    () => ({
      page,
      pageSize: 12,
      search: search || undefined,
      categoryId: categoryId === ALL ? undefined : Number(categoryId),
      manufacturerId:
        manufacturerId === ALL ? undefined : Number(manufacturerId),
    }),
    [page, search, categoryId, manufacturerId],
  )

  const { data, isPending } = useQuery({
    queryKey: ['catalog', params],
    queryFn: async () =>
      (await api.get<Paginated<Product>>('/products', { params })).data,
    placeholderData: keepPreviousData,
  })

  const resetPageAnd = (fn: () => void) => {
    setPage(1)
    fn()
  }

  const addToCart = (p: Product, quantity: number) => {
    add(
      {
        productId: p.id,
        name: p.name,
        code: p.code,
        price: Number(p.price),
        cover: p.cover,
        supplierId: p.owner.id,
        supplierName: p.owner.name,
        maxQuantity: p.quantity,
      },
      quantity,
    )
    toast.success(`${p.name} × ${quantity} added to cart`)
  }

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Browse products, add them to your cart and place an order."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or code…"
          className="max-w-xs"
          value={search}
          onChange={(e) => resetPageAnd(() => setSearch(e.target.value))}
        />
        <Select
          value={categoryId}
          onValueChange={(v) => resetPageAnd(() => setCategoryId(v))}
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
        <Select
          value={manufacturerId}
          onValueChange={(v) => resetPageAnd(() => setManufacturerId(v))}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Manufacturer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All manufacturers</SelectItem>
            {manufacturers.data?.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onOpen={() => setDetail(p)}
                onAdd={(quantity) => addToCart(p, quantity)}
              />
            ))}
          </div>
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            onPage={setPage}
          />
        </>
      ) : (
        <p className="py-16 text-center text-muted-foreground">
          No products match your filters.
        </p>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          {detail && (
            <ProductDetail
              key={detail.id}
              product={detail}
              onAdd={(quantity) => {
                addToCart(detail, quantity)
                setDetail(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
