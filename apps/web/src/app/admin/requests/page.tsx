'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import {
  addActiveFilter,
  addTrimmedSearch,
  tableParams,
  unwrapTableResponse,
} from '@/lib/table-fetch';
import { Flex } from '@radix-ui/themes';
import type { CompanyRequest } from '@tirely/database';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const columns: ColumnDef<CompanyRequest>[] = [
  {
    key: 'companyName',
    label: 'Company Name',
    sortable: true,
  },
  {
    key: 'status',
    label: 'Status',
    render: (request) => <StatusBadge kind="request" status={request.status} />,
  },
  {
    key: 'createdAt',
    label: 'Created At',
    sortable: true,
    render: (request) => formatDate(request.createdAt),
  },
];

const filters: FilterDef[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
    ],
    defaultValue: 'ALL',
  },
];


export default function AdminRequestsPage() {
  const router = useRouter();

  const fetchData: DataTableProps<CompanyRequest>['fetchData'] = useCallback(async (query) => {
    const params = tableParams({
      page: query.page,
      perPage: query.perPage,
      sortOrder: query.sort?.direction ?? 'desc',
    });
    addActiveFilter(params, query.filters, 'status');
    addTrimmedSearch(params, query.search);

    const response = await authRequest<CompanyRequest[]>(`/v1/company/request?${params}`);
    return unwrapTableResponse(response);
  }, []);

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Company Requests"
        description="See and manage all company creation requests"
      />

      <DataTable
        columns={columns}
        filters={filters}
        searchPlaceholder="Search for request..."
        fetchData={fetchData}
        defaultSort={{ field: 'createdAt', direction: 'desc' }}
        perPage={10}
        getRowKey={(r) => r.id}
        onRowClick={(r) => router.push(`/admin/requests/${r.id}`)}
      />
    </Flex>
  );
}
