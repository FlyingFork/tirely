'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { formatDate, formatNumber } from '@/lib/format';
import { authRequest } from '@/lib/http';
import { addActiveFilter, tableParams, unwrapTableResponse } from '@/lib/table-fetch';
import type { ApiMaintenanceEvent } from '@tirely/types';
import { Button, Flex, Text } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';

const FILTERS: FilterDef[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All types' },
      { value: 'TIRE_REPLACEMENT', label: 'Tire replacement' },
      { value: 'TIRE_REPAIR', label: 'Tire repair' },
      { value: 'RETREADING_SEND_OFF', label: 'Retreading send-off' },
      { value: 'RETREADING_RETURN', label: 'Retreading return' },
      { value: 'OTHER', label: 'Other' },
    ],
  },
];

const COLUMNS: ColumnDef<ApiMaintenanceEvent>[] = [
  {
    key: 'date',
    label: 'Date',
    render: (row) => (
      <Text size="2" weight="medium">
        {formatDate(row.date)}
      </Text>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    render: (row) => <StatusBadge kind="maintenanceType" type={row.type} />,
  },
  {
    key: 'tires',
    label: 'Tires',
    render: (row) => (
      <Text size="2" color="gray">
        {row.tires.length === 0 ? '-' : row.tires.length}
      </Text>
    ),
  },
  {
    key: 'cost',
    label: 'Cost',
    render: (row) => (
      <Text size="2" color="gray">
        {row.cost != null ? formatNumber(row.cost) : '-'}
      </Text>
    ),
  },
  {
    key: 'performedBy',
    label: 'Performed by',
    render: (row) => (
      <Text size="2" color="gray">
        {row.performedBy.name}
      </Text>
    ),
  },
];

function canLogMaintenance(role: string | null | undefined) {
  return role === 'admin' || role === 'fleet_manager' || role === 'maintenance';
}

export default function MaintenancePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const role = session?.user.role;
  const canCreate = canLogMaintenance(role);

  const fetchData: DataTableProps<ApiMaintenanceEvent>['fetchData'] = useCallback(
    async (query) => {
      const params = tableParams({ page: query.page, perPage: query.perPage });
      addActiveFilter(params, query.filters, 'type');

      const response = await authRequest<ApiMaintenanceEvent[]>(
        `/v1/company/${slug}/maintenance?${params}`,
      );
      return unwrapTableResponse(response);
    },
    [slug],
  );

  return (
    <Flex direction="column" gap="3" className="anim-fade-in">
      <PageHeader
        title="Maintenance"
        description="Tire repairs, replacements, and retreading events"
        actions={
          canCreate ? (
            <Button onClick={() => router.push(`/company/${slug}/maintenance/new`)}>
              <Plus size={16} />
              Log maintenance
            </Button>
          ) : null
        }
      />
      <DataTable
        columns={COLUMNS}
        filters={FILTERS}
        fetchData={fetchData}
        getRowKey={(row) => row.id}
        perPage={20}
        onRowClick={(row) => router.push(`/company/${slug}/maintenance/${row.id}`)}
        defaultSort={{ field: 'date', direction: 'desc' }}
      />
    </Flex>
  );
}
