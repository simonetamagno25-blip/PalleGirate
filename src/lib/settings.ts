import type { Prisma, PrismaClient } from '@prisma/client'
import { DEFAULT_SETTINGS, type Settings } from '@/lib/booking-rules'
import { prisma } from '@/lib/db'

/** Impostazioni del centro (riga singola); se manca ancora si usano i valori di default. */
export async function getSettings(db: PrismaClient | Prisma.TransactionClient = prisma): Promise<Settings> {
  const row = await db.settings.findUnique({ where: { id: 1 } })
  return row ?? DEFAULT_SETTINGS
}
