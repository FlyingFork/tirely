-- AlterEnum
-- Adds audit actions for tire-set and tire mounting lifecycle mutations.

ALTER TYPE "AuditAction" ADD VALUE 'TIRE_SET_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TIRE_SET_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TIRE_SET_DISSOLVED';
ALTER TYPE "AuditAction" ADD VALUE 'TIRES_MOUNTED';
ALTER TYPE "AuditAction" ADD VALUE 'TIRES_DISMOUNTED';
ALTER TYPE "AuditAction" ADD VALUE 'TIRES_ROTATED';
