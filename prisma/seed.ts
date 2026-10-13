// Seed idempotente: impostazioni, 5 campi, admin da .env e soci di esempio.
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const FIELDS = [
  { name: 'Calcio', sport: 'calcio', slotMinutes: 90, pricePerSlot: 6000 },
  { name: 'Tennis 1', sport: 'tennis', slotMinutes: 60, pricePerSlot: 1800 },
  { name: 'Tennis 2', sport: 'tennis', slotMinutes: 60, pricePerSlot: 1800 },
  { name: 'Basket', sport: 'basket', slotMinutes: 60, pricePerSlot: 2500 },
  { name: 'Bocce', sport: 'bocce', slotMinutes: 60, pricePerSlot: 1000 },
]

function daysFromNow(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

function plusOneYear(d: Date): Date {
  const e = new Date(d)
  e.setFullYear(e.getFullYear() + 1)
  return e
}

const MEMBERS = [
  // Già attivato: login con tessera T0001 → email mario.rossi@example.com / password socio1234
  { firstName: 'Mario', lastName: 'Rossi', email: 'mario.rossi@example.com', number: 'T0001', issuedDaysAgo: 100, activated: true },
  // Da attivare con tessera + email
  { firstName: 'Giulia', lastName: 'Bianchi', email: 'giulia.bianchi@example.com', number: 'T0002', issuedDaysAgo: 30, activated: false },
  // Tessera in scadenza tra ~10 giorni
  { firstName: 'Luca', lastName: 'Verdi', email: 'luca.verdi@example.com', number: 'T0003', issuedDaysAgo: 355, activated: false },
]

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) {
    throw new Error('Imposta ADMIN_EMAIL e ADMIN_PASSWORD nel file .env prima di eseguire il seed.')
  }

  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } })

  for (const f of FIELDS) {
    await prisma.field.upsert({ where: { name: f.name }, update: {}, create: f })
  }

  await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: {},
    create: {
      firstName: 'Admin',
      lastName: 'Palle Girate',
      email: adminEmail.toLowerCase(),
      isAdmin: true,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      activatedAt: new Date(),
    },
  })

  for (const m of MEMBERS) {
    const issuedAt = daysFromNow(-m.issuedDaysAgo)
    await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: '3331234567',
        birthDate: new Date('1990-05-15'),
        ...(m.activated ? { passwordHash: await bcrypt.hash('socio1234', 10), activatedAt: new Date() } : {}),
        membership: { create: { number: m.number, issuedAt, expiresAt: plusOneYear(issuedAt) } },
      },
    })
  }

  console.log('Seed completato: impostazioni, 5 campi, admin e 3 soci di esempio.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
