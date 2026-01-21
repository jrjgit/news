import { PrismaClient, Status } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'
import { withAccelerate } from '@prisma/extension-accelerate'

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

const createPrismaClient = () => {
  const connectionString = process.env.POSTGRES_URL
  if (!connectionString) {
    throw new Error('POSTGRES_URL environment variable is not set')
  }

  const pool = new pg.Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
  return client.$extends(withAccelerate())
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()
export { Status }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma