'use client';

import { AuditLogsTable } from '@/components/AuditLogsTable';
import type { DataTableProps } from '@/components/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import {
  addActiveFilter,
  addTrimmedSearch,
  tableParams,
  unwrapTableResponse,
} from '@/lib/table-fetch';
import { Flex } from '@radix-ui/themes';
import type { ApiAuditLog } from '@tirely/types';
import { useParams } from 'next/navigation';
import { useCallback } from 'react';

export default function CompanyAuditLogsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session, isPending } = useSession();
  const canView = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  const fetchData: DataTableProps<ApiAuditLog>['fetchData'] = useCallback(
    async (query) => {
      const auditParams = tableParams({
        page: query.page,
        perPage: query.perPage,
        sortOrder: query.sort?.direction ?? 'desc',
      });
      addActiveFilter(auditParams, query.filters, 'action');
      addActiveFilter(auditParams, query.filters, 'entityType');
      addTrimmedSearch(auditParams, query.search);

      const response = await authRequest<ApiAuditLog[]>(
        `/v1/company/${slug}/audit-logs?${auditParams}`,
      );

      return unwrapTableResponse(response);
    },
    [slug],
  );

  if (isPending || !session || !canView) return null;

  return (
    <Flex direction="column" gap="3">
      <PageHeader title="Audit logs" description="Actions scoped to this company" />

      <AuditLogsTable fetchData={fetchData} />
    </Flex>
  );
}
