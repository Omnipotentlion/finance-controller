import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Application-facing data access methods (strictly NO ground_truth access)
export async function getBatchPayments(batchId: string) {
  return prisma.payment.findMany({
    where: { batch_id: batchId },
    include: {
      order: true,
      items: {
        include: {
          settlement: true,
        },
      },
    },
  })
}

export async function getBatchOrders(batchId: string) {
  return prisma.order.findMany({
    where: { batch_id: batchId },
  })
}

export async function getBatchSettlements(batchId: string) {
  return prisma.settlement.findMany({
    where: { batch_id: batchId },
    include: {
      items: true,
    },
  })
}

export async function getBatchBankTransactions(batchId: string) {
  return prisma.bankTransaction.findMany({
    where: { batch_id: batchId },
  })
}
