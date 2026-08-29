import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AppModule } from '../../src/app.module'
import { PrismaService } from '../../src/prisma/prisma.service'
import { configureApp } from '../../src/setup-app'
import { TEST_PASSWORD } from './fixtures'

export interface E2EContext {
  app: INestApplication
  prisma: PrismaService
  server: ReturnType<INestApplication['getHttpServer']>
}

export async function createE2EApp(): Promise<E2EContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()

  const app = moduleRef.createNestApplication()
  configureApp(app)
  await app.init()

  return { app, prisma: app.get(PrismaService), server: app.getHttpServer() }
}

const TABLES = ['order_items', 'orders', 'products', 'posts', 'sessions', 'manufacturers', 'categories', 'users']

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`)
}

export async function bearerFor(ctx: E2EContext, login: string): Promise<string> {
  const res = await request(ctx.server).post('/api/auth/login').send({ login, password: TEST_PASSWORD }).expect(200)
  return `Bearer ${res.body.accessToken}`
}
