import { Badge } from '@/components/ui/badge'
import type { OrderStatus, PaymentStatus, Role } from '@/lib/types'

const ORDER_VARIANT: Record<
  OrderStatus,
  React.ComponentProps<typeof Badge>['variant']
> = {
  PENDING: 'warning',
  PROCESSING: 'info',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
}

const PAYMENT_VARIANT: Record<
  PaymentStatus,
  React.ComponentProps<typeof Badge>['variant']
> = {
  UNPAID: 'secondary',
  PENDING: 'warning',
  PAID: 'success',
  DECLINED: 'destructive',
}

const ROLE_VARIANT: Record<
  Role,
  React.ComponentProps<typeof Badge>['variant']
> = {
  ADMIN: 'default',
  SUPPLIER: 'info',
  CUSTOMER: 'secondary',
}

export const OrderStatusBadge = ({ status }: { status: OrderStatus }) => (
  <Badge variant={ORDER_VARIANT[status]}>{status}</Badge>
)

export const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <Badge variant={PAYMENT_VARIANT[status]}>{status}</Badge>
)

export const RoleBadge = ({ role }: { role: Role }) => (
  <Badge variant={ROLE_VARIANT[role]}>{role}</Badge>
)

export function UserStatusBadge({
  approved,
  banned,
}: {
  approved: boolean
  banned: boolean
}) {
  if (banned) return <Badge variant="destructive">Banned</Badge>
  if (!approved) return <Badge variant="warning">Pending</Badge>
  return <Badge variant="success">Active</Badge>
}
