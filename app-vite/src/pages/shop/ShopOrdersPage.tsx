import { Fragment, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { dateTime, money } from '@/lib/format'
import { allowedNextStatuses, useUpdateOrderStatus } from '@/lib/orders'
import type { Order, Paginated } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Pagination } from '@/components/Pagination'
import { OrderItems } from '@/components/OrderItems'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ShopOrdersPage() {
  const [page, setPage] = useState(1)
  const [open, setOpen] = useState<number | null>(null)
  const updateStatus = useUpdateOrderStatus()

  const { data, isPending } = useQuery({
    queryKey: ['orders', 'shop', page],
    queryFn: async () =>
      (
        await api.get<Paginated<Order>>('/orders', {
          params: { page, pageSize: 10 },
        })
      ).data,
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader
        title="My Orders"
        description="Track your orders and confirm deliveries."
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Order</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.data.map((order) => {
                const next = allowedNextStatuses('CUSTOMER', order.status)
                return (
                  <Fragment key={order.id}>
                    <TableRow>
                      <TableCell>
                        <button
                          onClick={() =>
                            setOpen(open === order.id ? null : order.id)
                          }
                        >
                          {open === order.id ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">
                        {order.code}
                      </TableCell>
                      <TableCell>{order.supplier.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateTime(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <PaymentStatusBadge status={order.paymentStatus} />
                      </TableCell>
                      <TableCell>
                        <OrderStatusBadge status={order.status} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {money(order.totalPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {next.includes('CANCELLED') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateStatus.mutate({
                                  id: order.id,
                                  status: 'CANCELLED',
                                })
                              }
                            >
                              Cancel
                            </Button>
                          )}
                          {next.includes('DELIVERED') && (
                            <Button
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  id: order.id,
                                  status: 'DELIVERED',
                                })
                              }
                            >
                              Confirm delivery
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {open === order.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <OrderItems items={order.items} note={order.note} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
              {data && data.data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground"
                  >
                    You have no orders yet.
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
