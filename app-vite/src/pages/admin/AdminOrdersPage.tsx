import { Fragment, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronRight, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { dateTime, money } from '@/lib/format'
import { useAuth } from '@/context/auth'
import {
  allowedNextStatuses,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  useDeleteOrder,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
} from '@/lib/orders'
import type { Order, OrderStatus, Paginated } from '@/lib/types'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = 'all'

export function AdminOrdersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState(ALL)
  const [open, setOpen] = useState<number | null>(null)

  const updateStatus = useUpdateOrderStatus()
  const updatePayment = useUpdatePaymentStatus()
  const deleteOrder = useDeleteOrder()

  const params = {
    page,
    pageSize: 10,
    status: status === ALL ? undefined : status,
  }
  const { data, isPending } = useQuery({
    queryKey: ['orders', 'admin', params],
    queryFn: async () =>
      (await api.get<Paginated<Order>>('/orders', { params })).data,
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageHeader
        title="Orders"
        description={
          isAdmin
            ? 'All orders across suppliers.'
            : 'Orders placed against you.'
        }
      />

      <div className="mb-4">
        <Select
          value={status}
          onValueChange={(v) => {
            setPage(1)
            setStatus(v)
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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
                <TableHead className="w-8" />
                <TableHead>Order</TableHead>
                <TableHead>
                  {isAdmin ? 'Customer / Supplier' : 'Customer'}
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {data?.data.map((order) => {
                const next = allowedNextStatuses(user!.role, order.status)
                const statusOptions = [order.status, ...next]
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
                      <TableCell className="text-sm">
                        {isAdmin
                          ? `${order.customer.name} / ${order.supplier.name}`
                          : order.customer.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dateTime(order.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <PaymentStatusBadge status={order.paymentStatus} />
                          <Select
                            value={order.paymentStatus}
                            onValueChange={(v) =>
                              updatePayment.mutate({
                                id: order.id,
                                paymentStatus: v as never,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-[7.5rem] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        {next.length > 0 ? (
                          <Select
                            value={order.status}
                            onValueChange={(v) =>
                              updateStatus.mutate({
                                id: order.id,
                                status: v as OrderStatus,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 w-[8.5rem] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s} value={s}>
                                  {s}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <OrderStatusBadge status={order.status} />
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {money(order.totalPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(`Delete order ${order.code}?`))
                                deleteOrder.mutate(order.id)
                            }}
                          >
                            <Trash2 className="text-destructive" />
                          </Button>
                        )}
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
                    No orders.
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
