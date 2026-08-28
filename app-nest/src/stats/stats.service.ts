import { Injectable } from '@nestjs/common'
import { OrderStatus, Prisma, Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUser } from '../common/auth-user'

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser) {
    const isAdmin = user.role === Role.ADMIN
    const productWhere: Prisma.ProductWhereInput = isAdmin ? {} : { ownerId: user.id }
    const orderWhere: Prisma.OrderWhereInput = isAdmin ? {} : { supplierId: user.id }

    const [productCount, lowStock, orderGroups, revenueAgg, recentOrders, latestPosts, userCounts] = await Promise.all([
      this.prisma.product.count({ where: { ...productWhere, archived: false } }),
      this.prisma.product.count({ where: { ...productWhere, archived: false, quantity: { lte: 5 } } }),
      this.prisma.order.groupBy({ by: ['status'], where: orderWhere, _count: { _all: true } }),
      this.prisma.order.aggregate({
        where: { ...orderWhere, paymentStatus: 'PAID' },
        _sum: { totalPrice: true },
      }),
      this.prisma.order.findMany({
        where: orderWhere,
        orderBy: { id: 'desc' },
        take: 5,
        include: {
          customer: { select: { name: true } },
          supplier: { select: { name: true } },
        },
      }),
      this.prisma.post.findMany({
        orderBy: { id: 'desc' },
        take: 3,
        include: { author: { select: { name: true } } },
      }),
      isAdmin ? this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }) : Promise.resolve([]),
    ])

    const ordersByStatus = Object.fromEntries(Object.values(OrderStatus).map((s) => [s, 0])) as Record<
      OrderStatus,
      number
    >
    for (const g of orderGroups) ordersByStatus[g.status] = g._count._all

    const usersByRole = Object.fromEntries(
      (userCounts as { role: Role; _count: { _all: number } }[]).map((g) => [g.role, g._count._all]),
    )

    return {
      productCount,
      lowStock,
      orderCount: Object.values(ordersByStatus).reduce((a, b) => a + b, 0),
      ordersByStatus,
      paidRevenue: Number(revenueAgg._sum.totalPrice ?? 0),
      recentOrders,
      latestPosts,
      usersByRole,
    }
  }
}
