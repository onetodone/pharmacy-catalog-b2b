import { BadRequestException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Role, User } from '@prisma/client'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../prisma/prisma.service'
import { parseDurationToSeconds } from '../common/duration'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { getRefreshTokenTtl } from './jwt-config'
import {
  encodeSessionToken,
  generateSessionSecret,
  hashSessionSecret,
  parseSessionToken,
  verifySessionSecret,
} from './session-token'

export function publicUser(user: User) {
  const userObj = { ...user }
  delete (userObj as Partial<User>).passwordHash
  return userObj
}

export interface RequestContext {
  ipAddress?: string
  userAgent?: string
}

export interface IssuedSession {
  accessToken: string
  refreshToken: string
  user: ReturnType<typeof publicUser>
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

  async login(dto: LoginDto, ctx: RequestContext = {}): Promise<IssuedSession> {
    const user = await this.prisma.user.findUnique({ where: { login: dto.login } })
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid login or password')
    }
    if (user.banned) throw new ForbiddenException('Your account is banned')
    if (!user.approved) throw new ForbiddenException('Your account is pending approval')

    return this.issueSession(user, ctx)
  }

  async refresh(rawToken: string, ctx: RequestContext = {}): Promise<IssuedSession> {
    const parsed = parseSessionToken(rawToken)
    if (!parsed) throw new UnauthorizedException('Invalid session')

    const session = await this.prisma.session.findUnique({
      where: { id: parsed.sessionId },
      include: { user: true },
    })
    if (!session) throw new UnauthorizedException('Session not found')

    const dropAndFail = async (message: string): Promise<never> => {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
      throw new UnauthorizedException(message)
    }

    if (session.user.banned || !session.user.approved) return dropAndFail('Account is not active')
    if (session.expiresAt < new Date()) return dropAndFail('Session expired')
    // Wrong secret for a real session id: do NOT delete the session — that would
    // let anyone log a victim out by guessing session ids.
    if (!verifySessionSecret(parsed.secret, session.tokenHash)) {
      throw new UnauthorizedException('Invalid session')
    }

    // Rotate in place: the id (embedded in access tokens as `sid`) stays stable
    // for the whole session, only the secret / expiry / origin change.
    const newSecret = generateSessionSecret()
    const updated = await this.prisma.session.update({
      where: { id: session.id },
      data: {
        tokenHash: hashSessionSecret(newSecret),
        expiresAt: this.refreshExpiresAt(),
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
      },
    })

    return {
      accessToken: await this.signAccessToken(session.user, updated.id),
      refreshToken: encodeSessionToken(updated.id, newSecret),
      user: publicUser(session.user),
    }
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { id: sessionId } })
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    return publicUser(user)
  }

  private async issueSession(user: User, ctx: RequestContext): Promise<IssuedSession> {
    const secret = generateSessionSecret()
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionSecret(secret),
        ipAddress: ctx.ipAddress ?? null,
        userAgent: ctx.userAgent ?? null,
        expiresAt: this.refreshExpiresAt(),
      },
    })

    return {
      accessToken: await this.signAccessToken(user, session.id),
      refreshToken: encodeSessionToken(session.id, secret),
      user: publicUser(user),
    }
  }

  private signAccessToken(user: User, sid: string): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, role: user.role, sid })
  }

  private refreshExpiresAt(): Date {
    return new Date(Date.now() + parseDurationToSeconds(getRefreshTokenTtl(this.config)) * 1000)
  }
}
