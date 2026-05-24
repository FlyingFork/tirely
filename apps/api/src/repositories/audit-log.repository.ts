import { prisma } from '@tirely/database';
import type { AuditAction, Prisma } from '@tirely/database';

export interface CreateAuditLogInput {
  action: AuditAction;
  companyId?: string | null;
  actorUserId?: string | null;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
}

export const createAuditLog = (input: CreateAuditLogInput) =>
  prisma.auditLog.create({
    data: {
      action: input.action,
      companyId: input.companyId ?? null,
      actorUserId: input.actorUserId ?? null,
      userId: input.userId ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      details: input.details ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });

export type AuditLogScope = 'admin' | { companyId: string };

export interface ListAuditLogsArgs {
  skip: number;
  take: number;
  scope: AuditLogScope;
  action?: AuditAction;
  entityType?: string;
  search?: string;
  sortOrder: 'asc' | 'desc';
}

const AUDIT_LOG_INCLUDE = {
  actor: { select: { id: true, name: true, email: true } },
} as const satisfies Prisma.AuditLogInclude;

export type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: typeof AUDIT_LOG_INCLUDE;
}>;

export const listAuditLogs = async (args: ListAuditLogsArgs) => {
  const where: Prisma.AuditLogWhereInput = {
    // admin scope: platform-level logs have null companyId; company scope filters by id
    companyId: args.scope === 'admin' ? null : args.scope.companyId,
    ...(args.action !== undefined && { action: args.action }),
    ...(args.entityType && { entityType: args.entityType }),
    ...(args.search && {
      OR: [
        { entityId: { contains: args.search, mode: 'insensitive' } },
        { details: { contains: args.search, mode: 'insensitive' } },
      ],
    }),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: AUDIT_LOG_INCLUDE,
      skip: args.skip,
      take: args.take,
      orderBy: { createdAt: args.sortOrder },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
};
