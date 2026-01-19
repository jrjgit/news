import 'dotenv/config'

const postgresUrl = process.env.POSTGRES_URL

if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable is not set')
}

export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: postgresUrl,
  },
}
