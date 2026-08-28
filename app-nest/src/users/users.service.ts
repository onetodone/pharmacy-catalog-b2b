import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { Prisma, User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { paginate, Paginated } from '../common/dto/pagination.dto'
import { publicUser } from '../auth/auth.service'
import { ChangePasswordDto, CreateUserDto, ListUsersDto, UpdateMeDto, UpdateUserDto } from './dto/user.dto'

type PublicUser = Omit<User, 'passwordHash'>

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(dto: ListUsersDto): Promise<Paginated<PublicUser>> {
    const where: Prisma.UserWhereInput = {}
    if (dto.role) where.role = dto.role
    if (dto.search) {
      where.OR = [
        { name: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { login: { contains: dto.search, mode: 'insensitive' } },
      ]
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'asc' },
        skip: (dto.page - 1) * dto.pageSize,
        take: dto.pageSize,
      }),
      this.prisma.user.count({ where }),
    ])

    return paginate(rows.map(publicUser), total, dto)
  }

  async getOne(id: number): Promise<PublicUser> {
    return publicUser(await this.getOrFail(id))
  }

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ login: dto.login }, { email: dto.email }] },
    })
    if (clash) throw new BadRequestException('A user with this login or email already exists')

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        email: dto.email,
        name: dto.name,
        role: dto.role,
        passwordHash: await bcrypt.hash(dto.password, 10),
        approved: true, // admin-created accounts are active immediately
        phone: dto.phone ?? null,
        taxId: dto.taxId ?? null,
        managerName: dto.managerName ?? null,
        address: dto.address ?? null,
      },
    })
    return publicUser(user)
  }

  async update(actingUserId: number, id: number, dto: UpdateUserDto): Promise<PublicUser> {
    const target = await this.getOrFail(id)

    if (id === actingUserId && dto.role && dto.role !== target.role) {
      throw new ForbiddenException('You cannot change your own role')
    }
    if (id === actingUserId && dto.banned === true) {
      throw new ForbiddenException('You cannot ban yourself')
    }

    if (dto.login && dto.login !== target.login) {
      const clash = await this.prisma.user.findUnique({ where: { login: dto.login } })
      if (clash) throw new BadRequestException('A user with this login already exists')
    }
    if (dto.email && dto.email !== target.email) {
      const clash = await this.prisma.user.findUnique({ where: { email: dto.email } })
      if (clash) throw new BadRequestException('A user with this email already exists')
    }

    const data: Prisma.UserUpdateInput = {
      login: dto.login,
      email: dto.email,
      name: dto.name,
      role: dto.role,
      approved: dto.approved,
      banned: dto.banned,
      phone: dto.phone,
      taxId: dto.taxId,
      managerName: dto.managerName,
      address: dto.address,
    }
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10)

    const updated = await this.prisma.user.update({ where: { id }, data })
    return publicUser(updated)
  }

  async remove(actingUserId: number, id: number) {
    if (id === actingUserId) throw new ForbiddenException('You cannot delete your own account')
    await this.getOrFail(id)

    const [products, orders, posts] = await this.prisma.$transaction([
      this.prisma.product.count({ where: { ownerId: id } }),
      this.prisma.order.count({ where: { OR: [{ customerId: id }, { supplierId: id }] } }),
      this.prisma.post.count({ where: { authorId: id } }),
    ])
    if (products || orders || posts) {
      throw new BadRequestException(
        'This user has related products, orders or posts. Ban the account instead of deleting it.',
      )
    }

    await this.prisma.user.delete({ where: { id } })
    return { ok: true }
  }

  async setApproved(id: number, approved: boolean): Promise<PublicUser> {
    await this.getOrFail(id)
    return publicUser(await this.prisma.user.update({ where: { id }, data: { approved } }))
  }

  async setBanned(actingUserId: number, id: number, banned: boolean): Promise<PublicUser> {
    if (id === actingUserId) throw new ForbiddenException('You cannot ban yourself')
    await this.getOrFail(id)
    return publicUser(await this.prisma.user.update({ where: { id }, data: { banned } }))
  }

  async updateMe(id: number, dto: UpdateMeDto): Promise<PublicUser> {
    if (dto.email) {
      const clash = await this.prisma.user.findFirst({
        where: { email: dto.email, NOT: { id } },
      })
      if (clash) throw new BadRequestException('A user with this email already exists')
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { ...dto } })
    return publicUser(updated)
  }

  async changePassword(id: number, dto: ChangePasswordDto) {
    const user = await this.getOrFail(id)
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException('Current password is incorrect')
    }
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    })
    return { ok: true }
  }

  private async getOrFail(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    return user
  }
}
