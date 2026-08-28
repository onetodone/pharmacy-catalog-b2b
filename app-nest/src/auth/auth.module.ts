import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtStrategy } from './jwt.strategy'

@Module({
  imports: [
    PassportModule,
    // Resolve JWT options through ConfigService (registerAsync), not by reading
    // process.env at module-eval time. JwtModule.register() runs while this file
    // is imported — before ConfigModule.forRoot() in AppModule has loaded .env —
    // so process.env.JWT_SECRET would be undefined there and fall back to the
    // default, while JwtStrategy (constructed later, during DI) would read the
    // real value. That sign/verify mismatch makes every authenticated request 401.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-only-change-me-please'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
