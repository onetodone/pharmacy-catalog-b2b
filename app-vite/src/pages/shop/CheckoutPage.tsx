import { useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api, apiError } from '@/lib/api'
import { useCart, type CartLine } from '@/lib/cart'
import { money } from '@/lib/format'
import type { Order } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/components/ui/sonner'

export function CheckoutPage() {
  const { lines, totalPrice, clear } = useCart()
  const navigate = useNavigate()
  const [note, setNote] = useState('')

  const groups = useMemo(() => {
    const map = new Map<number, { name: string; lines: CartLine[] }>()
    for (const l of lines) {
      const g = map.get(l.supplierId) ?? { name: l.supplierName, lines: [] }
      g.lines.push(l)
      map.set(l.supplierId, g)
    }
    return [...map.values()]
  }, [lines])

  const checkout = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Order[]>('/orders/checkout', {
        items: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
        })),
        note: note || undefined,
      })
      return data
    },
    onSuccess: (orders) => {
      clear()
      toast.success(
        `${orders.length} order${orders.length === 1 ? '' : 's'} placed`,
      )
      navigate('/orders')
    },
    onError: (err) => toast.error(apiError(err, 'Checkout failed')),
  })

  if (lines.length === 0) return <Navigate to="/cart" replace />

  return (
    <div>
      <PageHeader
        title="Checkout"
        description="One order is created per supplier. Review the details and place your order."
      />
      <div className="space-y-4">
        {groups.map((g, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base">{g.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {g.lines.map((l) => (
                <div key={l.productId} className="flex justify-between text-sm">
                  <span>
                    {l.name}{' '}
                    <span className="text-muted-foreground">
                      × {l.quantity}
                    </span>
                  </span>
                  <span>{money(l.price * l.quantity)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        <Label htmlFor="note">Order note (optional)</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
        />
      </div>

      <div className="mt-6 flex items-center justify-end gap-6">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Order total</div>
          <div className="text-xl font-semibold">{money(totalPrice())}</div>
        </div>
        <Button disabled={checkout.isPending} onClick={() => checkout.mutate()}>
          {checkout.isPending ? 'Placing…' : 'Place order'}
        </Button>
      </div>
    </div>
  )
}
