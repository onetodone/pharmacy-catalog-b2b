import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, apiError } from '@/lib/api'
import { toast } from '@/components/ui/sonner'
import type { OrderStatus, PaymentStatus, Role } from '@/lib/types'

export const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

export const PAYMENT_STATUSES: PaymentStatus[] = [
  'UNPAID',
  'PENDING',
  'PAID',
  'DECLINED',
]

/** Mirrors the API's role-gated state machine (orders/order-status.ts). */
export function allowedNextStatuses(
  role: Role,
  current: OrderStatus,
): OrderStatus[] {
  if (role === 'ADMIN') return ORDER_STATUSES.filter((s) => s !== current)
  if (role === 'SUPPLIER') {
    if (current === 'PENDING') return ['PROCESSING', 'CANCELLED']
    if (current === 'PROCESSING') return ['SHIPPED', 'CANCELLED']
    return []
  }
  if (current === 'PENDING') return ['CANCELLED']
  if (current === 'SHIPPED') return ['DELIVERED']
  return []
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      api.patch(`/orders/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Order status updated')
    },
    onError: (err) => toast.error(apiError(err, 'Could not update status')),
  })
}

export function useUpdatePaymentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paymentStatus,
    }: {
      id: number
      paymentStatus: PaymentStatus
    }) => api.patch(`/orders/${id}/payment-status`, { paymentStatus }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Payment status updated')
    },
    onError: (err) =>
      toast.error(apiError(err, 'Could not update payment status')),
  })
}

export function useDeleteOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete(`/orders/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Order deleted')
    },
    onError: (err) => toast.error(apiError(err, 'Could not delete order')),
  })
}
