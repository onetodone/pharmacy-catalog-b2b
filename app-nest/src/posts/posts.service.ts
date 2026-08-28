import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { paginate } from '../common/dto/pagination.dto'
import { PaginationDto } from '../common/dto/pagination.dto'

const include = { author: { select: { id: true, name: true } } }

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: PaginationDto) {
    const where = dto.search ? { title: { contains: dto.search, mode: 'insensitive' as const } } : {}
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        include,
        orderBy: { id: 'desc' },
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.post.count({ where }),
    ])
    return paginate(rows, total, dto)
  }

  async getOne(id: number) {
    const post = await this.prisma.post.findUnique({ where: { id }, include })
    if (!post) throw new NotFoundException('Post not found')
    return post
  }

  create(authorId: number, data: { title: string; content: string }) {
    return this.prisma.post.create({ data: { ...data, authorId }, include })
  }

  async update(id: number, data: { title?: string; content?: string }) {
    await this.getOne(id)
    return this.prisma.post.update({ where: { id }, data, include })
  }

  async remove(id: number) {
    await this.getOne(id)
    await this.prisma.post.delete({ where: { id } })
    return { ok: true }
  }
}
