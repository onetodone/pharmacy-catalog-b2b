import { Link, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { useCart } from '@/lib/cart'
import { money } from '@/lib/format'
import { assetUrl } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function CartPage() {
  const { lines, setQuantity, remove, totalPrice } = useCart()
  const navigate = useNavigate()

  if (lines.length === 0) {
    return (
      <div>
        <PageHeader title="Your cart" />
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            Your cart is empty.{' '}
            <Link to="/" className="text-primary hover:underline">
              Browse the catalog
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Your cart"
        description="Items are grouped by supplier at checkout."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="w-32">Quantity</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.productId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {l.cover ? (
                        <img
                          src={assetUrl(l.cover)}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted" />
                      )}
                      <div>
                        <div className="font-medium">{l.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.code}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.supplierName}
                  </TableCell>
                  <TableCell>{money(l.price)}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={l.maxQuantity}
                      value={l.quantity}
                      onChange={(e) =>
                        setQuantity(l.productId, Number(e.target.value))
                      }
                      className="h-8 w-20"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {money(l.price * l.quantity)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(l.productId)}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-end gap-6">
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Subtotal</div>
          <div className="text-xl font-semibold">{money(totalPrice())}</div>
        </div>
        <Button onClick={() => navigate('/checkout')}>
          Proceed to checkout
        </Button>
      </div>
    </div>
  )
}
