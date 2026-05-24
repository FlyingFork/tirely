import type { AuditAction } from '@tirely/database';

export interface ApiAuditLogActor {
  id: string;
  name: string;
  email: string;
}

export interface ApiAuditLog {
  id: string;
  action: AuditAction;
  companyId: string | null;
  actorUserId: string | null;
  actor: ApiAuditLogActor | null;
  userId: string | null;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}
