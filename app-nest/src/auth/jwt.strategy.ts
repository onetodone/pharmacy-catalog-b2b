import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUser } from '../common/auth-user'
import { resolveJwtSecret } from './jwt-config'

export interface JwtPayload {
  sub: number
  role: string
  /** Session id — the access token is only valid while this Session row exists. */
  sid: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: resolveJwtSecret(config),
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const session = payload.sid
      ? await this.prisma.session.findUnique({
          where: { id: payload.sid },
          include: { user: true },
        })
      : null

    const user = session?.user
    if (!session || !user || user.banned || !user.approved || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session is not active')
    }

    return {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      role: user.role,
      sid: session.id,
    }
  }
}
