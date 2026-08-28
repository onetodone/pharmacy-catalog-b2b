import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ThrottlerGuard } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { AuthService, IssuedSession, RequestContext } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { getRefreshTokenTtl, refreshCookieOptions, REFRESH_TOKEN_COOKIE } from './jwt-config'
import { Public } from '../common/decorators/public.decorator'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AuthUser } from '../common/auth-user'

function requestContext(req: Request): RequestContext {
  return { ipAddress: req.ip, userAgent: req.headers['user-agent'] }
}

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  private issue(res: Response, session: IssuedSession) {
    res.cookie(REFRESH_TOKEN_COOKIE, session.refreshToken, refreshCookieOptions(getRefreshTokenTtl(this.config)))
    return { accessToken: session.accessToken, user: session.user }
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto)
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.issue(res, await this.auth.login(dto, requestContext(req)))
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const raw = req.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined
    if (!raw) throw new UnauthorizedException('No active session')
    return this.issue(res, await this.auth.refresh(raw, requestContext(req)))
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(user.sid)
    res.clearCookie(REFRESH_TOKEN_COOKIE, refreshCookieOptions(getRefreshTokenTtl(this.config)))
    return { ok: true }
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id)
  }
}
