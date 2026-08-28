import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class ManufacturersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.manufacturer.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    })
  }

  async create(name: string) {
    await this.assertUniqueName(name)
    return this.prisma.manufacturer.create({ data: { name } })
  }

  async update(id: number, name: string) {
    await this.getOrFail(id)
    await this.assertUniqueName(name, id)
    return this.prisma.manufacturer.update({ where: { id }, data: { name } })
  }

  async remove(id: number) {
    await this.getOrFail(id)
    const inUse = await this.prisma.product.count({ where: { manufacturerId: id } })
    if (inUse > 0) {
      throw new BadRequestException('Manufacturer is used by products and cannot be deleted')
    }
    await this.prisma.manufacturer.delete({ where: { id } })
    return { ok: true }
  }

  private async getOrFail(id: number) {
    const found = await this.prisma.manufacturer.findUnique({ where: { id } })
    if (!found) throw new NotFoundException('Manufacturer not found')
    return found
  }

  private async assertUniqueName(name: string, exceptId?: number) {
    const existing = await this.prisma.manufacturer.findUnique({ where: { name } })
    if (existing && existing.id !== exceptId) {
      throw new BadRequestException('A manufacturer with this name already exists')
    }
  }
}
