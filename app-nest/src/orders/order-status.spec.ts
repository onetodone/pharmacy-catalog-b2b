import { OrderStatus, Role } from '@prisma/client'
import { allowedNextStatuses } from './order-status'

describe('allowedNextStatuses', () => {
  describe('ADMIN', () => {
    it('can move to any other status', () => {
      expect(allowedNextStatuses(Role.ADMIN, OrderStatus.PENDING).sort()).toEqual(
        [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED, OrderStatus.CANCELLED].sort(),
      )
    })

    it('never offers the current status as a transition', () => {
      for (const current of Object.values(OrderStatus)) {
        expect(allowedNextStatuses(Role.ADMIN, current)).not.toContain(current)
      }
    })

    it('can still act on a terminal status (e.g. reopen a CANCELLED order)', () => {
      expect(allowedNextStatuses(Role.ADMIN, OrderStatus.DELIVERED)).toContain(OrderStatus.CANCELLED)
      expect(allowedNextStatuses(Role.ADMIN, OrderStatus.CANCELLED)).toContain(OrderStatus.PENDING)
    })
  })

  describe('SUPPLIER', () => {
    it('advances PENDING -> PROCESSING and may cancel', () => {
      expect(allowedNextStatuses(Role.SUPPLIER, OrderStatus.PENDING)).toEqual([
        OrderStatus.PROCESSING,
        OrderStatus.CANCELLED,
      ])
    })

    it('advances PROCESSING -> SHIPPED and may still cancel', () => {
      expect(allowedNextStatuses(Role.SUPPLIER, OrderStatus.PROCESSING)).toEqual([
        OrderStatus.SHIPPED,
        OrderStatus.CANCELLED,
      ])
    })

    it('cannot touch an order once SHIPPED / DELIVERED / CANCELLED', () => {
      expect(allowedNextStatuses(Role.SUPPLIER, OrderStatus.SHIPPED)).toEqual([])
      expect(allowedNextStatuses(Role.SUPPLIER, OrderStatus.DELIVERED)).toEqual([])
      expect(allowedNextStatuses(Role.SUPPLIER, OrderStatus.CANCELLED)).toEqual([])
    })

    it('cannot mark an order DELIVERED (that is the customer confirming receipt)', () => {
      expect(allowedNextStatuses(Role.SUPPLIER, OrderStatus.PROCESSING)).not.toContain(OrderStatus.DELIVERED)
    })
  })

  describe('CUSTOMER', () => {
    it('may cancel only while still PENDING', () => {
      expect(allowedNextStatuses(Role.CUSTOMER, OrderStatus.PENDING)).toEqual([OrderStatus.CANCELLED])
    })

    it('cannot cancel once the supplier is PROCESSING the order', () => {
      expect(allowedNextStatuses(Role.CUSTOMER, OrderStatus.PROCESSING)).toEqual([])
    })

    it('confirms receipt with SHIPPED -> DELIVERED', () => {
      expect(allowedNextStatuses(Role.CUSTOMER, OrderStatus.SHIPPED)).toEqual([OrderStatus.DELIVERED])
    })

    it('has no moves left from DELIVERED / CANCELLED', () => {
      expect(allowedNextStatuses(Role.CUSTOMER, OrderStatus.DELIVERED)).toEqual([])
      expect(allowedNextStatuses(Role.CUSTOMER, OrderStatus.CANCELLED)).toEqual([])
    })
  })
})
