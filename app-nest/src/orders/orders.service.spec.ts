import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrderStatus, PaymentStatus, Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUser } from '../common/auth-user'
import { OrdersService } from './orders.service'

const admin: AuthUser = { id: 1, login: 'admin', name: 'Admin', email: 'a@x', role: Role.ADMIN, sid: 's-a' }
const supplier1: AuthUser = { id: 10, login: 's1', name: 'S1', email: 's1@x', role: Role.SUPPLIER, sid: 's-1' }
const supplier2: AuthUser = { id: 20, login: 's2', name: 'S2', email: 's2@x', role: Role.SUPPLIER, sid: 's-2' }
const customer: AuthUser = { id: 30, login: 'c1', name: 'C1', email: 'c1@x', role: Role.CUSTOMER, sid: 's-c' }

interface ProductRow {
  id: number
  name: string
  price: number
  quantity: number
  ownerId: number
  archived: boolean
}

const product = (over: Partial<ProductRow> & { id: number }): ProductRow => ({
  name: `Product ${over.id}`,
  price: 10,
  quantity: 100,
  ownerId: supplier1.id,
  archived: false,
  ...over,
})

describe('OrdersService', () => {
  let service: OrdersService
  let prisma: {
    product: { findMany: jest.Mock; update: jest.Mock }
    order: {
      create: jest.Mock
      update: jest.Mock
      findUnique: jest.Mock
      findMany: jest.Mock
      count: jest.Mock
      delete: jest.Mock
    }
    $transaction: jest.Mock
  }

  beforeEach(async () => {
    let orderSeq = 100
    prisma = {
      product: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        create: jest.fn(({ data }: any) => Promise.resolve({ id: ++orderSeq, ...data })),
        update: jest.fn(({ data }: any) => Promise.resolve({ id: orderSeq, ...data })),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        delete: jest.fn().mockResolvedValue({}),
      },
      // Supports both call styles: `$transaction(cb)` and `$transaction([...])`.
      $transaction: jest.fn((arg: any) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma))),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(OrdersService)
    delete process.env.MIN_ORDER_TOTAL
  })

  afterEach(() => jest.clearAllMocks())

  // ─── checkout ────────────────────────────────────────────────────────────────

  describe('checkout', () => {
    it('creates one order per supplier and returns them', async () => {
      prisma.product.findMany.mockResolvedValue([
        product({ id: 1, ownerId: supplier1.id, price: 10, quantity: 100 }),
        product({ id: 2, ownerId: supplier1.id, price: 5, quantity: 100 }),
        product({ id: 3, ownerId: supplier2.id, price: 7, quantity: 100 }),
      ])
      const created = [{ id: 101 }, { id: 102 }]
      prisma.order.findMany.mockResolvedValue(created)

      const result = await service.checkout(customer, {
        items: [
          { productId: 1, quantity: 2 },
          { productId: 2, quantity: 3 },
          { productId: 3, quantity: 1 },
        ],
      })

      expect(prisma.order.create).toHaveBeenCalledTimes(2)
      // supplier1 order total: 10*2 + 5*3 = 35
      expect(prisma.order.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          data: expect.objectContaining({
            customerId: customer.id,
            supplierId: supplier1.id,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            totalPrice: 35,
          }),
        }),
      )
      // supplier2 order total: 7*1 = 7
      expect(prisma.order.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ data: expect.objectContaining({ supplierId: supplier2.id, totalPrice: 7 }) }),
      )
      expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [101, 102] } } }))
      expect(result).toBe(created)
    })

    it('runs the whole checkout inside a single transaction', async () => {
      prisma.product.findMany.mockResolvedValue([product({ id: 1 })])
      await service.checkout(customer, { items: [{ productId: 1, quantity: 1 }] })
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      expect(typeof prisma.$transaction.mock.calls[0][0]).toBe('function')
    })

    it('merges duplicate lines for the same product before checking stock', async () => {
      prisma.product.findMany.mockResolvedValue([product({ id: 1, quantity: 5 })])

      await service.checkout(customer, {
        items: [
          { productId: 1, quantity: 2 },
          { productId: 1, quantity: 3 },
        ],
      })

      // 2 + 3 = 5, exactly the stock on hand — one decrement of 5.
      expect(prisma.product.update).toHaveBeenCalledTimes(1)
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { quantity: { decrement: 5 } },
      })
    })

    it('rejects when the merged quantity exceeds stock', async () => {
      prisma.product.findMany.mockResolvedValue([product({ id: 1, name: 'Aspirin', quantity: 4 })])

      await expect(
        service.checkout(customer, {
          items: [
            { productId: 1, quantity: 2 },
            { productId: 1, quantity: 3 },
          ],
        }),
      ).rejects.toThrow(/only has 4 left in stock/)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('rejects when a product is missing or archived', async () => {
      // Asked for 2 ids, only 1 comes back (the other is archived / deleted).
      prisma.product.findMany.mockResolvedValue([product({ id: 1 })])

      await expect(
        service.checkout(customer, {
          items: [
            { productId: 1, quantity: 1 },
            { productId: 2, quantity: 1 },
          ],
        }),
      ).rejects.toThrow(/no longer available/)
    })

    it('enforces MIN_ORDER_TOTAL', async () => {
      process.env.MIN_ORDER_TOTAL = '50'
      prisma.product.findMany.mockResolvedValue([product({ id: 1, price: 10, quantity: 100 })])

      await expect(service.checkout(customer, { items: [{ productId: 1, quantity: 2 }] })).rejects.toThrow(
        /minimum order total is \$50\.00/,
      )
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('decrements stock for every ordered line', async () => {
      prisma.product.findMany.mockResolvedValue([
        product({ id: 1, ownerId: supplier1.id }),
        product({ id: 2, ownerId: supplier2.id }),
      ])

      await service.checkout(customer, {
        items: [
          { productId: 1, quantity: 4 },
          { productId: 2, quantity: 6 },
        ],
      })

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { quantity: { decrement: 4 } },
      })
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { quantity: { decrement: 6 } },
      })
    })

    it('rewrites the placeholder code into the SSS-NNNNN form', async () => {
      prisma.product.findMany.mockResolvedValue([product({ id: 1, ownerId: supplier2.id })])
      prisma.order.create.mockResolvedValueOnce({ id: 42 })

      await service.checkout(customer, { items: [{ productId: 1, quantity: 1 }] })

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { code: '020-00042' },
      })
    })
  })

  // ─── updateStatus ────────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    const orderRow = (over: Partial<{ status: OrderStatus; items: { productId: number; quantity: number }[] }>) => ({
      id: 1,
      customerId: customer.id,
      supplierId: supplier1.id,
      status: OrderStatus.PENDING,
      items: [{ productId: 5, quantity: 3 }],
      ...over,
    })

    it('404s when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null)
      await expect(service.updateStatus(admin, 1, OrderStatus.PROCESSING)).rejects.toThrow(NotFoundException)
    })

    it('404s (not 403) when the caller is not allowed to see the order', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ status: OrderStatus.PENDING }))
      await expect(service.updateStatus(supplier2, 1, OrderStatus.PROCESSING)).rejects.toThrow(NotFoundException)
    })

    it('forbids a transition the role/state machine disallows', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ status: OrderStatus.PENDING }))
      // A customer cannot push an order to PROCESSING.
      await expect(service.updateStatus(customer, 1, OrderStatus.PROCESSING)).rejects.toThrow(ForbiddenException)
    })

    it('restocks every item when an order is CANCELLED', async () => {
      prisma.order.findUnique.mockResolvedValue(
        orderRow({
          status: OrderStatus.PENDING,
          items: [
            { productId: 5, quantity: 3 },
            { productId: 6, quantity: 2 },
          ],
        }),
      )
      prisma.order.update.mockResolvedValue({ id: 1, status: OrderStatus.CANCELLED })

      await service.updateStatus(supplier1, 1, OrderStatus.CANCELLED)

      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { quantity: { increment: 3 } },
      })
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 6 },
        data: { quantity: { increment: 2 } },
      })
      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { status: OrderStatus.CANCELLED } }),
      )
    })

    it('does NOT touch stock on a non-cancel transition', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ status: OrderStatus.PENDING }))
      prisma.order.update.mockResolvedValue({ id: 1, status: OrderStatus.PROCESSING })

      await service.updateStatus(supplier1, 1, OrderStatus.PROCESSING)

      expect(prisma.product.update).not.toHaveBeenCalled()
    })

    it('runs the status change (and any restock) in a transaction', async () => {
      prisma.order.findUnique.mockResolvedValue(orderRow({ status: OrderStatus.PENDING }))
      prisma.order.update.mockResolvedValue({ id: 1 })
      await service.updateStatus(admin, 1, OrderStatus.PROCESSING)
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
    })
  })

  // ─── updatePaymentStatus ─────────────────────────────────────────────────────

  describe('updatePaymentStatus', () => {
    const row = { id: 1, customerId: customer.id, supplierId: supplier1.id }

    it('forbids customers from changing the payment status', async () => {
      prisma.order.findUnique.mockResolvedValue(row)
      await expect(service.updatePaymentStatus(customer, 1, PaymentStatus.PAID)).rejects.toThrow(ForbiddenException)
    })

    it('lets a supplier mark their own order PAID', async () => {
      prisma.order.findUnique.mockResolvedValue(row)
      prisma.order.update.mockResolvedValue({ id: 1, paymentStatus: PaymentStatus.PAID })

      await service.updatePaymentStatus(supplier1, 1, PaymentStatus.PAID)

      expect(prisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { paymentStatus: PaymentStatus.PAID } }),
      )
    })

    it('404s when a supplier targets an order that is not theirs', async () => {
      prisma.order.findUnique.mockResolvedValue(row)
      await expect(service.updatePaymentStatus(supplier2, 1, PaymentStatus.PAID)).rejects.toThrow(NotFoundException)
    })
  })

  // ─── getOne / list / remove ──────────────────────────────────────────────────

  describe('getOne', () => {
    it('404s when the order is not visible to the caller', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1, customerId: customer.id, supplierId: supplier1.id })
      await expect(service.getOne(supplier2, 1)).rejects.toThrow(NotFoundException)
    })

    it('returns the order to its customer', async () => {
      const order = { id: 1, customerId: customer.id, supplierId: supplier1.id }
      prisma.order.findUnique.mockResolvedValue(order)
      await expect(service.getOne(customer, 1)).resolves.toBe(order)
    })
  })

  describe('list', () => {
    const listDto = { page: 1, pageSize: 20 } as Parameters<OrdersService['list']>[1]

    it('scopes a supplier to orders they fulfil', async () => {
      await service.list(supplier1, listDto)
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { supplierId: supplier1.id } }),
      )
    })

    it('scopes a customer to their own orders', async () => {
      await service.list(customer, listDto)
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: customer.id } }),
      )
    })

    it('does not scope an admin, but forwards status / payment / search filters', async () => {
      await service.list(admin, {
        ...listDto,
        status: OrderStatus.SHIPPED,
        paymentStatus: PaymentStatus.PAID,
        search: '020-',
      } as Parameters<OrdersService['list']>[1])

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: OrderStatus.SHIPPED,
            paymentStatus: PaymentStatus.PAID,
            code: { contains: '020-', mode: 'insensitive' },
          },
        }),
      )
    })

    it('returns a paginated envelope', async () => {
      prisma.order.findMany.mockResolvedValue([{ id: 1 }])
      prisma.order.count.mockResolvedValue(1)
      const result = await service.list(admin, listDto)
      expect(result).toEqual({ data: [{ id: 1 }], total: 1, page: 1, pageSize: 20, pageCount: 1 })
    })
  })

  describe('remove', () => {
    it('404s when the order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null)
      await expect(service.remove(1)).rejects.toThrow(NotFoundException)
    })

    it('deletes an existing order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 1 })
      await expect(service.remove(1)).resolves.toEqual({ ok: true })
      expect(prisma.order.delete).toHaveBeenCalledWith({ where: { id: 1 } })
    })
  })
})
