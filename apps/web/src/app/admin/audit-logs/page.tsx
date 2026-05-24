'use client';

import { AuditLogsTable } from '@/components/AuditLogsTable';
import type { DataTableProps } from '@/components/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { authRequest } from '@/lib/http';
import {
  addActiveFilter,
  addTrimmedSearch,
  tableParams,
  unwrapTableResponse,
} from '@/lib/table-fetch';
import { Flex } from '@radix-ui/themes';
import type { ApiAuditLog } from '@tirely/types';
import { useCallback } from 'react';


export default function AdminAuditLogsPage() {
  const fetchData: DataTableProps<ApiAuditLog>['fetchData'] = useCallback(async (query) => {
    const params = tableParams({
      page: query.page,
      perPage: query.perPage,
      sortOrder: query.sort?.direction ?? 'desc',
    });
    addActiveFilter(params, query.filters, 'action');
    addActiveFilter(params, query.filters, 'entityType');
    addTrimmedSearch(params, query.search);

    const response = await authRequest<ApiAuditLog[]>(`/v1/audit-logs?${params}`);
    return unwrapTableResponse(response);
  }, []);

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Audit logs"
        description="System-wide actions not scoped to a specific company"
      />

      <AuditLogsTable fetchData={fetchData} />
    </Flex>
  );
}
