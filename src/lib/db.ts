import { PrismaClient } from '@prisma/client'

// Un solo client Prisma, anche con l'hot reload di `next dev`.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
