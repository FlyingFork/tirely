'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import { tableParams, unwrapTableResponse } from '@/lib/table-fetch';
import type { ApiInspectionListItem } from '@tirely/types';
import { Badge, Button, Flex, Text } from '@radix-ui/themes';
import { Plus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';

const FILTERS: FilterDef[] = [
  {
    key: 'type',
    label: 'Type',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'DAILY_CHECK', label: 'Daily' },
      { value: 'DETAILED', label: 'Detailed' },
    ],
    defaultValue: 'ALL',
  },
];

const TYPE_LABELS: Record<string, string> = {
  DAILY_CHECK: 'Daily',
  DETAILED: 'Detailed',
};

function canCreateInspection(role: string | null | undefined) {
  return (
    role === 'admin' ||
    role === 'fleet_manager' ||
    role === 'maintenance' ||
    role === 'driver'
  );
}

function selectedInspectionType(typeFilter: string | undefined) {
  return typeFilter === 'DAILY_CHECK' || typeFilter === 'DETAILED' ? typeFilter : undefined;
}

function findingsSummary(row: ApiInspectionListItem) {
  return {
    ok: row.resultCount - row.concernCount,
    concerns: row.concernCount,
  };
}

const COLUMNS: ColumnDef<ApiInspectionListItem>[] = [
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
    key: 'vehicle',
    label: 'Vehicle',
    render: (row) => (
      <Text size="2" color="gray">
        {row.vehicle.licensePlate} — {row.vehicle.make} {row.vehicle.model}
      </Text>
    ),
  },
  {
    key: 'inspector',
    label: 'Inspector',
    render: (row) => (
      <Text size="2" color="gray">
        {row.inspector.name}
      </Text>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    render: (row) => (
      <Badge color={row.type === 'DETAILED' ? 'blue' : 'gray'} size="1">
        {TYPE_LABELS[row.type] ?? row.type}
      </Badge>
    ),
  },
  {
    key: 'findings',
    label: 'Findings',
    render: (row) => {
      const findings = findingsSummary(row);
      return (
        <Flex gap="2">
          <Badge color="green" size="1">
            {findings.ok} OK
          </Badge>
          {findings.concerns > 0 && (
            <Badge color="red" size="1">
              {findings.concerns} concern{findings.concerns !== 1 ? 's' : ''}
            </Badge>
          )}
        </Flex>
      );
    },
  },
];

export default function InspectionsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session } = useSession();

  const role = session?.user.role;
  const canCreate = canCreateInspection(role);

  const fetchData: DataTableProps<ApiInspectionListItem>['fetchData'] = useCallback(
    async (query) => {
      const type = selectedInspectionType(query.filters.type);
      const params = tableParams({
        page: query.page,
        perPage: query.perPage,
        type,
      });

      const response = await authRequest<ApiInspectionListItem[]>(
        `/v1/company/${slug}/inspections?${params}`,
      );
      return unwrapTableResponse(response);
    },
    [slug],
  );

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Inspections"
        description="Daily checks and detailed tire inspections"
        actions={
          canCreate ? (
            <Button onClick={() => router.push(`/company/${slug}/inspections/new`)}>
              <Plus size={16} />
              New inspection
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
        onRowClick={(row) => router.push(`/company/${slug}/inspections/${row.id}`)}
        defaultSort={{ field: 'date', direction: 'desc' }}
      />
    </Flex>
  );
}
