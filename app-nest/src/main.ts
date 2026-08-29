import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { configureApp } from './setup-app'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  configureApp(app)

  const port = Number(process.env.PORT ?? 3000)
  await app.listen(port)

  console.log(`API ready on http://localhost:${port}/api`)
}

void bootstrap()
