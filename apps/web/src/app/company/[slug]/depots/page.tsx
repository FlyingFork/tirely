'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiDepot } from '@tirely/types';
import { Button, Flex, Text } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

const FILTERS: FilterDef[] = [
  {
    key: 'archived',
    label: 'Status',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'false', label: 'Active' },
      { value: 'true', label: 'Archived' },
    ],
    defaultValue: 'false',
  },
];

const COLUMNS: ColumnDef<ApiDepot>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (row) => (
      <Flex align="center" gap="2">
        <Text size="2" weight="medium" color={row.archived ? 'gray' : undefined}>
          {row.name}
        </Text>
        {row.archived && (
          <StatusBadge kind="active" active={false} inactiveLabel="Archived" />
        )}
      </Flex>
    ),
  },
  {
    key: 'address',
    label: 'Address',
    render: (row) => (
      <Text size="2" color="gray">
        {row.address ?? '—'}
      </Text>
    ),
  },
  {
    key: 'vehicleCount',
    label: 'Vehicles',
    render: (row) => (
      <Text size="2" color="gray">
        {row.vehicleCount ?? 0}
      </Text>
    ),
  },
  {
    key: 'createdAt',
    label: 'Created',
    sortable: true,
    render: (row) => (
      <Text size="2" color="gray">
        {formatDate(row.createdAt)}
      </Text>
    ),
  },
];

export default function DepotsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { data: session } = useSession();
  const [tableKey] = useState(0);

  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  const fetchData: DataTableProps<ApiDepot>['fetchData'] = useCallback(
    async (query) => {
      const archivedFilter = query.filters.archived;
      const archived =
        archivedFilter === 'true' ? true : archivedFilter === 'false' ? false : undefined;

      const depotParams = new URLSearchParams({
        page: String(query.page),
        perPage: String(query.perPage),
        sortBy: (query.sort?.field as 'name' | 'createdAt') ?? 'name',
        sortOrder: query.sort?.direction ?? 'asc',
      });
      if (query.search) depotParams.set('search', query.search);
      if (archived !== undefined) depotParams.set('archived', String(archived));

      const response = await authRequest<ApiDepot[]>(`/v1/company/${slug}/depots?${depotParams}`);

      if ('code' in response) throw new Error(response.message);

      return {
        data: response.data,
        total: response.meta?.total ?? 0,
      };
    },
    [slug],
  );

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Depots"
        description="Physical locations your fleet operates from"
        actions={
          canManage ? (
            <Button onClick={() => router.push(`/company/${slug}/depots/new`)}>
              <Plus size={16} />
              Add depot
            </Button>
          ) : null
        }
      />

      <DataTable
        key={tableKey}
        columns={COLUMNS}
        filters={FILTERS}
        searchPlaceholder="Search depots"
        fetchData={fetchData}
        getRowKey={(row) => row.id}
        perPage={20}
        onRowClick={(row) => router.push(`/company/${slug}/depots/${row.id}`)}
        defaultSort={{ field: 'name', direction: 'asc' }}
      />
    </Flex>
  );
}
