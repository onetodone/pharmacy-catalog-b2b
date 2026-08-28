import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'
import { getAccessTokenTtl, resolveJwtSecret } from './jwt-config'

@Module({
  imports: [
    PassportModule,
    ThrottlerModule.forRoot([{ name: 'auth', ttl: 60_000, limit: 10 }]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: resolveJwtSecret(config),
        signOptions: {
          expiresIn: getAccessTokenTtl(config) as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
