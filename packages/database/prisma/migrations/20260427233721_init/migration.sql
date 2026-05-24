-- CreateEnum
CREATE TYPE "CompanyRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "TireStatus" AS ENUM ('IN_STOCK', 'MOUNTED', 'RETREADING', 'DISPOSED');

-- CreateEnum
CREATE TYPE "TireEventType" AS ENUM ('PURCHASED', 'MOUNTED', 'DISMOUNTED', 'ROTATED', 'SENT_FOR_RETREADING', 'RETURNED_FROM_RETREADING', 'DISPOSED');

-- CreateEnum
CREATE TYPE "DismountReason" AS ENUM ('REPLACEMENT', 'SEASONAL_SWAP', 'END_OF_LIFE', 'SENT_FOR_RETREADING');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('DAILY_CHECK', 'DETAILED');

-- CreateEnum
CREATE TYPE "TireCondition" AS ENUM ('GOOD', 'MINOR_WEAR', 'CONCERN');

-- CreateEnum
CREATE TYPE "TireConditionDetailed" AS ENUM ('GOOD', 'NEEDS_MONITORING', 'NEEDS_REPLACEMENT');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('TIRE_REPLACEMENT', 'TIRE_REPAIR', 'RETREADING_SEND_OFF', 'RETREADING_RETURN', 'OTHER');

-- CreateEnum
CREATE TYPE "CatalogEntryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TireCategory" AS ENUM ('STEER', 'DRIVE', 'TRAILER', 'ALL_POSITION', 'WINTER', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('COMPANY_CREATED', 'COMPANY_SUSPENDED', 'COMPANY_REACTIVATED', 'USER_LOGIN', 'USER_LOGOUT', 'USER_LOGIN_FAILED', 'USER_ROLE_CHANGED', 'COMPANY_REQUEST_SUBMITTED', 'COMPANY_REQUEST_APPROVED', 'COMPANY_REQUEST_REJECTED', 'VEHICLE_CREATED', 'VEHICLE_UPDATED', 'VEHICLE_ARCHIVED', 'TIRE_CREATED', 'TIRE_STATUS_CHANGED', 'TIRE_DISPOSED', 'FITMENT_OVERRIDE', 'INSPECTION_COMPLETED', 'MAINTENANCE_LOGGED');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "role" TEXT,
    "banned" BOOLEAN DEFAULT false,
    "banReason" TEXT,
    "banExpires" TIMESTAMP(3),
    "firstLogin" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "impersonatedBy" TEXT,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyRequest" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "contactPersonName" TEXT NOT NULL,
    "contactPersonPhone" TEXT NOT NULL,
    "fleetSizeEstimate" TEXT NOT NULL,
    "depotCountEstimate" INTEGER NOT NULL,
    "message" TEXT,
    "status" "CompanyRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "address" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyRequestId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "minimumTreadDepth" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "maximumAgeMonths" INTEGER NOT NULL DEFAULT 72,
    "defaultExpectedMileage" INTEGER NOT NULL DEFAULT 150000,
    "staleInspectionThresholdDays" INTEGER NOT NULL DEFAULT 90,
    "defaultWearRate" DOUBLE PRECISION NOT NULL DEFAULT 0.00005,
    "retreadingLifespanReduction" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "maxRetreadingCycles" INTEGER NOT NULL DEFAULT 3,
    "treadWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.60,
    "mileageWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "ageWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "conditionWeight" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "alertInfoThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70.0,
    "alertUrgentThreshold" DOUBLE PRECISION NOT NULL DEFAULT 85.0,
    "alertCriticalThreshold" DOUBLE PRECISION NOT NULL DEFAULT 95.0,
    "imbalanceThreshold" DOUBLE PRECISION NOT NULL DEFAULT 15.0,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Depot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contactInfo" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Depot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "depotId" TEXT NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vin" TEXT,
    "vehicleType" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedDriverId" TEXT,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleCompatibleSize" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "aspectRatio" INTEGER NOT NULL,
    "rimDiameter" DOUBLE PRECISION NOT NULL,
    "axlePosition" TEXT,

    CONSTRAINT "VehicleCompatibleSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MileageEntry" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "odometer" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MileageEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tire" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "aspectRatio" INTEGER NOT NULL,
    "rimDiameter" DOUBLE PRECISION NOT NULL,
    "loadIndex" TEXT,
    "speedRating" TEXT,
    "dotCode" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "initialTreadDepth" DOUBLE PRECISION NOT NULL,
    "expectedMileageLifespan" INTEGER,
    "status" "TireStatus" NOT NULL DEFAULT 'IN_STOCK',
    "retreadingCount" INTEGER NOT NULL DEFAULT 0,
    "currentLifecycleNumber" INTEGER NOT NULL DEFAULT 1,
    "currentVehicleId" TEXT,
    "currentPosition" TEXT,
    "depotId" TEXT,
    "usagePercentage" DOUBLE PRECISION,
    "usageStatus" TEXT,
    "usageIsEstimated" BOOLEAN NOT NULL DEFAULT false,
    "usageCalculatedAt" TIMESTAMP(3),
    "latestTreadDepth" DOUBLE PRECISION,
    "latestCondition" "TireConditionDetailed",
    "latestInspectionDate" TIMESTAMP(3),
    "accumulatedMileage" INTEGER NOT NULL DEFAULT 0,
    "mileageAtLastInspection" INTEGER NOT NULL DEFAULT 0,
    "tireSetId" TEXT,
    "catalogModelId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TireSet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TireSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TireEvent" (
    "id" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "performedById" TEXT,
    "eventType" "TireEventType" NOT NULL,
    "position" TEXT,
    "odometerAt" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "dismountReason" "DismountReason",
    "newTreadDepth" DOUBLE PRECISION,
    "fitmentOverride" BOOLEAN NOT NULL DEFAULT false,
    "fitmentNote" TEXT,
    "lifecycleNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TireEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "overallNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InspectionTire" (
    "id" TEXT NOT NULL,
    "inspectionId" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "visualCondition" "TireCondition",
    "anomalyNotes" TEXT,
    "treadDepth" DOUBLE PRECISION,
    "tirePressure" DOUBLE PRECISION,
    "damageNotes" TEXT,
    "condition" "TireConditionDetailed",

    CONSTRAINT "InspectionTire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "cost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceEventTire" (
    "id" TEXT NOT NULL,
    "maintenanceEventId" TEXT NOT NULL,
    "tireId" TEXT NOT NULL,

    CONSTRAINT "MaintenanceEventTire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogBrand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CatalogEntryStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogBrand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogModel" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "TireCategory",
    "defaultInitialTreadDepth" DOUBLE PRECISION,
    "defaultExpectedMileage" INTEGER,
    "status" "CatalogEntryStatus" NOT NULL DEFAULT 'PENDING',
    "submittedByCompanyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogModelSize" (
    "id" TEXT NOT NULL,
    "catalogModelId" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "aspectRatio" INTEGER NOT NULL,
    "rimDiameter" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CatalogModelSize_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "CompanyRequest_status_idx" ON "CompanyRequest"("status");

-- CreateIndex
CREATE INDEX "CompanyRequest_companyEmail_idx" ON "CompanyRequest"("companyEmail");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_companyRequestId_key" ON "Company"("companyRequestId");

-- CreateIndex
CREATE INDEX "Company_status_idx" ON "Company"("status");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_companyId_key" ON "company_settings"("companyId");

-- CreateIndex
CREATE INDEX "Depot_companyId_idx" ON "Depot"("companyId");

-- CreateIndex
CREATE INDEX "Depot_companyId_archived_idx" ON "Depot"("companyId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_assignedDriverId_key" ON "Vehicle"("assignedDriverId");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_idx" ON "Vehicle"("companyId");

-- CreateIndex
CREATE INDEX "Vehicle_depotId_idx" ON "Vehicle"("depotId");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_depotId_idx" ON "Vehicle"("companyId", "depotId");

-- CreateIndex
CREATE INDEX "Vehicle_companyId_archived_idx" ON "Vehicle"("companyId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_companyId_licensePlate_key" ON "Vehicle"("companyId", "licensePlate");

-- CreateIndex
CREATE INDEX "VehicleCompatibleSize_vehicleId_idx" ON "VehicleCompatibleSize"("vehicleId");

-- CreateIndex
CREATE INDEX "MileageEntry_vehicleId_idx" ON "MileageEntry"("vehicleId");

-- CreateIndex
CREATE INDEX "MileageEntry_vehicleId_date_idx" ON "MileageEntry"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "Tire_companyId_idx" ON "Tire"("companyId");

-- CreateIndex
CREATE INDEX "Tire_companyId_status_idx" ON "Tire"("companyId", "status");

-- CreateIndex
CREATE INDEX "Tire_companyId_depotId_idx" ON "Tire"("companyId", "depotId");

-- CreateIndex
CREATE INDEX "Tire_currentVehicleId_idx" ON "Tire"("currentVehicleId");

-- CreateIndex
CREATE INDEX "Tire_usagePercentage_idx" ON "Tire"("usagePercentage");

-- CreateIndex
CREATE INDEX "Tire_tireSetId_idx" ON "Tire"("tireSetId");

-- CreateIndex
CREATE INDEX "TireSet_companyId_idx" ON "TireSet"("companyId");

-- CreateIndex
CREATE INDEX "TireEvent_tireId_idx" ON "TireEvent"("tireId");

-- CreateIndex
CREATE INDEX "TireEvent_tireId_date_idx" ON "TireEvent"("tireId", "date");

-- CreateIndex
CREATE INDEX "TireEvent_vehicleId_idx" ON "TireEvent"("vehicleId");

-- CreateIndex
CREATE INDEX "TireEvent_performedById_idx" ON "TireEvent"("performedById");

-- CreateIndex
CREATE INDEX "Inspection_companyId_idx" ON "Inspection"("companyId");

-- CreateIndex
CREATE INDEX "Inspection_inspectorId_idx" ON "Inspection"("inspectorId");

-- CreateIndex
CREATE INDEX "Inspection_vehicleId_idx" ON "Inspection"("vehicleId");

-- CreateIndex
CREATE INDEX "Inspection_vehicleId_date_idx" ON "Inspection"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "InspectionTire_inspectionId_idx" ON "InspectionTire"("inspectionId");

-- CreateIndex
CREATE INDEX "InspectionTire_tireId_idx" ON "InspectionTire"("tireId");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_companyId_idx" ON "MaintenanceEvent"("companyId");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_vehicleId_idx" ON "MaintenanceEvent"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceEvent_vehicleId_date_idx" ON "MaintenanceEvent"("vehicleId", "date");

-- CreateIndex
CREATE INDEX "MaintenanceEventTire_maintenanceEventId_idx" ON "MaintenanceEventTire"("maintenanceEventId");

-- CreateIndex
CREATE INDEX "MaintenanceEventTire_tireId_idx" ON "MaintenanceEventTire"("tireId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogBrand_name_key" ON "CatalogBrand"("name");

-- CreateIndex
CREATE INDEX "CatalogModel_brandId_idx" ON "CatalogModel"("brandId");

-- CreateIndex
CREATE INDEX "CatalogModel_status_idx" ON "CatalogModel"("status");

-- CreateIndex
CREATE INDEX "CatalogModel_submittedByCompanyId_idx" ON "CatalogModel"("submittedByCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogModel_brandId_name_key" ON "CatalogModel"("brandId", "name");

-- CreateIndex
CREATE INDEX "CatalogModelSize_catalogModelId_idx" ON "CatalogModelSize"("catalogModelId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogModelSize_catalogModelId_width_aspectRatio_rimDiamet_key" ON "CatalogModelSize"("catalogModelId", "width", "aspectRatio", "rimDiameter");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_idx" ON "AuditLog"("companyId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_companyRequestId_fkey" FOREIGN KEY ("companyRequestId") REFERENCES "CompanyRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depot" ADD CONSTRAINT "Depot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleCompatibleSize" ADD CONSTRAINT "VehicleCompatibleSize_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileageEntry" ADD CONSTRAINT "MileageEntry_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MileageEntry" ADD CONSTRAINT "MileageEntry_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_depotId_fkey" FOREIGN KEY ("depotId") REFERENCES "Depot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_tireSetId_fkey" FOREIGN KEY ("tireSetId") REFERENCES "TireSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tire" ADD CONSTRAINT "Tire_catalogModelId_fkey" FOREIGN KEY ("catalogModelId") REFERENCES "CatalogModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireSet" ADD CONSTRAINT "TireSet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireEvent" ADD CONSTRAINT "TireEvent_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireEvent" ADD CONSTRAINT "TireEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TireEvent" ADD CONSTRAINT "TireEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTire" ADD CONSTRAINT "InspectionTire_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "Inspection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InspectionTire" ADD CONSTRAINT "InspectionTire_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEvent" ADD CONSTRAINT "MaintenanceEvent_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEventTire" ADD CONSTRAINT "MaintenanceEventTire_maintenanceEventId_fkey" FOREIGN KEY ("maintenanceEventId") REFERENCES "MaintenanceEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceEventTire" ADD CONSTRAINT "MaintenanceEventTire_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "Tire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogModel" ADD CONSTRAINT "CatalogModel_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "CatalogBrand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogModel" ADD CONSTRAINT "CatalogModel_submittedByCompanyId_fkey" FOREIGN KEY ("submittedByCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogModelSize" ADD CONSTRAINT "CatalogModelSize_catalogModelId_fkey" FOREIGN KEY ("catalogModelId") REFERENCES "CatalogModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
