import request from 'supertest'
import { OrderStatus } from '@prisma/client'
import { bearerFor, createE2EApp, E2EContext, resetDatabase } from './utils/e2e-app'
import { createOrder, seedWorld, SeededWorld } from './utils/fixtures'

describe('Orders (e2e)', () => {
  let ctx: E2EContext
  let world: SeededWorld
  let asCustomer: string
  let asSupplier1: string
  let asSupplier2: string
  let asAdmin: string

  beforeAll(async () => {
    ctx = await createE2EApp()
  })

  afterAll(async () => {
    await ctx.app.close()
  })

  beforeEach(async () => {
    await resetDatabase(ctx.prisma)
    world = await seedWorld(ctx.prisma)
    asCustomer = await bearerFor(ctx, 'customer1')
    asSupplier1 = await bearerFor(ctx, 'supplier1')
    asSupplier2 = await bearerFor(ctx, 'supplier2')
    asAdmin = await bearerFor(ctx, 'admin')
  })

  const stockOf = (id: number) => ctx.prisma.product.findUniqueOrThrow({ where: { id } }).then((p) => p.quantity)

  // ─── checkout ────────────────────────────────────────────────────────────────

  describe('POST /api/orders/checkout', () => {
    it('splits a mixed cart into one order per supplier and decrements stock', async () => {
      const res = await request(ctx.server)
        .post('/api/orders/checkout')
        .set('Authorization', asCustomer)
        .send({
          items: [
            { productId: world.productA.id, quantity: 3 },
            { productId: world.productC.id, quantity: 2 },
          ],
        })
        .expect(201)

      expect(res.body).toHaveLength(2)
      const suppliers = res.body.map((o: { supplier: { id: number } }) => o.supplier.id).sort()
      expect(suppliers).toEqual([world.supplier1.id, world.supplier2.id].sort())
      for (const order of res.body) {
        expect(order.status).toBe(OrderStatus.PENDING)
        expect(order.code).toMatch(/^\d{3}-\d{5}$/)
      }

      expect(await stockOf(world.productA.id)).toBe(97)
      expect(await stockOf(world.productC.id)).toBe(98)
    })

    it('rejects an over-stock cart without creating an order or moving stock', async () => {
      await request(ctx.server)
        .post('/api/orders/checkout')
        .set('Authorization', asCustomer)
        .send({ items: [{ productId: world.productLowStock.id, quantity: 6 }] })
        .expect(400)

      expect(await stockOf(world.productLowStock.id)).toBe(5)
      expect(await ctx.prisma.order.count()).toBe(0)
    })

    it('is forbidden for a supplier', async () => {
      await request(ctx.server)
        .post('/api/orders/checkout')
        .set('Authorization', asSupplier1)
        .send({ items: [{ productId: world.productA.id, quantity: 1 }] })
        .expect(403)
    })
  })

  // ─── visibility scoping ──────────────────────────────────────────────────────

  describe('GET /api/orders', () => {
    beforeEach(async () => {
      await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier1.id,
        productId: world.productA.id,
        quantity: 1,
        unitPrice: 10,
      })
      await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier2.id,
        productId: world.productC.id,
        quantity: 1,
        unitPrice: 7,
      })
    })

    it('shows a supplier only the orders they fulfil', async () => {
      const res = await request(ctx.server).get('/api/orders').set('Authorization', asSupplier1).expect(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.data[0].supplier.id).toBe(world.supplier1.id)
    })

    it('shows the customer both of their orders', async () => {
      const res = await request(ctx.server).get('/api/orders').set('Authorization', asCustomer).expect(200)
      expect(res.body.data).toHaveLength(2)
    })

    it('shows an admin everything', async () => {
      const res = await request(ctx.server).get('/api/orders').set('Authorization', asAdmin).expect(200)
      expect(res.body.total).toBe(2)
    })
  })

  // ─── state machine + restock ─────────────────────────────────────────────────

  describe('PATCH /api/orders/:id/status', () => {
    it('walks PENDING → PROCESSING → SHIPPED (supplier) → DELIVERED (customer)', async () => {
      const order = await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier1.id,
        productId: world.productA.id,
        quantity: 1,
        unitPrice: 10,
      })

      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asSupplier1)
        .send({ status: OrderStatus.PROCESSING })
        .expect(200)
      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asSupplier1)
        .send({ status: OrderStatus.SHIPPED })
        .expect(200)

      // Supplier cannot mark it DELIVERED — that is the customer confirming receipt.
      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asSupplier1)
        .send({ status: OrderStatus.DELIVERED })
        .expect(403)

      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asCustomer)
        .send({ status: OrderStatus.DELIVERED })
        .expect(200)
    })

    it('forbids a customer from pushing an order into PROCESSING', async () => {
      const order = await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier1.id,
        productId: world.productA.id,
        quantity: 1,
        unitPrice: 10,
      })
      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asCustomer)
        .send({ status: OrderStatus.PROCESSING })
        .expect(403)
    })

    it('restocks every line when an order is cancelled', async () => {
      const before = await stockOf(world.productA.id)
      const order = await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier1.id,
        productId: world.productA.id,
        quantity: 4,
        unitPrice: 10,
      })

      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asCustomer)
        .send({ status: OrderStatus.CANCELLED })
        .expect(200)

      expect(await stockOf(world.productA.id)).toBe(before + 4)
    })

    it('hides another supplier’s order behind a 404', async () => {
      const order = await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier1.id,
        productId: world.productA.id,
        quantity: 1,
        unitPrice: 10,
      })
      await request(ctx.server)
        .patch(`/api/orders/${order.id}/status`)
        .set('Authorization', asSupplier2)
        .send({ status: OrderStatus.PROCESSING })
        .expect(404)
    })
  })

  // ─── payment status + delete guards ──────────────────────────────────────────

  describe('guards', () => {
    let orderId: number

    beforeEach(async () => {
      const order = await createOrder(ctx.prisma, {
        customerId: world.customer.id,
        supplierId: world.supplier1.id,
        productId: world.productA.id,
        quantity: 1,
        unitPrice: 10,
      })
      orderId = order.id
    })

    it('lets a supplier set the payment status but not a customer', async () => {
      await request(ctx.server)
        .patch(`/api/orders/${orderId}/payment-status`)
        .set('Authorization', asCustomer)
        .send({ paymentStatus: 'PAID' })
        .expect(403)

      await request(ctx.server)
        .patch(`/api/orders/${orderId}/payment-status`)
        .set('Authorization', asSupplier1)
        .send({ paymentStatus: 'PAID' })
        .expect(200)
    })

    it('only lets an admin delete an order', async () => {
      await request(ctx.server).delete(`/api/orders/${orderId}`).set('Authorization', asSupplier1).expect(403)

      await request(ctx.server).delete(`/api/orders/${orderId}`).set('Authorization', asAdmin).expect(200)
      expect(await ctx.prisma.order.count()).toBe(0)
    })
  })
})
