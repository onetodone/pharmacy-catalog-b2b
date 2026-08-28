import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus, PaymentStatus, Prisma, Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUser } from '../common/auth-user'
import { paginate } from '../common/dto/pagination.dto'
import { CheckoutDto, ListOrdersDto } from './dto/order.dto'
import { allowedNextStatuses } from './order-status'

const orderInclude = {
  items: {
    include: { product: { select: { id: true, name: true, code: true } } },
  },
  customer: { select: { id: true, name: true, email: true } },
  supplier: { select: { id: true, name: true, email: true } },
} satisfies Prisma.OrderInclude

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private get minOrderTotal(): number {
    return Number(process.env.MIN_ORDER_TOTAL ?? 0)
  }

  async checkout(user: AuthUser, dto: CheckoutDto) {
    // Merge duplicate lines.
    const merged = new Map<number, number>()
    for (const item of dto.items) {
      merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity)
    }
    const productIds = [...merged.keys()]

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, archived: false },
    })
    if (products.length !== productIds.length) {
      throw new BadRequestException('One or more products are no longer available')
    }

    let grandTotal = 0
    for (const product of products) {
      const qty = merged.get(product.id)!
      if (product.quantity < qty) {
        throw new BadRequestException(`"${product.name}" only has ${product.quantity} left in stock`)
      }
      grandTotal += Number(product.price) * qty
    }
    if (grandTotal < this.minOrderTotal) {
      throw new BadRequestException(`The minimum order total is $${this.minOrderTotal.toFixed(2)}`)
    }

    // Group by supplier (product.ownerId) -> one order per supplier.
    const bySupplier = new Map<number, typeof products>()
    for (const product of products) {
      const list = bySupplier.get(product.ownerId) ?? []
      list.push(product)
      bySupplier.set(product.ownerId, list)
    }

    const createdIds = await this.prisma.$transaction(async (tx) => {
      const ids: number[] = []
      for (const [supplierId, supplierProducts] of bySupplier) {
        const items = supplierProducts.map((product) => {
          const quantity = merged.get(product.id)!
          const price = Number(product.price)
          return {
            productId: product.id,
            quantity,
            price,
            totalPrice: Number((price * quantity).toFixed(2)),
          }
        })
        const orderTotal = items.reduce((sum, i) => sum + i.totalPrice, 0)

        const order = await tx.order.create({
          data: {
            code: `TMP-${supplierId}-${Date.now()}`,
            customerId: user.id,
            supplierId,
            status: OrderStatus.PENDING,
            paymentStatus: PaymentStatus.UNPAID,
            totalPrice: Number(orderTotal.toFixed(2)),
            note: dto.note ?? '',
            items: { create: items },
          },
        })

        // Final human-readable code: "SSS-NNNNN".
        await tx.order.update({
          where: { id: order.id },
          data: {
            code: `${String(supplierId).padStart(3, '0')}-${String(order.id).padStart(5, '0')}`,
          },
        })

        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          })
        }
        ids.push(order.id)
      }
      return ids
    })

    return this.prisma.order.findMany({
      where: { id: { in: createdIds } },
      include: orderInclude,
      orderBy: { id: 'asc' },
    })
  }

  async list(user: AuthUser, dto: ListOrdersDto) {
    const where: Prisma.OrderWhereInput = {}
    if (user.role === Role.SUPPLIER) where.supplierId = user.id
    if (user.role === Role.CUSTOMER) where.customerId = user.id
    if (dto.status) where.status = dto.status
    if (dto.paymentStatus) where.paymentStatus = dto.paymentStatus
    if (dto.search) where.code = { contains: dto.search, mode: 'insensitive' }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { id: 'desc' },
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.order.count({ where }),
    ])

    return paginate(rows, total, dto)
  }

  async getOne(user: AuthUser, id: number) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: orderInclude })
    if (!order || !this.canSee(user, order)) throw new NotFoundException('Order not found')
    return order
  }

  async updateStatus(user: AuthUser, id: number, next: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } })
    if (!order || !this.canSee(user, order)) throw new NotFoundException('Order not found')

    if (!allowedNextStatuses(user.role, order.status).includes(next)) {
      throw new ForbiddenException(`Cannot move an order from ${order.status} to ${next}`)
    }

    return this.prisma.$transaction(async (tx) => {
      if (next === OrderStatus.CANCELLED) {
        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          })
        }
      }
      return tx.order.update({ where: { id }, data: { status: next }, include: orderInclude })
    })
  }

  async updatePaymentStatus(user: AuthUser, id: number, next: PaymentStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order || !this.canSee(user, order)) throw new NotFoundException('Order not found')
    if (user.role === Role.CUSTOMER) {
      throw new ForbiddenException('Customers cannot change the payment status')
    }
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus: next },
      include: orderInclude,
    })
  }

  async remove(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } })
    if (!order) throw new NotFoundException('Order not found')
    await this.prisma.order.delete({ where: { id } })
    return { ok: true }
  }

  private canSee(user: AuthUser, order: { customerId: number; supplierId: number }) {
    if (user.role === Role.ADMIN) return true
    if (user.role === Role.SUPPLIER) return order.supplierId === user.id
    return order.customerId === user.id
  }
}
