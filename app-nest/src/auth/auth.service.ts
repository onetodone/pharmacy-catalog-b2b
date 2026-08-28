import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Role, User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'

export function publicUser(user: User) {
  const userObj = { ...user }
  delete (userObj as Partial<User>).passwordHash
  return userObj
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ login: dto.login }, { email: dto.email }] },
    })
    if (clash) {
      throw new BadRequestException('A user with this login or email already exists')
    }

    const user = await this.prisma.user.create({
      data: {
        login: dto.login,
        email: dto.email,
        name: dto.name,
        managerName: dto.managerName,
        phone: dto.phone,
        taxId: dto.taxId,
        address: dto.address,
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: Role.CUSTOMER,
        approved: false, // waits for an admin
      },
    })

    return {
      message: 'Registration received. An administrator must approve your account before you can sign in.',
      user: publicUser(user),
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { login: dto.login } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid login or password')
    }
    if (user.banned) throw new ForbiddenException('Your account is banned')
    if (!user.approved) throw new ForbiddenException('Your account is pending approval')

    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role }),
      user: publicUser(user),
    }
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    return publicUser(user)
  }
}
