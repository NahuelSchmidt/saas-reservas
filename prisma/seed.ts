import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const basicPlan = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-basico" },
    update: {},
    create: {
      id: "plan-basico",
      name: "Básico",
      priceCents: 0,
      maxCourts: 3,
      maxEmployees: 2,
      features: { whatsapp: false, reportesExportables: false },
    },
  });

  const superAdminPassword = await bcrypt.hash("changeme123", 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@sistema-padel.com" },
    update: {},
    create: {
      email: "admin@sistema-padel.com",
      name: "Super Admin",
      passwordHash: superAdminPassword,
      globalRole: "SUPER_ADMIN",
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { slug: "club-demo" },
    update: {},
    create: {
      slug: "club-demo",
      name: "Club Demo Pádel",
      status: "ACTIVE",
      planId: basicPlan.id,
      primaryColor: "#0f172a",
      secondaryColor: "#22c55e",
    },
  });

  const adminPassword = await bcrypt.hash("changeme123", 10);
  const clubAdmin = await prisma.user.upsert({
    where: { email: "admin@club-demo.com" },
    update: {},
    create: {
      email: "admin@club-demo.com",
      name: "Admin del Club",
      passwordHash: adminPassword,
    },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: tenant.id, userId: clubAdmin.id } },
    update: {},
    create: { tenantId: tenant.id, userId: clubAdmin.id, role: "ADMIN" },
  });

  await prisma.bookingConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      slotDurationMinutes: 90,
      minAdvanceMinutes: 60,
      maxAdvanceDays: 14,
      depositRequired: true,
      depositIsPercentage: true,
      depositValue: 30,
    },
  });

  await prisma.cancellationPolicy.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      hoursBeforeFullRefund: 24,
      hoursBeforePartialRefund: 6,
      partialRefundPct: 50,
    },
  });

  for (let day = 0; day <= 6; day++) {
    await prisma.businessHours.upsert({
      where: { tenantId_dayOfWeek: { tenantId: tenant.id, dayOfWeek: day } },
      update: {},
      create: { tenantId: tenant.id, dayOfWeek: day, openTime: "08:00", closeTime: "23:00" },
    });
  }

  const court1 = await prisma.court.create({
    data: {
      tenantId: tenant.id,
      name: "Cancha 1",
      type: "DOUBLES",
      surface: "Césped sintético",
      location: "COVERED",
      hasLighting: true,
      capacity: 4,
      status: "ACTIVE",
    },
  });

  const court2 = await prisma.court.create({
    data: {
      tenantId: tenant.id,
      name: "Cancha 2",
      type: "DOUBLES",
      surface: "Cemento",
      location: "OUTDOOR",
      hasLighting: true,
      capacity: 4,
      status: "ACTIVE",
    },
  });

  await prisma.pricingRule.createMany({
    data: [
      // Horario valle (mañana/tarde entre semana): más barato
      { tenantId: tenant.id, courtId: null, dayOfWeek: null, startTime: "08:00", endTime: "18:00", clientType: "ANY", priceCents: 800000 },
      // Horario pico (noche): más caro
      { tenantId: tenant.id, courtId: null, dayOfWeek: null, startTime: "18:00", endTime: "23:00", clientType: "ANY", priceCents: 1200000 },
    ],
  });

  console.log("Seed OK:", { superAdmin: superAdmin.email, tenant: tenant.slug, courts: [court1.name, court2.name] });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
