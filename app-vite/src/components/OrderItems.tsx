import { money } from '@/lib/format'
import type { OrderItem } from '@/lib/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function OrderItems({
  items,
  note,
}: {
  items: OrderItem[]
  note?: string
}) {
  return (
    <div className="space-y-3 bg-muted/40 p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit price</TableHead>
            <TableHead className="text-right">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => (
            <TableRow key={it.id}>
              <TableCell>
                {it.product.name}{' '}
                <span className="text-muted-foreground">
                  ({it.product.code})
                </span>
              </TableCell>
              <TableCell className="text-right">{it.quantity}</TableCell>
              <TableCell className="text-right">{money(it.price)}</TableCell>
              <TableCell className="text-right">
                {money(it.totalPrice)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {note && <p className="text-sm text-muted-foreground">Note: {note}</p>}
    </div>
  )
}
