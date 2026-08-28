import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, DollarSign, Package, ShoppingBag } from 'lucide-react'
import { api } from '@/lib/api'
import { dateTime, money } from '@/lib/format'
import { useAuth } from '@/context/auth'
import type { StatsOverview } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/badges'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardPage() {
  const { user } = useAuth()
  const { data, isPending } = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: async () => (await api.get<StatsOverview>('/stats/overview')).data,
  })

  if (isPending || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Products', value: data.productCount, icon: Package },
    { label: 'Orders', value: data.orderCount, icon: ShoppingBag },
    { label: 'Low stock (≤5)', value: data.lowStock, icon: AlertTriangle },
    { label: 'Paid revenue', value: money(data.paidRevenue), icon: DollarSign },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          user?.role === 'SUPPLIER'
            ? 'Your products and incoming orders.'
            : 'Platform overview.'
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-secondary p-2">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.ordersByStatus).map(([status, count]) => (
              <div
                key={status}
                className="flex items-center justify-between text-sm"
              >
                <OrderStatusBadge status={status as never} />
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent orders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentOrders.length === 0 && (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
            {data.recentOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <div>
                  <div className="font-medium">{o.code}</div>
                  <div className="text-xs text-muted-foreground">
                    {user?.role === 'ADMIN' ? o.customer.name : o.customer.name}{' '}
                    · {dateTime(o.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PaymentStatusBadge status={o.paymentStatus} />
                  <OrderStatusBadge status={o.status} />
                  <span className="w-20 text-right font-medium">
                    {money(o.totalPrice)}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {data.latestPosts.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Latest news</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.latestPosts.map((p) => (
              <div key={p.id}>
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-muted-foreground">
                  {p.content.length > 160
                    ? `${p.content.slice(0, 160)}…`
                    : p.content}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
