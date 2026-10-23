import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@pallegirate.local").trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD mancante nel file .env");

  await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  if ((await prisma.field.count()) === 0) {
    await prisma.field.createMany({
      data: [
        { name: "Calcio", sport: "FOOTBALL", slotMinutes: 90, priceCents: 6000, sortOrder: 1 },
        { name: "Tennis 1", sport: "TENNIS", slotMinutes: 60, priceCents: 1800, sortOrder: 2 },
        { name: "Tennis 2", sport: "TENNIS", slotMinutes: 60, priceCents: 1800, sortOrder: 3 },
        { name: "Basket", sport: "BASKETBALL", slotMinutes: 60, priceCents: 2500, sortOrder: 4 },
        { name: "Bocce", sport: "BOCCE", slotMinutes: 60, priceCents: 1000, sortOrder: 5 },
      ],
    });
  }

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { firstName: "Admin", lastName: "Centro", email: adminEmail, isAdmin: true, passwordHash: await bcrypt.hash(adminPassword, 10) },
  });

  // Soci di esempio. Password demo per quelli già attivati: "socio1234".
  const demoHash = await bcrypt.hash("socio1234", 10);
  const members = [
    { firstName: "Giulia", lastName: "Bianchi", email: "giulia@example.it", number: "PG-0001", expiry: isoDay(300), active: true },
    { firstName: "Luca", lastName: "Verdi", email: "luca@example.it", number: "PG-0002", expiry: isoDay(10), active: true },
    { firstName: "Sara", lastName: "Neri", email: "sara@example.it", number: "PG-0003", expiry: isoDay(-5), active: true },
    { firstName: "Paolo", lastName: "Gallo", email: "paolo@example.it", number: "PG-0004", expiry: isoDay(200), active: false },
  ];
  for (const m of members) {
    await prisma.user.upsert({
      where: { email: m.email },
      update: {},
      create: {
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        passwordHash: m.active ? demoHash : null,
        membership: { create: { number: m.number, issueDate: isoDay(-60), expiryDate: m.expiry } },
      },
    });
  }
  console.log("Seed completato.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
