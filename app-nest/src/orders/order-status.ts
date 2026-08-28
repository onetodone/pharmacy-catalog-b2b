import { OrderStatus, Role } from '@prisma/client'

const ALL_STATUSES = Object.values(OrderStatus)

/**
 * Role-gated order state machine:
 * - ADMIN: any status.
 * - SUPPLIER (own orders): PENDING -> PROCESSING -> SHIPPED, plus CANCELLED while not shipped.
 * - CUSTOMER (own orders): PENDING -> CANCELLED, SHIPPED -> DELIVERED.
 */
export function allowedNextStatuses(role: Role, current: OrderStatus): OrderStatus[] {
  if (role === Role.ADMIN) {
    return ALL_STATUSES.filter((s) => s !== current)
  }

  if (role === Role.SUPPLIER) {
    switch (current) {
      case OrderStatus.PENDING:
        return [OrderStatus.PROCESSING, OrderStatus.CANCELLED]
      case OrderStatus.PROCESSING:
        return [OrderStatus.SHIPPED, OrderStatus.CANCELLED]
      default:
        return []
    }
  }

  // CUSTOMER
  switch (current) {
    case OrderStatus.PENDING:
      return [OrderStatus.CANCELLED]
    case OrderStatus.SHIPPED:
      return [OrderStatus.DELIVERED]
    default:
      return []
  }
}
