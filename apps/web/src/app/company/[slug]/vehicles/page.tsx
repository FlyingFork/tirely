'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiVehicleListItem } from '@tirely/types';
import { Badge, Button, DropdownMenu, Flex, Text } from '@radix-ui/themes';
import { ClipboardList, Gauge, MoreHorizontal, Plus, Wrench } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback } from 'react';

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
  {
    key: 'driverAssigned',
    label: 'Driver',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'true', label: 'Assigned' },
      { value: 'false', label: 'Unassigned' },
    ],
    defaultValue: 'ALL',
  },
];

function vehicleActionUrl(slug: string, path: string, vehicleId: string) {
  return `/company/${slug}/${path}?vehicleId=${encodeURIComponent(vehicleId)}`;
}

function buildColumns(slug: string, router: ReturnType<typeof useRouter>): ColumnDef<ApiVehicleListItem>[] {
  return [
  {
    key: 'licensePlate',
    label: 'License plate',
    sortable: true,
    render: (row) => (
      <Flex align="center" gap="2">
        <Text size="2" weight="medium" color={row.archived ? 'gray' : undefined}>
          {row.licensePlate}
        </Text>
        {row.archived && (
          <StatusBadge kind="active" active={false} inactiveLabel="Archived" />
        )}
      </Flex>
    ),
  },
  {
    key: 'make',
    label: 'Make / Model / Year',
    sortable: true,
    render: (row) => (
      <Text size="2" color="gray">
        {row.make} {row.model} ({row.year})
      </Text>
    ),
  },
  {
    key: 'depot',
    label: 'Depot',
    render: (row) => (
      <Text size="2" color="gray">
        {row.depot.name}
      </Text>
    ),
  },
  {
    key: 'driver',
    label: 'Driver',
    render: (row) => (
      <Text size="2" color="gray">
        {row.assignedDriver?.name ?? '—'}
      </Text>
    ),
  },
  {
    key: 'compatibleSizesCount',
    label: 'Sizes',
    render: (row) => (
      <Badge variant="soft" color="gray" size="1">
        {row.compatibleSizesCount}
      </Badge>
    ),
  },
  {
    key: 'actions',
    label: '',
    render: (row) => (
      <div onClick={(event) => event.stopPropagation()}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="ghost" color="gray" size="1" aria-label="Vehicle actions">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item
              onSelect={() => router.push(vehicleActionUrl(slug, 'mileage', row.id))}
            >
              <Gauge size={14} />
              Log mileage
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => router.push(vehicleActionUrl(slug, 'inspections/new', row.id))}
            >
              <ClipboardList size={14} />
              New inspection
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => router.push(vehicleActionUrl(slug, 'maintenance/new', row.id))}
            >
              <Wrench size={14} />
              Log maintenance
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    ),
  },
  ];
}

export default function VehiclesPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { data: session } = useSession();

  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';
  const columns = buildColumns(slug, router);

  const fetchData: DataTableProps<ApiVehicleListItem>['fetchData'] = useCallback(
    async (query) => {
      const archivedFilter = query.filters.archived;
      const archived =
        archivedFilter === 'true' ? true : archivedFilter === 'false' ? false : undefined;

      const driverFilter = query.filters.driverAssigned;
      const driverAssigned =
        driverFilter === 'true' ? true : driverFilter === 'false' ? false : undefined;

      const vehicleParams = new URLSearchParams({
        page: String(query.page),
        perPage: String(query.perPage),
        sortBy: (query.sort?.field as 'licensePlate' | 'make' | 'createdAt') ?? 'createdAt',
        sortOrder: query.sort?.direction ?? 'desc',
      });
      if (query.search) vehicleParams.set('search', query.search);
      if (archived !== undefined) vehicleParams.set('archived', String(archived));
      if (driverAssigned !== undefined) {
        vehicleParams.set('driverAssigned', String(driverAssigned));
      }

      const response = await authRequest<ApiVehicleListItem[]>(
        `/v1/company/${slug}/vehicles?${vehicleParams}`,
      );

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
        title="Vehicles"
        description="Manage your fleet vehicles"
        actions={
          canManage ? (
            <Button onClick={() => router.push(`/company/${slug}/vehicles/new`)}>
              <Plus size={16} />
              Add vehicle
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        filters={FILTERS}
        searchPlaceholder="Search by plate, make, or model"
        fetchData={fetchData}
        getRowKey={(row) => row.id}
        perPage={20}
        onRowClick={(row) => router.push(`/company/${slug}/vehicles/${row.id}`)}
        defaultSort={{ field: 'createdAt', direction: 'desc' }}
      />
    </Flex>
  );
}
