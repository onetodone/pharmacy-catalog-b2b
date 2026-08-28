import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUser } from '../common/auth-user'
import { paginate } from '../common/dto/pagination.dto'
import { CreateProductDto, ListProductsDto, UpdateProductDto } from './dto/product.dto'

const productInclude = {
  category: { select: { id: true, name: true } },
  manufacturer: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.ProductInclude

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthUser, dto: ListProductsDto) {
    const where: Prisma.ProductWhereInput = {}

    if (user.role === Role.SUPPLIER) {
      where.ownerId = user.id
      if (!dto.includeArchived) where.archived = false
    } else if (user.role === Role.CUSTOMER) {
      where.archived = false // storefront never shows archived products
    } else {
      // ADMIN
      if (dto.ownerId) where.ownerId = dto.ownerId
      if (!dto.includeArchived) where.archived = false
    }

    if (dto.categoryId) where.categoryId = dto.categoryId
    if (dto.manufacturerId) where.manufacturerId = dto.manufacturerId
    if (dto.inStock) where.quantity = { gt: 0 }
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { code: { contains: dto.search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: { id: 'desc' },
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.product.count({ where }),
    ])

    return paginate(rows, total, dto)
  }

  async getOne(user: AuthUser, id: number) {
    const product = await this.prisma.product.findUnique({ where: { id }, include: productInclude })
    if (!product) throw new NotFoundException('Product not found')

    if (user.role === Role.SUPPLIER && product.ownerId !== user.id) {
      throw new NotFoundException('Product not found')
    }
    if (user.role === Role.CUSTOMER && product.archived) {
      throw new NotFoundException('Product not found')
    }
    return product
  }

  async create(user: AuthUser, dto: CreateProductDto) {
    const ownerId = await this.resolveOwnerId(user, dto.ownerId)
    await this.assertRefs(dto.categoryId, dto.manufacturerId)
    await this.assertCodeFree(dto.code)

    return this.prisma.product.create({
      data: {
        name: dto.name,
        code: dto.code,
        price: dto.price,
        quantity: dto.quantity,
        description: dto.description,
        categoryId: dto.categoryId,
        manufacturerId: dto.manufacturerId,
        ownerId,
      },
      include: productInclude,
    })
  }

  async update(user: AuthUser, id: number, dto: UpdateProductDto) {
    const product = await this.getOwned(user, id)

    if (dto.categoryId || dto.manufacturerId) {
      await this.assertRefs(dto.categoryId ?? product.categoryId, dto.manufacturerId ?? product.manufacturerId)
    }
    if (dto.code && dto.code !== product.code) await this.assertCodeFree(dto.code)

    let ownerId = product.ownerId
    if (dto.ownerId !== undefined && dto.ownerId !== product.ownerId) {
      if (user.role !== Role.ADMIN) throw new ForbiddenException('Only an admin can reassign an owner')
      ownerId = await this.resolveOwnerId(user, dto.ownerId)
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        price: dto.price,
        quantity: dto.quantity,
        description: dto.description,
        categoryId: dto.categoryId,
        manufacturerId: dto.manufacturerId,
        archived: dto.archived,
        ownerId,
      },
      include: productInclude,
    })
  }

  async remove(user: AuthUser, id: number) {
    await this.getOwned(user, id)
    // Soft delete: order history keeps referencing the product.
    await this.prisma.product.update({ where: { id }, data: { archived: true } })
    return { ok: true }
  }

  async setCover(user: AuthUser, id: number, relativePath: string) {
    await this.getOwned(user, id)
    return this.prisma.product.update({
      where: { id },
      data: { cover: relativePath },
      include: productInclude,
    })
  }

  private async getOwned(user: AuthUser, id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } })
    if (!product) throw new NotFoundException('Product not found')
    if (user.role === Role.SUPPLIER && product.ownerId !== user.id) {
      throw new NotFoundException('Product not found')
    }
    return product
  }

  private async resolveOwnerId(user: AuthUser, ownerId?: number): Promise<number> {
    if (user.role === Role.SUPPLIER) return user.id
    if (!ownerId) throw new BadRequestException('ownerId (supplier) is required')
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } })
    if (!owner || owner.role !== Role.SUPPLIER) {
      throw new BadRequestException('ownerId must reference a supplier')
    }
    return ownerId
  }

  private async assertRefs(categoryId: number, manufacturerId: number) {
    const [cat, man] = await this.prisma.$transaction([
      this.prisma.category.count({ where: { id: categoryId } }),
      this.prisma.manufacturer.count({ where: { id: manufacturerId } }),
    ])
    if (!cat) throw new BadRequestException('Invalid category')
    if (!man) throw new BadRequestException('Invalid manufacturer')
  }

  private async assertCodeFree(code: string) {
    const existing = await this.prisma.product.findUnique({ where: { code } })
    if (existing) throw new BadRequestException('A product with this code already exists')
  }
}
