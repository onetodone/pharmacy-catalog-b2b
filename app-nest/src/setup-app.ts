import { INestApplication, ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'

/**
 * Wiring shared by the real server (`main.ts`) and the e2e test harness, so
 * tests exercise the exact global prefix / pipes / cookie + proxy handling
 * that production runs with.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api')

  // Needed so req.ip reflects the real client behind a reverse proxy — the
  // throttler and Session records key off it.
  app.getHttpAdapter().getInstance().set('trust proxy', 1)

  app.use(cookieParser())

  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:4300').split(','),
    credentials: true,
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )
}
