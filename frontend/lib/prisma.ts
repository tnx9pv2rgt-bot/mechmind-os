/**
 * Prisma Client Singleton
 * 
 * Provides a single PrismaClient instance for the application.
 * In development, this prevents multiple instances from being created during hot reloading.
 */

// Note: server-only guard removed because service files mix types and runtime code.
// PrismaClient only works server-side at runtime regardless of this guard.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export default prisma
