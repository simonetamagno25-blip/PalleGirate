// Disponibilità dei campi in un giorno. La vista pubblica (soci) espone solo intervalli occupati:
// nessun dato su chi ha prenotato. Solo la vista admin include id prenotazione e nome del socio.
import { prisma } from '@/lib/db'
import { addDays, fromRome } from '@/lib/time'

export type FieldInfo = { id: string; name: string; sport: string; slotMinutes: number; pricePerSlot: number }
export type PublicSlot = { fieldId: string; start: string; end: string }
export type AdminSlot = PublicSlot & { bookingId: string; memberName: string }

export function getDayAvailability(day: string, opts: { admin: false }): Promise<{ fields: FieldInfo[]; busy: PublicSlot[] }>
export function getDayAvailability(day: string, opts: { admin: true }): Promise<{ fields: FieldInfo[]; busy: AdminSlot[] }>
export async function getDayAvailability(
  day: string,
  opts: { admin: boolean },
): Promise<{ fields: FieldInfo[]; busy: PublicSlot[] | AdminSlot[] }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('INVALID_DAY')
  const dayStart = fromRome(day, '00:00')
  const dayEnd = fromRome(addDays(day, 1), '00:00')

  const fields = await prisma.field.findMany({
    where: { active: true },
    select: { id: true, name: true, sport: true, slotMinutes: true, pricePerSlot: true },
    orderBy: { name: 'asc' },
  })
  const where = {
    status: 'CONFIRMED' as const,
    fieldId: { in: fields.map((f) => f.id) },
    start: { lt: dayEnd },
    end: { gt: dayStart },
  }

  if (opts.admin) {
    const rows = await prisma.booking.findMany({
      where,
      select: { id: true, fieldId: true, start: true, end: true, user: { select: { firstName: true, lastName: true } } },
      orderBy: { start: 'asc' },
    })
    const busy: AdminSlot[] = rows.map((b) => ({
      fieldId: b.fieldId,
      start: b.start.toISOString(),
      end: b.end.toISOString(),
      bookingId: b.id,
      memberName: `${b.user.firstName} ${b.user.lastName}`,
    }))
    return { fields, busy }
  }

  // Vista pubblica: la query non carica nemmeno i dati dell'utente.
  const rows = await prisma.booking.findMany({
    where,
    select: { fieldId: true, start: true, end: true },
    orderBy: { start: 'asc' },
  })
  const busy: PublicSlot[] = rows.map((b) => ({ fieldId: b.fieldId, start: b.start.toISOString(), end: b.end.toISOString() }))
  return { fields, busy }
}
