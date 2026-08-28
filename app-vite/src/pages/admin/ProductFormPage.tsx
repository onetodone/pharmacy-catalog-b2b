import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api, apiError, assetUrl } from '@/lib/api'
import { useAuth } from '@/context/auth'
import { useCategories, useManufacturers } from '@/lib/queries'
import type { Paginated, Product, User } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/sonner'

interface FormState {
  name: string
  code: string
  price: string
  quantity: string
  description: string
  categoryId: string
  manufacturerId: string
  ownerId: string
}

const EMPTY: FormState = {
  name: '',
  code: '',
  price: '',
  quantity: '0',
  description: '',
  categoryId: '',
  manufacturerId: '',
  ownerId: '',
}

export function ProductFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const fileRef = useRef<HTMLInputElement>(null)

  const categories = useCategories()
  const manufacturers = useManufacturers()

  const suppliers = useQuery({
    queryKey: ['suppliers'],
    enabled: isAdmin,
    queryFn: async () =>
      (
        await api.get<Paginated<User>>('/users', {
          params: { role: 'SUPPLIER', pageSize: 100 },
        })
      ).data.data,
  })

  const product = useQuery({
    queryKey: ['product', id],
    enabled: editing,
    queryFn: async () => (await api.get<Product>(`/products/${id}`)).data,
  })

  const [form, setForm] = useState<FormState>(EMPTY)

  useEffect(() => {
    // Populate the form once the product to edit has been fetched.
    if (product.data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: product.data.name,
        code: product.data.code,
        price: String(Number(product.data.price)),
        quantity: String(product.data.quantity),
        description: product.data.description,
        categoryId: String(product.data.categoryId),
        manufacturerId: String(product.data.manufacturerId),
        ownerId: String(product.data.ownerId),
      })
    }
  }, [product.data])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        code: form.code,
        price: Number(form.price),
        quantity: Number(form.quantity),
        description: form.description,
        categoryId: Number(form.categoryId),
        manufacturerId: Number(form.manufacturerId),
        ...(isAdmin ? { ownerId: Number(form.ownerId) } : {}),
      }
      return editing
        ? (await api.patch<Product>(`/products/${id}`, payload)).data
        : (await api.post<Product>('/products', payload)).data
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success(editing ? 'Product updated' : 'Product created')
      navigate(`/admin/products/${saved.id}`)
    },
    onError: (err) => toast.error(apiError(err)),
  })

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append('file', file)
      return (await api.post<Product>(`/products/${id}/cover`, fd)).data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['product', id] })
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success('Cover updated')
    },
    onError: (err) => toast.error(apiError(err)),
  })

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/admin/products">
          <ArrowLeft /> Back to products
        </Link>
      </Button>
      <PageHeader title={editing ? 'Edit product' : 'New product'} />

      <Card>
        <CardContent className="pt-6">
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              save.mutate()
            }}
          >
            <Field label="Name" className="sm:col-span-2">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Code (SKU)">
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                required
              />
            </Field>
            {isAdmin && (
              <Field label="Supplier (owner)">
                <Select
                  value={form.ownerId}
                  onValueChange={(v) => setForm({ ...form, ownerId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.data?.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field label="Category">
              <Select
                value={form.categoryId}
                onValueChange={(v) => setForm({ ...form, categoryId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.data?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Manufacturer">
              <Select
                value={form.manufacturerId}
                onValueChange={(v) => setForm({ ...form, manufacturerId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select manufacturer" />
                </SelectTrigger>
                <SelectContent>
                  {manufacturers.data?.map((m) => (
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Price (USD)">
              <Input
                type="number"
                step="0.01"
                min="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </Field>
            <Field label="Quantity in stock">
              <Input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                {editing ? 'Save changes' : 'Create product'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {editing && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Cover image</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            {product.data?.cover ? (
              <img
                src={assetUrl(product.data.cover)}
                alt=""
                className="h-24 w-24 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-md bg-muted text-xs text-muted-foreground">
                No image
              </div>
            )}
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) uploadCover.mutate(file)
                }}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploadCover.isPending}
              >
                {uploadCover.isPending ? 'Uploading…' : 'Upload image'}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG / JPEG / WEBP, up to 2 MB.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Field({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      {children}
    </div>
  )
}
