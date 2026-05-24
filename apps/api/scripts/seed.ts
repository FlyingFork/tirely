import 'dotenv/config';

import { prisma } from '@tirely/database';
import type { AuditAction } from '@tirely/database';

import { auth } from '../src/auth/auth.js';

const DEMO_PASSWORD = 'Tirely2026!';
const DEMO_IP = '127.0.0.1';

type DemoUserRole = 'admin' | 'fleet_manager' | 'maintenance' | 'driver';
type DemoUser = {
  id: string;
  email: string;
  name: string;
  role: DemoUserRole;
};
type DemoCompany = { id: string; name: string; slug: string };
type Size = { width: number; aspectRatio: number; rimDiameter: number };

const now = new Date();

const daysAgo = (days: number) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  return date;
};

const monthsAgo = (months: number, day = 8) => {
  const date = new Date(now);
  date.setMonth(date.getMonth() - months);
  date.setDate(Math.min(day, 28));
  date.setHours(9, 0, 0, 0);
  return date;
};

const monthDate = (monthsBack: number, day: number) => {
  const date = new Date(now);
  date.setMonth(date.getMonth() - monthsBack);
  date.setDate(Math.min(day, 28));
  date.setHours(10, 0, 0, 0);
  return date;
};

const json = (value: unknown) => JSON.stringify(value);

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.maintenanceEventTire.deleteMany();
  await prisma.inspectionTire.deleteMany();
  await prisma.tireEvent.deleteMany();
  await prisma.maintenanceEvent.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.mileageEntry.deleteMany();
  await prisma.tire.deleteMany();
  await prisma.tireSet.deleteMany();
  await prisma.vehicleCompatibleSize.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.depot.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.catalogModelSize.deleteMany();
  await prisma.catalogModel.deleteMany();
  await prisma.catalogBrand.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();
  await prisma.companyRequest.deleteMany();
}

async function createDemoUser(input: {
  name: string;
  email: string;
  role: DemoUserRole;
  companyId?: string | null;
  banned?: boolean;
  createdAt?: Date;
}): Promise<DemoUser> {
  const created = await auth.api.createUser({
    body: {
      name: input.name,
      email: input.email,
      password: DEMO_PASSWORD,
      role: input.role,
    },
  });

  const user = await prisma.user.update({
    where: { id: created.user.id },
    data: {
      role: input.role,
      companyId: input.companyId ?? null,
      firstLogin: false,
      emailVerified: true,
      banned: input.banned ?? false,
      createdAt: input.createdAt ?? undefined,
    },
    select: { id: true, email: true, name: true, role: true },
  });

  return { ...user, role: user.role as DemoUserRole };
}

async function createAudit(input: {
  action: AuditAction;
  companyId?: string | null;
  actorUserId?: string | null;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  details?: unknown;
  createdAt?: Date;
}) {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      companyId: input.companyId ?? null,
      actorUserId: input.actorUserId ?? null,
      userId: input.userId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      details: input.details === undefined ? null : json(input.details),
      ipAddress: DEMO_IP,
      createdAt: input.createdAt ?? daysAgo(1),
    },
  });
}

async function createCatalogModel(input: {
  brandId: string;
  name: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  category: 'STEER' | 'DRIVE' | 'TRAILER' | 'ALL_POSITION' | 'WINTER' | 'OTHER';
  defaultInitialTreadDepth: number;
  defaultExpectedMileage: number;
  submittedByCompanyId?: string | null;
  sizes: Size[];
  createdAt?: Date;
}) {
  return prisma.catalogModel.create({
    data: {
      brandId: input.brandId,
      name: input.name,
      status: input.status,
      category: input.category,
      defaultInitialTreadDepth: input.defaultInitialTreadDepth,
      defaultExpectedMileage: input.defaultExpectedMileage,
      submittedByCompanyId: input.submittedByCompanyId ?? null,
      createdAt: input.createdAt ?? daysAgo(120),
      sizes: { create: input.sizes },
    },
  });
}

async function createTire(input: {
  companyId: string;
  depotId?: string | null;
  catalogModelId?: string | null;
  brand: string;
  model: string;
  size: Size;
  serialNumber: string;
  purchaseDate: Date;
  purchasePrice: number;
  initialTreadDepth: number;
  expectedMileageLifespan: number;
  status?: 'IN_STOCK' | 'MOUNTED' | 'RETREADING' | 'DISPOSED';
  currentVehicleId?: string | null;
  currentPosition?: string | null;
  tireSetId?: string | null;
  retreadingCount?: number;
  currentLifecycleNumber?: number;
  currentLifecycleStartDate?: Date | null;
  latestTreadDepth?: number | null;
  latestCondition?: 'GOOD' | 'NEEDS_MONITORING' | 'NEEDS_REPLACEMENT' | null;
  latestInspectionDate?: Date | null;
  accumulatedMileage?: number;
  mileageAtLastInspection?: number;
  usagePercentage?: number | null;
  usageStatus?: string | null;
  usageIsEstimated?: boolean;
  archived?: boolean;
}) {
  const tire = await prisma.tire.create({
    data: {
      companyId: input.companyId,
      depotId: input.depotId ?? null,
      catalogModelId: input.catalogModelId ?? null,
      brand: input.brand,
      model: input.model,
      width: input.size.width,
      aspectRatio: input.size.aspectRatio,
      rimDiameter: input.size.rimDiameter,
      loadIndex: '156/150',
      speedRating: 'L',
      dotCode: `DOT${input.serialNumber.slice(-6)}`,
      serialNumber: input.serialNumber,
      purchaseDate: input.purchaseDate,
      purchasePrice: input.purchasePrice,
      conditionNotes: input.status === 'DISPOSED' ? 'Removed from service for demo history.' : null,
      initialTreadDepth: input.initialTreadDepth,
      expectedMileageLifespan: input.expectedMileageLifespan,
      status: input.status ?? 'IN_STOCK',
      currentVehicleId: input.currentVehicleId ?? null,
      currentPosition: input.currentPosition ?? null,
      tireSetId: input.tireSetId ?? null,
      retreadingCount: input.retreadingCount ?? 0,
      currentLifecycleNumber: input.currentLifecycleNumber ?? 1,
      currentLifecycleStartDate: input.currentLifecycleStartDate ?? input.purchaseDate,
      latestTreadDepth: input.latestTreadDepth ?? null,
      latestCondition: input.latestCondition ?? null,
      latestInspectionDate: input.latestInspectionDate ?? null,
      accumulatedMileage: input.accumulatedMileage ?? 0,
      mileageAtLastInspection: input.mileageAtLastInspection ?? 0,
      usagePercentage: input.usagePercentage ?? null,
      usageStatus: input.usageStatus ?? null,
      usageIsEstimated: input.usageIsEstimated ?? false,
      usageCalculatedAt: input.usagePercentage === undefined ? null : daysAgo(1),
      archived: input.archived ?? false,
    },
  });

  await prisma.tireEvent.create({
    data: {
      tireId: tire.id,
      eventType: 'PURCHASED',
      date: input.purchaseDate,
      lifecycleNumber: 1,
    },
  });

  return tire;
}

async function seedCompanyRequests(admin: DemoUser) {
  const approvedNorthstar = await prisma.companyRequest.create({
    data: {
      companyName: 'Northstar Logistics',
      companyEmail: 'ops@northstar.demo',
      contactPersonName: 'Mara Collins',
      contactPersonPhone: '+1 312 555 0101',
      fleetSizeEstimate: '76-100',
      depotCountEstimate: 4,
      message: 'Looking for tire lifecycle visibility across regional freight routes.',
      status: 'APPROVED',
      reviewedByUserId: admin.id,
      reviewedAt: monthsAgo(9, 14),
      createdAt: monthsAgo(9, 10),
    },
  });

  const approvedBlueRidge = await prisma.companyRequest.create({
    data: {
      companyName: 'Blue Ridge Freight',
      companyEmail: 'dispatch@blueridge.demo',
      contactPersonName: 'Owen Mercer',
      contactPersonPhone: '+1 828 555 0118',
      fleetSizeEstimate: '26-50',
      depotCountEstimate: 2,
      message: 'Pilot rollout for maintenance reporting and inspections.',
      status: 'APPROVED',
      reviewedByUserId: admin.id,
      reviewedAt: monthsAgo(5, 16),
      createdAt: monthsAgo(5, 12),
    },
  });

  const approvedUrbanCold = await prisma.companyRequest.create({
    data: {
      companyName: 'Urban Cold Chain',
      companyEmail: 'fleet@urbancold.demo',
      contactPersonName: 'Priya Shah',
      contactPersonPhone: '+1 646 555 0190',
      fleetSizeEstimate: '11-25',
      depotCountEstimate: 1,
      message: 'Refrigerated last-mile fleet evaluation.',
      status: 'APPROVED',
      reviewedByUserId: admin.id,
      reviewedAt: monthsAgo(2, 9),
      createdAt: monthsAgo(2, 7),
    },
  });

  const pending = await prisma.companyRequest.create({
    data: {
      companyName: 'Redwood Municipal Transit',
      companyEmail: 'fleet@redwood-transit.demo',
      contactPersonName: 'Elena Vargas',
      contactPersonPhone: '+1 415 555 0177',
      fleetSizeEstimate: '101-250',
      depotCountEstimate: 3,
      message: 'Needs audit-friendly inspection workflows before board approval.',
      status: 'PENDING',
      createdAt: daysAgo(3),
    },
  });

  const rejected = await prisma.companyRequest.create({
    data: {
      companyName: 'Coastal Courier Group',
      companyEmail: 'hello@coastalcourier.demo',
      contactPersonName: 'Jon Bell',
      contactPersonPhone: '+1 843 555 0144',
      fleetSizeEstimate: '1-10',
      depotCountEstimate: 1,
      message: 'Requested access for non-commercial vehicle inventory.',
      status: 'REJECTED',
      rejectionReason: 'Fleet size and use case are outside the current Tirely beta criteria.',
      reviewedByUserId: admin.id,
      reviewedAt: monthDate(1, 18),
      createdAt: monthDate(1, 14),
    },
  });

  return { approvedNorthstar, approvedBlueRidge, approvedUrbanCold, pending, rejected };
}

async function seedCompanies(requests: Awaited<ReturnType<typeof seedCompanyRequests>>) {
  const northstar = await prisma.company.create({
    data: {
      name: 'Northstar Logistics',
      slug: 'northstar-logistics',
      contactEmail: 'ops@northstar.demo',
      contactPhone: '+1 312 555 0101',
      address: '4100 S Halsted St, Chicago, IL',
      status: 'ACTIVE',
      companyRequestId: requests.approvedNorthstar.id,
      createdAt: monthsAgo(9, 18),
    },
  });

  const blueRidge = await prisma.company.create({
    data: {
      name: 'Blue Ridge Freight',
      slug: 'blue-ridge-freight',
      contactEmail: 'dispatch@blueridge.demo',
      contactPhone: '+1 828 555 0118',
      address: '88 Logistics Way, Asheville, NC',
      status: 'ACTIVE',
      companyRequestId: requests.approvedBlueRidge.id,
      createdAt: monthsAgo(5, 20),
    },
  });

  const urbanCold = await prisma.company.create({
    data: {
      name: 'Urban Cold Chain',
      slug: 'urban-cold-chain',
      contactEmail: 'fleet@urbancold.demo',
      contactPhone: '+1 646 555 0190',
      address: '22 Produce Market Rd, Newark, NJ',
      status: 'SUSPENDED',
      companyRequestId: requests.approvedUrbanCold.id,
      createdAt: monthsAgo(2, 11),
    },
  });

  return { northstar, blueRidge, urbanCold };
}

async function seedUsers(admin: DemoUser, companies: Record<string, DemoCompany>) {
  const northstarManager = await createDemoUser({
    name: 'Mara Collins',
    email: 'manager@northstar.demo',
    role: 'fleet_manager',
    companyId: companies.northstar.id,
    createdAt: monthsAgo(9, 19),
  });
  const northstarMaintenance = await createDemoUser({
    name: 'Leo Grant',
    email: 'maintenance@northstar.demo',
    role: 'maintenance',
    companyId: companies.northstar.id,
    createdAt: monthsAgo(8, 2),
  });
  const northstarDriver1 = await createDemoUser({
    name: 'Tessa Warren',
    email: 'driver1@northstar.demo',
    role: 'driver',
    companyId: companies.northstar.id,
    createdAt: monthsAgo(7, 6),
  });
  const northstarDriver2 = await createDemoUser({
    name: 'Miles Novak',
    email: 'driver2@northstar.demo',
    role: 'driver',
    companyId: companies.northstar.id,
    createdAt: monthsAgo(7, 12),
  });
  const inactiveNorthstarDriver = await createDemoUser({
    name: 'Iris Chen',
    email: 'inactive.driver@northstar.demo',
    role: 'driver',
    companyId: companies.northstar.id,
    banned: true,
    createdAt: monthsAgo(6, 4),
  });

  const blueManager = await createDemoUser({
    name: 'Owen Mercer',
    email: 'manager@blueridge.demo',
    role: 'fleet_manager',
    companyId: companies.blueRidge.id,
    createdAt: monthsAgo(5, 22),
  });
  const blueMaintenance = await createDemoUser({
    name: 'Greta Lane',
    email: 'maintenance@blueridge.demo',
    role: 'maintenance',
    companyId: companies.blueRidge.id,
    createdAt: monthsAgo(4, 3),
  });
  const blueDriver = await createDemoUser({
    name: 'Samir Patel',
    email: 'driver@blueridge.demo',
    role: 'driver',
    companyId: companies.blueRidge.id,
    createdAt: monthsAgo(4, 10),
  });

  const urbanManager = await createDemoUser({
    name: 'Priya Shah',
    email: 'manager@urbancold.demo',
    role: 'fleet_manager',
    companyId: companies.urbanCold.id,
    createdAt: monthsAgo(2, 12),
  });

  await createAudit({
    action: 'USER_LOGIN',
    actorUserId: northstarManager.id,
    userId: northstarManager.id,
    companyId: companies.northstar.id,
    entityType: 'User',
    entityId: northstarManager.id,
    createdAt: daysAgo(1),
  });
  await createAudit({
    action: 'USER_LOGOUT',
    actorUserId: northstarManager.id,
    userId: northstarManager.id,
    companyId: companies.northstar.id,
    entityType: 'User',
    entityId: northstarManager.id,
    createdAt: daysAgo(1),
  });
  await createAudit({
    action: 'USER_LOGIN_FAILED',
    actorUserId: null,
    userId: null,
    companyId: null,
    entityType: 'User',
    entityId: 'unknown',
    details: { email: 'manager@northstar.demo', reason: 'Invalid password' },
    createdAt: daysAgo(2),
  });

  return {
    admin,
    northstarManager,
    northstarMaintenance,
    northstarDriver1,
    northstarDriver2,
    inactiveNorthstarDriver,
    blueManager,
    blueMaintenance,
    blueDriver,
    urbanManager,
  };
}

async function seedCatalog(admin: DemoUser, companies: Record<string, DemoCompany>, users: Awaited<ReturnType<typeof seedUsers>>) {
  const michelin = await prisma.catalogBrand.create({
    data: { name: 'Michelin', status: 'APPROVED', createdAt: monthsAgo(11, 3) },
  });
  const bridgestone = await prisma.catalogBrand.create({
    data: { name: 'Bridgestone', status: 'APPROVED', createdAt: monthsAgo(10, 6) },
  });
  const continental = await prisma.catalogBrand.create({
    data: { name: 'Continental', status: 'APPROVED', createdAt: monthsAgo(7, 8) },
  });
  const hankook = await prisma.catalogBrand.create({
    data: { name: 'Hankook', status: 'APPROVED', createdAt: monthsAgo(3, 5) },
  });
  const novaTread = await prisma.catalogBrand.create({
    data: { name: 'NovaTread', status: 'PENDING', createdAt: daysAgo(8) },
  });
  const budgetGrip = await prisma.catalogBrand.create({
    data: { name: 'BudgetGrip', status: 'REJECTED', createdAt: daysAgo(45) },
  });

  const xLine = await createCatalogModel({
    brandId: michelin.id,
    name: 'X Line Energy Z',
    status: 'APPROVED',
    category: 'STEER',
    defaultInitialTreadDepth: 15,
    defaultExpectedMileage: 190000,
    sizes: [
      { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      { width: 295, aspectRatio: 75, rimDiameter: 22.5 },
    ],
    createdAt: monthsAgo(10, 7),
  });
  const xMulti = await createCatalogModel({
    brandId: michelin.id,
    name: 'X Multi D',
    status: 'APPROVED',
    category: 'DRIVE',
    defaultInitialTreadDepth: 22,
    defaultExpectedMileage: 180000,
    sizes: [{ width: 315, aspectRatio: 80, rimDiameter: 22.5 }],
    createdAt: monthsAgo(9, 2),
  });
  const ecopia = await createCatalogModel({
    brandId: bridgestone.id,
    name: 'Ecopia R284',
    status: 'APPROVED',
    category: 'ALL_POSITION',
    defaultInitialTreadDepth: 16,
    defaultExpectedMileage: 175000,
    sizes: [
      { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      { width: 275, aspectRatio: 70, rimDiameter: 22.5 },
    ],
    createdAt: monthsAgo(6, 12),
  });
  const conti = await createCatalogModel({
    brandId: continental.id,
    name: 'Conti EcoPlus HT3',
    status: 'APPROVED',
    category: 'TRAILER',
    defaultInitialTreadDepth: 14,
    defaultExpectedMileage: 165000,
    sizes: [{ width: 385, aspectRatio: 65, rimDiameter: 22.5 }],
    createdAt: monthsAgo(4, 17),
  });
  const smartFlex = await createCatalogModel({
    brandId: hankook.id,
    name: 'SmartFlex AH35',
    status: 'APPROVED',
    category: 'ALL_POSITION',
    defaultInitialTreadDepth: 15,
    defaultExpectedMileage: 155000,
    sizes: [{ width: 275, aspectRatio: 70, rimDiameter: 22.5 }],
    createdAt: monthDate(1, 5),
  });
  const pendingModel = await createCatalogModel({
    brandId: novaTread.id,
    name: 'NT Regional Pro',
    status: 'PENDING',
    category: 'DRIVE',
    defaultInitialTreadDepth: 21,
    defaultExpectedMileage: 150000,
    submittedByCompanyId: companies.northstar.id,
    sizes: [{ width: 315, aspectRatio: 80, rimDiameter: 22.5 }],
    createdAt: daysAgo(8),
  });
  const rejectedModel = await createCatalogModel({
    brandId: budgetGrip.id,
    name: 'BG Longhaul 100',
    status: 'REJECTED',
    category: 'OTHER',
    defaultInitialTreadDepth: 13,
    defaultExpectedMileage: 90000,
    submittedByCompanyId: companies.blueRidge.id,
    sizes: [{ width: 315, aspectRatio: 80, rimDiameter: 22.5 }],
    createdAt: daysAgo(45),
  });

  await createAudit({
    action: 'CATALOG_BRAND_SUBMITTED',
    actorUserId: users.northstarManager.id,
    companyId: companies.northstar.id,
    entityType: 'CatalogBrand',
    entityId: novaTread.id,
    details: { name: novaTread.name },
    createdAt: daysAgo(8),
  });
  await createAudit({
    action: 'CATALOG_MODEL_SUBMITTED',
    actorUserId: users.northstarManager.id,
    companyId: companies.northstar.id,
    entityType: 'CatalogModel',
    entityId: pendingModel.id,
    details: { name: pendingModel.name, brandId: novaTread.id },
    createdAt: daysAgo(8),
  });
  await createAudit({
    action: 'CATALOG_BRAND_REJECTED',
    actorUserId: admin.id,
    entityType: 'CatalogBrand',
    entityId: budgetGrip.id,
    details: { brandName: budgetGrip.name, rejectionReason: 'Insufficient manufacturer data.' },
    createdAt: daysAgo(41),
  });
  await createAudit({
    action: 'CATALOG_MODEL_REJECTED',
    actorUserId: admin.id,
    entityType: 'CatalogModel',
    entityId: rejectedModel.id,
    details: { modelName: rejectedModel.name, rejectionReason: 'Missing certified size sheet.' },
    createdAt: daysAgo(41),
  });
  await createAudit({
    action: 'CATALOG_BRAND_APPROVED',
    actorUserId: admin.id,
    entityType: 'CatalogBrand',
    entityId: hankook.id,
    details: { brandName: hankook.name },
    createdAt: monthDate(1, 5),
  });
  await createAudit({
    action: 'CATALOG_MODEL_APPROVED',
    actorUserId: admin.id,
    entityType: 'CatalogModel',
    entityId: smartFlex.id,
    details: { brandName: hankook.name, modelName: smartFlex.name },
    createdAt: monthDate(1, 5),
  });

  return { xLine, xMulti, ecopia, conti, smartFlex };
}

async function seedNorthstarFleet(
  company: DemoCompany,
  users: Awaited<ReturnType<typeof seedUsers>>,
  catalog: Awaited<ReturnType<typeof seedCatalog>>,
) {
  await prisma.companySettings.create({
    data: {
      companyId: company.id,
      minimumTreadDepth: 3.2,
      maximumAgeMonths: 66,
      defaultExpectedMileage: 170000,
      staleInspectionThresholdDays: 60,
      defaultWearRate: 0.000055,
      retreadingLifespanReduction: 0.18,
      alertInfoThreshold: 68,
      alertUrgentThreshold: 84,
      alertCriticalThreshold: 94,
    },
  });

  const chicago = await prisma.depot.create({
    data: {
      companyId: company.id,
      name: 'Chicago Main Depot',
      address: '4100 S Halsted St, Chicago, IL',
      contactInfo: 'Mara Collins, +1 312 555 0101',
      createdAt: monthsAgo(9, 20),
    },
  });
  const milwaukee = await prisma.depot.create({
    data: {
      companyId: company.id,
      name: 'Milwaukee Cross-Dock',
      address: '900 Harbor Dr, Milwaukee, WI',
      contactInfo: 'Leo Grant, +1 414 555 0166',
      createdAt: monthsAgo(8, 1),
    },
  });
  const archivedDepot = await prisma.depot.create({
    data: {
      companyId: company.id,
      name: 'Gary Overflow Yard',
      address: '1220 Industrial Blvd, Gary, IN',
      contactInfo: 'Closed seasonal overflow lot',
      archived: true,
      createdAt: monthsAgo(6, 15),
    },
  });

  const truck1 = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      depotId: chicago.id,
      licensePlate: 'NS-4821',
      make: 'Freightliner',
      model: 'Cascadia',
      year: 2022,
      vin: '1FUJGLDR9NLAB4821',
      vehicleType: 'Tractor',
      assignedDriverId: users.northstarDriver1.id,
      createdAt: monthsAgo(8, 10),
      vehicleCompatibleSizes: {
        create: [
          { width: 315, aspectRatio: 80, rimDiameter: 22.5, axlePosition: 'FRONT' },
          { width: 315, aspectRatio: 80, rimDiameter: 22.5, axlePosition: 'REAR' },
          { width: 275, aspectRatio: 70, rimDiameter: 22.5, axlePosition: 'SPARE' },
        ],
      },
    },
  });
  const truck2 = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      depotId: chicago.id,
      licensePlate: 'NS-7390',
      make: 'Volvo',
      model: 'VNL 760',
      year: 2021,
      vin: '4V4NC9EH9MN273900',
      vehicleType: 'Tractor',
      assignedDriverId: users.northstarDriver2.id,
      createdAt: monthsAgo(7, 4),
      vehicleCompatibleSizes: {
        create: [
          { width: 315, aspectRatio: 80, rimDiameter: 22.5, axlePosition: null },
          { width: 275, aspectRatio: 70, rimDiameter: 22.5, axlePosition: 'SPARE' },
        ],
      },
    },
  });
  const trailer = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      depotId: milwaukee.id,
      licensePlate: 'NS-T118',
      make: 'Great Dane',
      model: 'Everest',
      year: 2020,
      vehicleType: 'Reefer Trailer',
      createdAt: monthsAgo(6, 7),
      vehicleCompatibleSizes: {
        create: [{ width: 385, aspectRatio: 65, rimDiameter: 22.5, axlePosition: null }],
      },
    },
  });
  const archivedVehicle = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      depotId: archivedDepot.id,
      licensePlate: 'NS-1004',
      make: 'International',
      model: 'LT625',
      year: 2018,
      vehicleType: 'Retired Tractor',
      archived: true,
      createdAt: monthsAgo(6, 20),
      vehicleCompatibleSizes: {
        create: [{ width: 315, aspectRatio: 80, rimDiameter: 22.5, axlePosition: null }],
      },
    },
  });

  await createAudit({
    action: 'DEPOT_CREATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Depot',
    entityId: chicago.id,
    details: { name: chicago.name },
    createdAt: monthsAgo(9, 20),
  });
  await createAudit({
    action: 'DEPOT_UPDATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Depot',
    entityId: milwaukee.id,
    details: { changedFields: ['contactInfo'] },
    createdAt: monthsAgo(7, 10),
  });
  await createAudit({
    action: 'DEPOT_ARCHIVED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Depot',
    entityId: archivedDepot.id,
    createdAt: monthsAgo(3, 5),
  });
  await createAudit({
    action: 'DEPOT_UNARCHIVED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Depot',
    entityId: milwaukee.id,
    createdAt: monthsAgo(4, 3),
  });
  await createAudit({
    action: 'VEHICLE_CREATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck1.id,
    details: { licensePlate: truck1.licensePlate },
    createdAt: monthsAgo(8, 10),
  });
  await createAudit({
    action: 'VEHICLE_UPDATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck2.id,
    details: { changedFields: ['depotId'] },
    createdAt: monthsAgo(4, 14),
  });
  await createAudit({
    action: 'VEHICLE_ARCHIVED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: archivedVehicle.id,
    createdAt: monthsAgo(2, 22),
  });
  await createAudit({
    action: 'VEHICLE_DRIVER_ASSIGNED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck1.id,
    details: { driverId: users.northstarDriver1.id },
    createdAt: monthsAgo(7, 12),
  });
  await createAudit({
    action: 'VEHICLE_DRIVER_UNASSIGNED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: trailer.id,
    details: { previousDriverId: users.inactiveNorthstarDriver.id },
    createdAt: monthsAgo(3, 2),
  });
  await createAudit({
    action: 'VEHICLE_COMPATIBLE_SIZES_UPDATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck1.id,
    createdAt: monthsAgo(5, 8),
  });

  const mountedSet = await prisma.tireSet.create({
    data: { companyId: company.id, name: 'Cascadia Active Set A', createdAt: monthsAgo(6, 1) },
  });
  const stockSet = await prisma.tireSet.create({
    data: { companyId: company.id, name: 'Winter Reserve Set', createdAt: monthsAgo(2, 16) },
  });
  const dissolvedSet = await prisma.tireSet.create({
    data: { companyId: company.id, name: 'Retired Test Set', createdAt: monthsAgo(5, 4) },
  });

  const activeTires = [
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.xLine.id,
      brand: 'Michelin',
      model: 'X Line Energy Z',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'NS-MIC-FL-001',
      purchaseDate: monthsAgo(8, 12),
      purchasePrice: 620,
      initialTreadDepth: 15,
      expectedMileageLifespan: 190000,
      status: 'MOUNTED',
      currentVehicleId: truck1.id,
      currentPosition: 'FRONT_LEFT',
      tireSetId: mountedSet.id,
      latestTreadDepth: 9.8,
      latestCondition: 'GOOD',
      latestInspectionDate: daysAgo(16),
      accumulatedMileage: 52000,
      mileageAtLastInspection: 146200,
      usagePercentage: 42,
      usageStatus: 'GOOD',
      currentLifecycleStartDate: monthsAgo(8, 15),
    }),
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.xLine.id,
      brand: 'Michelin',
      model: 'X Line Energy Z',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'NS-MIC-FR-002',
      purchaseDate: monthsAgo(8, 12),
      purchasePrice: 620,
      initialTreadDepth: 15,
      expectedMileageLifespan: 190000,
      status: 'MOUNTED',
      currentVehicleId: truck1.id,
      currentPosition: 'FRONT_RIGHT',
      tireSetId: mountedSet.id,
      latestTreadDepth: 8.9,
      latestCondition: 'NEEDS_MONITORING',
      latestInspectionDate: daysAgo(16),
      accumulatedMileage: 52000,
      mileageAtLastInspection: 146200,
      usagePercentage: 73,
      usageStatus: 'HIGH',
      currentLifecycleStartDate: monthsAgo(8, 15),
    }),
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.xMulti.id,
      brand: 'Michelin',
      model: 'X Multi D',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'NS-MIC-RL-003',
      purchaseDate: monthsAgo(11, 2),
      purchasePrice: 670,
      initialTreadDepth: 22,
      expectedMileageLifespan: 180000,
      status: 'MOUNTED',
      currentVehicleId: truck1.id,
      currentPosition: 'REAR_LEFT',
      tireSetId: mountedSet.id,
      latestTreadDepth: 5.1,
      latestCondition: 'NEEDS_REPLACEMENT',
      latestInspectionDate: daysAgo(16),
      accumulatedMileage: 132000,
      mileageAtLastInspection: 146200,
      usagePercentage: 96,
      usageStatus: 'REPLACE_IMMEDIATELY',
      currentLifecycleStartDate: daysAgo(330),
    }),
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.xMulti.id,
      brand: 'Michelin',
      model: 'X Multi D',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'NS-MIC-RR-004',
      purchaseDate: monthsAgo(10, 2),
      purchasePrice: 670,
      initialTreadDepth: 22,
      expectedMileageLifespan: 180000,
      status: 'MOUNTED',
      currentVehicleId: truck1.id,
      currentPosition: 'REAR_RIGHT',
      tireSetId: mountedSet.id,
      latestTreadDepth: 6.2,
      latestCondition: 'NEEDS_MONITORING',
      latestInspectionDate: daysAgo(16),
      accumulatedMileage: 116000,
      mileageAtLastInspection: 146200,
      usagePercentage: 88,
      usageStatus: 'CRITICAL',
      currentLifecycleStartDate: daysAgo(330),
    }),
  ];

  const spare = await createTire({
    companyId: company.id,
    depotId: chicago.id,
    catalogModelId: catalog.smartFlex.id,
    brand: 'Hankook',
    model: 'SmartFlex AH35',
    size: { width: 275, aspectRatio: 70, rimDiameter: 22.5 },
    serialNumber: 'NS-HAN-SP-005',
    purchaseDate: monthsAgo(1, 8),
    purchasePrice: 410,
    initialTreadDepth: 15,
    expectedMileageLifespan: 155000,
    status: 'IN_STOCK',
    tireSetId: stockSet.id,
    latestTreadDepth: 14.7,
    latestCondition: 'GOOD',
    latestInspectionDate: daysAgo(12),
    usagePercentage: 4,
    usageStatus: 'NEW',
  });

  const retreadingTire = await createTire({
    companyId: company.id,
    catalogModelId: catalog.xMulti.id,
    brand: 'Michelin',
    model: 'X Multi D',
    size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
    serialNumber: 'NS-RET-006',
    purchaseDate: monthsAgo(18, 7),
    purchasePrice: 650,
    initialTreadDepth: 22,
    expectedMileageLifespan: 153000,
    status: 'RETREADING',
    latestTreadDepth: 3.4,
    latestCondition: 'NEEDS_REPLACEMENT',
    latestInspectionDate: daysAgo(35),
    accumulatedMileage: 151000,
    mileageAtLastInspection: 139000,
    usagePercentage: 93,
    usageStatus: 'CRITICAL',
    retreadingCount: 1,
    currentLifecycleNumber: 2,
    currentLifecycleStartDate: monthsAgo(9, 11),
  });

  const disposedA = await createTire({
    companyId: company.id,
    catalogModelId: catalog.ecopia.id,
    brand: 'Bridgestone',
    model: 'Ecopia R284',
    size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
    serialNumber: 'NS-DISP-007',
    purchaseDate: monthsAgo(22, 4),
    purchasePrice: 590,
    initialTreadDepth: 16,
    expectedMileageLifespan: 175000,
    status: 'DISPOSED',
    archived: true,
    accumulatedMileage: 168000,
    latestTreadDepth: 2.6,
    latestCondition: 'NEEDS_REPLACEMENT',
    latestInspectionDate: monthsAgo(2, 4),
    usagePercentage: 100,
    usageStatus: 'REPLACE_IMMEDIATELY',
  });
  const disposedB = await createTire({
    companyId: company.id,
    catalogModelId: catalog.xMulti.id,
    brand: 'Michelin',
    model: 'X Multi D',
    size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
    serialNumber: 'NS-DISP-008',
    purchaseDate: monthsAgo(24, 9),
    purchasePrice: 650,
    initialTreadDepth: 22,
    expectedMileageLifespan: 180000,
    status: 'DISPOSED',
    archived: true,
    accumulatedMileage: 184000,
    latestTreadDepth: 2.4,
    latestCondition: 'NEEDS_REPLACEMENT',
    latestInspectionDate: monthsAgo(3, 4),
    usagePercentage: 100,
    usageStatus: 'REPLACE_IMMEDIATELY',
  });

  const trailerTires = [
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.conti.id,
      brand: 'Continental',
      model: 'Conti EcoPlus HT3',
      size: { width: 385, aspectRatio: 65, rimDiameter: 22.5 },
      serialNumber: 'NS-TRL-009',
      purchaseDate: monthsAgo(4, 8),
      purchasePrice: 540,
      initialTreadDepth: 14,
      expectedMileageLifespan: 165000,
      status: 'MOUNTED',
      currentVehicleId: trailer.id,
      currentPosition: 'FRONT_LEFT',
      latestTreadDepth: 11.4,
      latestCondition: 'GOOD',
      latestInspectionDate: daysAgo(11),
      accumulatedMileage: 29000,
      mileageAtLastInspection: 88200,
      usagePercentage: 29,
      usageStatus: 'GOOD',
      currentLifecycleStartDate: daysAgo(180),
    }),
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.conti.id,
      brand: 'Continental',
      model: 'Conti EcoPlus HT3',
      size: { width: 385, aspectRatio: 65, rimDiameter: 22.5 },
      serialNumber: 'NS-TRL-010',
      purchaseDate: monthsAgo(4, 8),
      purchasePrice: 540,
      initialTreadDepth: 14,
      expectedMileageLifespan: 165000,
      status: 'MOUNTED',
      currentVehicleId: trailer.id,
      currentPosition: 'FRONT_RIGHT',
      latestTreadDepth: 10.9,
      latestCondition: 'GOOD',
      latestInspectionDate: daysAgo(11),
      accumulatedMileage: 29000,
      mileageAtLastInspection: 88200,
      usagePercentage: 36,
      usageStatus: 'GOOD',
      currentLifecycleStartDate: daysAgo(180),
    }),
  ];

  for (const [index, tire] of [...activeTires, ...trailerTires].entries()) {
    const vehicleId = tire.currentVehicleId!;
    await prisma.tireEvent.create({
      data: {
        tireId: tire.id,
        vehicleId,
        performedById: users.northstarMaintenance.id,
        eventType: 'MOUNTED',
        position: tire.currentPosition,
        odometerAt: vehicleId === truck1.id ? 94200 : 59200,
        date: vehicleId === truck1.id ? monthsAgo(8, 15) : monthsAgo(4, 14),
        lifecycleNumber: tire.currentLifecycleNumber,
        fitmentOverride: index === 1,
        fitmentNote: index === 1 ? 'Demo override: steer tire accepted for short route.' : null,
      },
    });
  }

  await prisma.tireEvent.createMany({
    data: [
      {
        tireId: activeTires[0]!.id,
        vehicleId: truck1.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'ROTATED',
        position: 'FRONT_LEFT',
        odometerAt: 124900,
        date: monthsAgo(3, 10),
        lifecycleNumber: 1,
      },
      {
        tireId: retreadingTire.id,
        vehicleId: truck2.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'MOUNTED',
        position: 'REAR_LEFT',
        odometerAt: 60300,
        date: monthsAgo(9, 11),
        lifecycleNumber: 2,
      },
      {
        tireId: retreadingTire.id,
        vehicleId: truck2.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'DISMOUNTED',
        position: 'REAR_LEFT',
        odometerAt: 211300,
        date: daysAgo(18),
        dismountReason: 'SENT_FOR_RETREADING',
        lifecycleNumber: 2,
      },
      {
        tireId: retreadingTire.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'SENT_FOR_RETREADING',
        date: daysAgo(18),
        lifecycleNumber: 2,
      },
      {
        tireId: disposedA.id,
        vehicleId: truck2.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'DISMOUNTED',
        position: 'FRONT_RIGHT',
        odometerAt: 208000,
        date: monthsAgo(2, 4),
        dismountReason: 'END_OF_LIFE',
        lifecycleNumber: 1,
      },
      {
        tireId: disposedA.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'DISPOSED',
        date: monthsAgo(2, 5),
        lifecycleNumber: 1,
      },
      {
        tireId: disposedB.id,
        vehicleId: truck1.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'DISMOUNTED',
        position: 'REAR_LEFT',
        odometerAt: 137000,
        date: monthsAgo(3, 6),
        dismountReason: 'REPLACEMENT',
        lifecycleNumber: 1,
      },
      {
        tireId: disposedB.id,
        performedById: users.northstarMaintenance.id,
        eventType: 'DISPOSED',
        date: monthsAgo(3, 7),
        lifecycleNumber: 1,
      },
    ],
  });

  await prisma.mileageEntry.createMany({
    data: [
      { vehicleId: truck1.id, recordedById: users.northstarDriver1.id, odometer: 94200, date: monthsAgo(8, 15) },
      { vehicleId: truck1.id, recordedById: users.northstarDriver1.id, odometer: 124900, date: monthsAgo(3, 10) },
      { vehicleId: truck1.id, recordedById: users.northstarDriver1.id, odometer: 146200, date: daysAgo(16) },
      { vehicleId: truck1.id, recordedById: users.northstarDriver1.id, odometer: 151400, date: daysAgo(2) },
      { vehicleId: truck2.id, recordedById: users.northstarDriver2.id, odometer: 60300, date: monthsAgo(9, 11) },
      { vehicleId: truck2.id, recordedById: users.northstarDriver2.id, odometer: 211300, date: daysAgo(18) },
      { vehicleId: trailer.id, recordedById: users.northstarMaintenance.id, odometer: 59200, date: monthsAgo(4, 14) },
      { vehicleId: trailer.id, recordedById: users.northstarMaintenance.id, odometer: 88200, date: daysAgo(11) },
    ],
  });

  const detailedInspection = await prisma.inspection.create({
    data: {
      companyId: company.id,
      vehicleId: truck1.id,
      inspectorId: users.northstarMaintenance.id,
      type: 'DETAILED',
      date: daysAgo(16),
      overallNotes: 'Rear-left tire below replacement threshold; schedule replacement before next long-haul route.',
      tireResults: {
        create: activeTires.map((tire) => ({
          tireId: tire.id,
          position: tire.currentPosition!,
          treadDepth: tire.latestTreadDepth,
          tirePressure: tire.currentPosition?.startsWith('FRONT') ? 8.4 : 8.8,
          damageNotes: tire.latestCondition === 'NEEDS_REPLACEMENT' ? 'Outer shoulder cupping and low tread.' : null,
          condition: tire.latestCondition,
        })),
      },
    },
  });
  const dailyInspection = await prisma.inspection.create({
    data: {
      companyId: company.id,
      vehicleId: truck1.id,
      inspectorId: users.northstarDriver1.id,
      type: 'DAILY_CHECK',
      date: daysAgo(2),
      overallNotes: 'Pressure visual check completed before Chicago to Detroit run.',
      tireResults: {
        create: activeTires.map((tire) => ({
          tireId: tire.id,
          position: tire.currentPosition!,
          visualCondition:
            tire.latestCondition === 'NEEDS_REPLACEMENT'
              ? 'CONCERN'
              : tire.latestCondition === 'NEEDS_MONITORING'
                ? 'MINOR_WEAR'
                : 'GOOD',
          anomalyNotes:
            tire.latestCondition === 'NEEDS_REPLACEMENT'
              ? 'Tread close to legal minimum; maintenance notified.'
              : null,
        })),
      },
    },
  });
  const trailerInspection = await prisma.inspection.create({
    data: {
      companyId: company.id,
      vehicleId: trailer.id,
      inspectorId: users.northstarMaintenance.id,
      type: 'DETAILED',
      date: daysAgo(11),
      overallNotes: 'Trailer tires healthy after reefer service.',
      tireResults: {
        create: trailerTires.map((tire) => ({
          tireId: tire.id,
          position: tire.currentPosition!,
          treadDepth: tire.latestTreadDepth,
          tirePressure: 8.6,
          condition: 'GOOD',
        })),
      },
    },
  });

  const replacement = await prisma.maintenanceEvent.create({
    data: {
      companyId: company.id,
      vehicleId: truck1.id,
      performedById: users.northstarMaintenance.id,
      type: 'TIRE_REPLACEMENT',
      date: daysAgo(14),
      description: 'Prepared replacement order for rear-left position after detailed inspection.',
      cost: 1280,
      tires: { create: [{ tireId: activeTires[2]!.id }, { tireId: spare.id }] },
    },
  });
  const repair = await prisma.maintenanceEvent.create({
    data: {
      companyId: company.id,
      vehicleId: truck1.id,
      performedById: users.northstarMaintenance.id,
      type: 'TIRE_REPAIR',
      date: monthDate(1, 9),
      description: 'Valve stem replacement and pressure correction.',
      cost: 145,
      tires: { create: [{ tireId: activeTires[1]!.id }] },
    },
  });
  const sendRetread = await prisma.maintenanceEvent.create({
    data: {
      companyId: company.id,
      vehicleId: truck2.id,
      performedById: users.northstarMaintenance.id,
      type: 'RETREADING_SEND_OFF',
      date: daysAgo(18),
      description: 'Sent casing to retreading partner after lifecycle inspection.',
      cost: 80,
      tires: { create: [{ tireId: retreadingTire.id }] },
    },
  });
  const returnedRetread = await prisma.maintenanceEvent.create({
    data: {
      companyId: company.id,
      vehicleId: truck2.id,
      performedById: users.northstarMaintenance.id,
      type: 'RETREADING_RETURN',
      date: monthDate(2, 20),
      description: 'Returned previous casing from retread with new 20mm tread package.',
      cost: 360,
      tires: { create: [{ tireId: disposedB.id }] },
    },
  });
  await prisma.tireEvent.create({
    data: {
      tireId: disposedB.id,
      eventType: 'RETURNED_FROM_RETREADING',
      performedById: users.northstarMaintenance.id,
      date: monthDate(2, 20),
      newTreadDepth: 20,
      lifecycleNumber: 2,
    },
  });
  const otherMaintenance = await prisma.maintenanceEvent.create({
    data: {
      companyId: company.id,
      vehicleId: trailer.id,
      performedById: users.northstarMaintenance.id,
      type: 'OTHER',
      date: monthDate(0, 6),
      description: 'Wheel alignment check after reefer unit service.',
      cost: 520,
      tires: { create: trailerTires.map((tire) => ({ tireId: tire.id })) },
    },
  });

  await createAudit({
    action: 'TIRE_SET_CREATED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'TireSet',
    entityId: mountedSet.id,
    details: { name: mountedSet.name, tireCount: activeTires.length },
    createdAt: monthsAgo(6, 1),
  });
  await createAudit({
    action: 'TIRE_SET_UPDATED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'TireSet',
    entityId: stockSet.id,
    details: { changedFields: ['name', 'tireIds'] },
    createdAt: monthsAgo(1, 20),
  });
  await createAudit({
    action: 'TIRE_SET_DISSOLVED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'TireSet',
    entityId: dissolvedSet.id,
    details: { name: dissolvedSet.name, tireCount: 0 },
    createdAt: monthsAgo(4, 25),
  });
  await prisma.tireSet.delete({ where: { id: dissolvedSet.id } });

  await createAudit({
    action: 'TIRE_CREATED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Tire',
    entityId: activeTires[0]!.id,
    details: { brand: 'Michelin', model: 'X Line Energy Z', count: 10 },
    createdAt: monthsAgo(8, 12),
  });
  await createAudit({
    action: 'TIRE_STATUS_CHANGED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Tire',
    entityId: retreadingTire.id,
    details: { from: 'MOUNTED', to: 'RETREADING' },
    createdAt: daysAgo(18),
  });
  await createAudit({
    action: 'TIRE_DISPOSED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Tire',
    entityId: disposedA.id,
    details: { brand: disposedA.brand, model: disposedA.model },
    createdAt: monthsAgo(2, 5),
  });
  await createAudit({
    action: 'TIRES_MOUNTED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck1.id,
    details: { tireIds: activeTires.map((tire) => tire.id), odometer: 94200 },
    createdAt: monthsAgo(8, 15),
  });
  await createAudit({
    action: 'TIRES_ROTATED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck1.id,
    details: { swaps: [{ tireId: activeTires[0]!.id, newPosition: 'FRONT_LEFT' }], odometer: 124900 },
    createdAt: monthsAgo(3, 10),
  });
  await createAudit({
    action: 'TIRES_DISMOUNTED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck2.id,
    details: { tireIds: [retreadingTire.id], reason: 'SENT_FOR_RETREADING', odometer: 211300 },
    createdAt: daysAgo(18),
  });
  await createAudit({
    action: 'FITMENT_OVERRIDE',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Tire',
    entityId: activeTires[1]!.id,
    details: {
      vehicleId: truck1.id,
      position: 'FRONT_RIGHT',
      expectedSizes: [{ width: 315, aspectRatio: 80, rimDiameter: 22.5 }],
      actualSize: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
    },
    createdAt: monthsAgo(8, 15),
  });
  await createAudit({
    action: 'MILEAGE_LOGGED',
    actorUserId: users.northstarDriver1.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: truck1.id,
    details: { odometer: 151400, date: daysAgo(2) },
    createdAt: daysAgo(2),
  });
  await createAudit({
    action: 'INSPECTION_COMPLETED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Inspection',
    entityId: detailedInspection.id,
    details: { type: 'DETAILED', vehicleId: truck1.id, resultCount: activeTires.length },
    createdAt: daysAgo(16),
  });
  await createAudit({
    action: 'INSPECTION_COMPLETED',
    actorUserId: users.northstarDriver1.id,
    companyId: company.id,
    entityType: 'Inspection',
    entityId: dailyInspection.id,
    details: { type: 'DAILY_CHECK', vehicleId: truck1.id, resultCount: activeTires.length },
    createdAt: daysAgo(2),
  });
  await createAudit({
    action: 'INSPECTION_COMPLETED',
    actorUserId: users.northstarMaintenance.id,
    companyId: company.id,
    entityType: 'Inspection',
    entityId: trailerInspection.id,
    details: { type: 'DETAILED', vehicleId: trailer.id, resultCount: trailerTires.length },
    createdAt: daysAgo(11),
  });

  for (const event of [replacement, repair, sendRetread, returnedRetread, otherMaintenance]) {
    await createAudit({
      action: 'MAINTENANCE_LOGGED',
      actorUserId: users.northstarMaintenance.id,
      companyId: company.id,
      entityType: 'MaintenanceEvent',
      entityId: event.id,
      details: { type: event.type, vehicleId: event.vehicleId },
      createdAt: event.date,
    });
  }

  await createAudit({
    action: 'COMPANY_SETTINGS_UPDATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'CompanySettings',
    details: { changedFields: ['minimumTreadDepth', 'staleInspectionThresholdDays'] },
    createdAt: monthsAgo(1, 11),
  });
  await createAudit({
    action: 'USER_INVITED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'User',
    entityId: users.northstarMaintenance.id,
    details: { invitedRole: 'maintenance' },
    createdAt: monthsAgo(8, 2),
  });
  await createAudit({
    action: 'USER_ROLE_CHANGED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'User',
    entityId: users.northstarMaintenance.id,
    details: { from: 'driver', to: 'maintenance' },
    createdAt: monthsAgo(7, 29),
  });
  await createAudit({
    action: 'USER_DEACTIVATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'User',
    entityId: users.inactiveNorthstarDriver.id,
    createdAt: monthsAgo(3, 2),
  });
  await createAudit({
    action: 'USER_REACTIVATED',
    actorUserId: users.northstarManager.id,
    companyId: company.id,
    entityType: 'User',
    entityId: users.northstarDriver2.id,
    createdAt: monthsAgo(4, 2),
  });
}

async function seedBlueRidgeFleet(
  company: DemoCompany,
  users: Awaited<ReturnType<typeof seedUsers>>,
  catalog: Awaited<ReturnType<typeof seedCatalog>>,
) {
  await prisma.companySettings.create({ data: { companyId: company.id } });
  const depot = await prisma.depot.create({
    data: {
      companyId: company.id,
      name: 'Asheville Terminal',
      address: '88 Logistics Way, Asheville, NC',
      contactInfo: 'Owen Mercer',
      createdAt: monthsAgo(5, 23),
    },
  });
  const vehicle = await prisma.vehicle.create({
    data: {
      companyId: company.id,
      depotId: depot.id,
      licensePlate: 'BR-2208',
      make: 'Peterbilt',
      model: '579',
      year: 2020,
      vehicleType: 'Tractor',
      assignedDriverId: users.blueDriver.id,
      createdAt: monthsAgo(5, 24),
      vehicleCompatibleSizes: {
        create: [{ width: 315, aspectRatio: 80, rimDiameter: 22.5, axlePosition: null }],
      },
    },
  });

  const tires = [
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.ecopia.id,
      brand: 'Bridgestone',
      model: 'Ecopia R284',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'BR-ECO-001',
      purchaseDate: monthsAgo(5, 26),
      purchasePrice: 585,
      initialTreadDepth: 16,
      expectedMileageLifespan: 175000,
      status: 'MOUNTED',
      currentVehicleId: vehicle.id,
      currentPosition: 'FRONT_LEFT',
      latestTreadDepth: 12.8,
      latestCondition: 'GOOD',
      latestInspectionDate: daysAgo(21),
      accumulatedMileage: 31000,
      mileageAtLastInspection: 67100,
      usagePercentage: 21,
      usageStatus: 'NEW',
      currentLifecycleStartDate: monthsAgo(5, 26),
    }),
    await createTire({
      companyId: company.id,
      catalogModelId: catalog.ecopia.id,
      brand: 'Bridgestone',
      model: 'Ecopia R284',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'BR-ECO-002',
      purchaseDate: monthsAgo(5, 26),
      purchasePrice: 585,
      initialTreadDepth: 16,
      expectedMileageLifespan: 175000,
      status: 'MOUNTED',
      currentVehicleId: vehicle.id,
      currentPosition: 'FRONT_RIGHT',
      latestTreadDepth: 11.2,
      latestCondition: 'GOOD',
      latestInspectionDate: daysAgo(21),
      accumulatedMileage: 31000,
      mileageAtLastInspection: 67100,
      usagePercentage: 54,
      usageStatus: 'MODERATE',
      currentLifecycleStartDate: monthsAgo(5, 26),
    }),
    await createTire({
      companyId: company.id,
      depotId: depot.id,
      catalogModelId: catalog.xLine.id,
      brand: 'Michelin',
      model: 'X Line Energy Z',
      size: { width: 315, aspectRatio: 80, rimDiameter: 22.5 },
      serialNumber: 'BR-STOCK-003',
      purchaseDate: monthDate(1, 8),
      purchasePrice: 615,
      initialTreadDepth: 15,
      expectedMileageLifespan: 190000,
      status: 'IN_STOCK',
      usagePercentage: 0,
      usageStatus: 'NEW',
    }),
  ];

  await prisma.tireEvent.createMany({
    data: tires
      .filter((tire) => tire.status === 'MOUNTED')
      .map((tire) => ({
        tireId: tire.id,
        vehicleId: vehicle.id,
        performedById: users.blueMaintenance.id,
        eventType: 'MOUNTED' as const,
        position: tire.currentPosition,
        odometerAt: 36100,
        date: monthsAgo(5, 26),
        lifecycleNumber: 1,
      })),
  });
  await prisma.mileageEntry.createMany({
    data: [
      { vehicleId: vehicle.id, recordedById: users.blueDriver.id, odometer: 36100, date: monthsAgo(5, 26) },
      { vehicleId: vehicle.id, recordedById: users.blueDriver.id, odometer: 67100, date: daysAgo(21) },
      { vehicleId: vehicle.id, recordedById: users.blueDriver.id, odometer: 69940, date: daysAgo(4) },
    ],
  });
  const inspection = await prisma.inspection.create({
    data: {
      companyId: company.id,
      vehicleId: vehicle.id,
      inspectorId: users.blueMaintenance.id,
      type: 'DETAILED',
      date: daysAgo(21),
      overallNotes: 'Pilot fleet inspection completed.',
      tireResults: {
        create: tires
          .filter((tire) => tire.status === 'MOUNTED')
          .map((tire) => ({
            tireId: tire.id,
            position: tire.currentPosition!,
            treadDepth: tire.latestTreadDepth,
            tirePressure: 8.5,
            condition: 'GOOD',
          })),
      },
    },
  });
  const maintenance = await prisma.maintenanceEvent.create({
    data: {
      companyId: company.id,
      vehicleId: vehicle.id,
      performedById: users.blueMaintenance.id,
      type: 'TIRE_REPAIR',
      date: monthDate(0, 4),
      description: 'Patch repair and pressure balancing on front-right tire.',
      cost: 210,
      tires: { create: [{ tireId: tires[1]!.id }] },
    },
  });

  await createAudit({
    action: 'VEHICLE_CREATED',
    actorUserId: users.blueManager.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: vehicle.id,
    details: { licensePlate: vehicle.licensePlate },
    createdAt: monthsAgo(5, 24),
  });
  await createAudit({
    action: 'TIRE_CREATED',
    actorUserId: users.blueMaintenance.id,
    companyId: company.id,
    entityType: 'Tire',
    entityId: tires[0]!.id,
    details: { brand: 'Bridgestone', model: 'Ecopia R284', count: 3 },
    createdAt: monthsAgo(5, 26),
  });
  await createAudit({
    action: 'MILEAGE_LOGGED',
    actorUserId: users.blueDriver.id,
    companyId: company.id,
    entityType: 'Vehicle',
    entityId: vehicle.id,
    details: { odometer: 69940, date: daysAgo(4) },
    createdAt: daysAgo(4),
  });
  await createAudit({
    action: 'INSPECTION_COMPLETED',
    actorUserId: users.blueMaintenance.id,
    companyId: company.id,
    entityType: 'Inspection',
    entityId: inspection.id,
    details: { type: 'DETAILED', vehicleId: vehicle.id, resultCount: 2 },
    createdAt: daysAgo(21),
  });
  await createAudit({
    action: 'MAINTENANCE_LOGGED',
    actorUserId: users.blueMaintenance.id,
    companyId: company.id,
    entityType: 'MaintenanceEvent',
    entityId: maintenance.id,
    details: { type: 'TIRE_REPAIR', vehicleId: vehicle.id },
    createdAt: maintenance.date,
  });
}

async function seedUrbanCold(company: DemoCompany, users: Awaited<ReturnType<typeof seedUsers>>) {
  const depot = await prisma.depot.create({
    data: {
      companyId: company.id,
      name: 'Newark Cold Dock',
      address: '22 Produce Market Rd, Newark, NJ',
      contactInfo: 'Priya Shah',
      createdAt: monthsAgo(2, 13),
    },
  });
  await prisma.companySettings.create({ data: { companyId: company.id } });
  await prisma.vehicle.create({
    data: {
      companyId: company.id,
      depotId: depot.id,
      licensePlate: 'UC-0912',
      make: 'Isuzu',
      model: 'FTR',
      year: 2019,
      vehicleType: 'Refrigerated Box Truck',
      createdAt: monthsAgo(2, 15),
      vehicleCompatibleSizes: {
        create: [{ width: 275, aspectRatio: 70, rimDiameter: 22.5, axlePosition: null }],
      },
    },
  });
  await createAudit({
    action: 'COMPANY_SUSPENDED',
    actorUserId: users.admin.id,
    companyId: null,
    entityType: 'Company',
    entityId: company.id,
    details: { companyName: company.name, reason: 'Demo suspended account state.' },
    createdAt: daysAgo(24),
  });
  await createAudit({
    action: 'COMPANY_REACTIVATED',
    actorUserId: users.admin.id,
    companyId: null,
    entityType: 'Company',
    entityId: company.id,
    details: { companyName: company.name, note: 'Historical reactivation audit example.' },
    createdAt: daysAgo(30),
  });
}

async function seedPlatformAudits(
  admin: DemoUser,
  requests: Awaited<ReturnType<typeof seedCompanyRequests>>,
  companies: Record<string, DemoCompany>,
) {
  await createAudit({
    action: 'COMPANY_REQUEST_SUBMITTED',
    actorUserId: null,
    companyId: null,
    entityType: 'CompanyRequest',
    entityId: requests.pending.id,
    details: { companyName: requests.pending.companyName },
    createdAt: requests.pending.createdAt,
  });
  await createAudit({
    action: 'COMPANY_REQUEST_APPROVED',
    actorUserId: admin.id,
    companyId: null,
    entityType: 'CompanyRequest',
    entityId: requests.approvedNorthstar.id,
    details: { companyName: requests.approvedNorthstar.companyName },
    createdAt: requests.approvedNorthstar.reviewedAt ?? monthsAgo(9, 14),
  });
  await createAudit({
    action: 'COMPANY_REQUEST_REJECTED',
    actorUserId: admin.id,
    companyId: null,
    entityType: 'CompanyRequest',
    entityId: requests.rejected.id,
    details: { companyName: requests.rejected.companyName, rejectionReason: requests.rejected.rejectionReason },
    createdAt: requests.rejected.reviewedAt ?? monthDate(1, 18),
  });
  for (const company of Object.values(companies)) {
    await createAudit({
      action: 'COMPANY_CREATED',
      actorUserId: admin.id,
      companyId: null,
      entityType: 'Company',
      entityId: company.id,
      details: { companyName: company.name, slug: company.slug },
      createdAt: monthsAgo(company.slug === 'northstar-logistics' ? 9 : company.slug === 'blue-ridge-freight' ? 5 : 2, 20),
    });
  }
}

async function main() {
  console.log('Resetting database...');
  await resetDatabase();

  console.log('Creating platform admin...');
  const admin = await createDemoUser({
    name: 'Admin User',
    email: 'admin@tirely.com',
    role: 'admin',
    createdAt: monthsAgo(12, 2),
  });

  console.log('Creating requests, companies, and users...');
  const requests = await seedCompanyRequests(admin);
  const companies = await seedCompanies(requests);
  const users = await seedUsers(admin, companies);

  console.log('Creating catalog...');
  const catalog = await seedCatalog(admin, companies, users);

  console.log('Creating fleet demo data...');
  await seedNorthstarFleet(companies.northstar, users, catalog);
  await seedBlueRidgeFleet(companies.blueRidge, users, catalog);
  await seedUrbanCold(companies.urbanCold, users);
  await seedPlatformAudits(admin, requests, companies);

  const [companyCount, userCount, tireCount, auditCount] = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.tire.count(),
    prisma.auditLog.count(),
  ]);

  console.log('Demo seed complete.');
  console.log(`Companies: ${companyCount}`);
  console.log(`Users: ${userCount}`);
  console.log(`Tires: ${tireCount}`);
  console.log(`Audit logs: ${auditCount}`);
  console.log('');
  console.log('Demo password for every user:', DEMO_PASSWORD);
  console.log('Admin: admin@tirely.com');
  console.log('Primary company manager: manager@northstar.demo');
  console.log('Primary company maintenance: maintenance@northstar.demo');
  console.log('Primary company driver: driver1@northstar.demo');
  console.log('Primary company slug: northstar-logistics');
}

main()
  .catch((err) => {
    console.error('Demo seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
