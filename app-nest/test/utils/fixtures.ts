import * as bcrypt from 'bcryptjs'
import { OrderStatus, PaymentStatus, Role } from '@prisma/client'
import { PrismaService } from '../../src/prisma/prisma.service'

export const TEST_PASSWORD = 'testPassword'

/** Low bcrypt cost — these hashes only have to survive a test run. */
const hash = () => bcrypt.hash(TEST_PASSWORD, 4)

export interface SeededWorld {
  admin: { id: number; login: string }
  supplier1: { id: number; login: string }
  supplier2: { id: number; login: string }
  customer: { id: number; login: string }
  pendingCustomer: { id: number; login: string }
  bannedCustomer: { id: number; login: string }
  /** supplier1 product, 100 in stock @ 10.00 */
  productA: { id: number }
  /** supplier1 product, 5 in stock @ 4.00 */
  productLowStock: { id: number }
  /** supplier2 product, 100 in stock @ 7.00 */
  productC: { id: number }
}

/**
 * Minimal but complete graph: three roles, two suppliers, a handful of
 * products. Call `resetDatabase` first.
 */
export async function seedWorld(prisma: PrismaService): Promise<SeededWorld> {
  const passwordHash = await hash()

  // Kept sequential: the pg driver adapter uses one connection, so parallel
  // writes here just trip its "query already in progress" deprecation warning.
  const mkUser = (login: string, role: Role, over: Record<string, unknown> = {}) =>
    prisma.user.create({
      data: {
        login,
        email: `${login}@pharmacy.test`,
        name: `${login} Inc`,
        passwordHash,
        role,
        approved: true,
        ...over,
      },
    })

  const admin = await mkUser('admin', Role.ADMIN)
  const supplier1 = await mkUser('supplier1', Role.SUPPLIER)
  const supplier2 = await mkUser('supplier2', Role.SUPPLIER)
  const customer = await mkUser('customer1', Role.CUSTOMER)
  const pendingCustomer = await mkUser('customer2', Role.CUSTOMER, { approved: false })
  const bannedCustomer = await mkUser('customer3', Role.CUSTOMER, { banned: true })

  const category = await prisma.category.create({ data: { name: 'Analgesics' } })
  const manufacturer = await prisma.manufacturer.create({ data: { name: 'Bayer' } })

  const mkProduct = (code: string, ownerId: number, price: number, quantity: number) =>
    prisma.product.create({
      data: {
        name: `Product ${code}`,
        code,
        price,
        quantity,
        categoryId: category.id,
        manufacturerId: manufacturer.id,
        ownerId,
      },
    })

  const productA = await mkProduct('SKU-A', supplier1.id, 10, 100)
  const productLowStock = await mkProduct('SKU-LOW', supplier1.id, 4, 5)
  const productC = await mkProduct('SKU-C', supplier2.id, 7, 100)

  return {
    admin,
    supplier1,
    supplier2,
    customer,
    pendingCustomer,
    bannedCustomer,
    productA,
    productLowStock,
    productC,
  }
}

/** Create an order directly (bypasses checkout) for state-machine tests. */
export function createOrder(
  prisma: PrismaService,
  args: {
    customerId: number
    supplierId: number
    productId: number
    quantity: number
    unitPrice: number
    status?: OrderStatus
  },
) {
  const total = Number((args.unitPrice * args.quantity).toFixed(2))
  return prisma.order.create({
    data: {
      code: `TST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customerId: args.customerId,
      supplierId: args.supplierId,
      status: args.status ?? OrderStatus.PENDING,
      paymentStatus: PaymentStatus.UNPAID,
      totalPrice: total,
      items: {
        create: [{ productId: args.productId, quantity: args.quantity, price: args.unitPrice, totalPrice: total }],
      },
    },
    include: { items: true },
  })
}
