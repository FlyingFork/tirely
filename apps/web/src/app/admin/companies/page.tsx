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
import { Flex, Text } from '@radix-ui/themes';
import type { ApiCompanyListItem } from '@tirely/types';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const columns: ColumnDef<ApiCompanyListItem>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (c) => (
      <Flex direction="column" gap="1">
        <Text size="2" weight="medium">
          {c.name}
        </Text>
        <Text size="1" color="gray">
          /{c.slug}
        </Text>
      </Flex>
    ),
  },
  {
    key: 'contactEmail',
    label: 'Contact Email',
    render: (c) => <Text size="2">{c.contactEmail}</Text>,
  },
  {
    key: 'status',
    label: 'Status',
    render: (c) => <StatusBadge kind="company" status={c.status} />,
  },
  {
    key: 'userCount',
    label: 'Members',
    render: (c) => <Text size="2">{c.userCount}</Text>,
  },
  {
    key: 'createdAt',
    label: 'Created At',
    sortable: true,
    render: (c) => formatDate(c.createdAt),
  },
];

const filters: FilterDef[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'ACTIVE', label: 'Active' },
      { value: 'SUSPENDED', label: 'Suspended' },
    ],
    defaultValue: 'ALL',
  },
];


export default function AdminCompaniesPage() {
  const router = useRouter();

  const fetchData: DataTableProps<ApiCompanyListItem>['fetchData'] = useCallback(async (query) => {
    const sortField = query.sort?.field === 'name' ? 'name' : 'createdAt';
    const params = tableParams({
      page: query.page,
      perPage: query.perPage,
      sortBy: sortField,
      sortOrder: query.sort?.direction ?? 'desc',
    });
    addActiveFilter(params, query.filters, 'status');
    addTrimmedSearch(params, query.search);

    const response = await authRequest<ApiCompanyListItem[]>(`/v1/company?${params}`);
    return unwrapTableResponse(response);
  }, []);

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Companies"
        description="Browse and manage all companies on the platform"
      />

      <DataTable
        columns={columns}
        filters={filters}
        searchPlaceholder="Search by name, slug or email..."
        fetchData={fetchData}
        defaultSort={{ field: 'createdAt', direction: 'desc' }}
        perPage={10}
        getRowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/admin/companies/${c.slug}`)}
      />
    </Flex>
  );
}
