import { Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../prisma/prisma.service'
import { AuthUser } from '../common/auth-user'

interface JwtPayload {
  sub: number
  role: string
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
      // Must match the secret AuthModule signs with (see AuthModule note).
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-only-change-me-please'),
    })
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } })
    if (!user || user.banned || !user.approved) {
      throw new UnauthorizedException('Account is not active')
    }
    return {
      id: user.id,
      login: user.login,
      name: user.name,
      email: user.email,
      role: user.role,
    }
  }
}
