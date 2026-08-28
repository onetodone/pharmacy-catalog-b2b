import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

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

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)

  console.log(`API ready on http://localhost:${port}/api`)
}

void bootstrap()
