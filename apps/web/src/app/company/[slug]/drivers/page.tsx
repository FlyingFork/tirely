'use client';

import { CompanyUserInviteDialog } from '@/components/company/CompanyUserInviteDialog';
import { DriverVehicleAssignmentDialog } from '@/components/company/DriverVehicleAssignmentDialog';
import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { DRIVER_ASSIGNMENT_CHANGED_EVENT } from '@/lib/company-events';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type {
  ApiCompanyMember,
  ApiInspectionListItem,
  ApiMileageEntry,
  ApiVehicleListItem,
} from '@tirely/types';
import { Button, DropdownMenu, Flex, Text } from '@radix-ui/themes';
import { Car, MoreHorizontal, UserPlus } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type DriverListRow = {
  driver: ApiCompanyMember;
  assignedVehicle: ApiVehicleListItem | null;
  lastMileageEntry: ApiMileageEntry | null;
  lastInspection: ApiInspectionListItem | null;
};

const FILTERS: FilterDef[] = [
  {
    key: 'hasVehicle',
    label: 'Assignment',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'true', label: 'Has vehicle' },
      { value: 'false', label: 'No vehicle' },
    ],
    defaultValue: 'ALL',
  },
];

function compareByName(a: ApiCompanyMember, b: ApiCompanyMember) {
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

function canManageDrivers(role: string | null | undefined) {
  return role === 'admin' || role === 'fleet_manager';
}

function matchesDriverSearch(row: DriverListRow, search: string) {
  return (
    row.driver.name.toLowerCase().includes(search) ||
    row.driver.email.toLowerCase().includes(search)
  );
}

function filterDriverRows(
  rows: DriverListRow[],
  query: Parameters<DataTableProps<DriverListRow>['fetchData']>[0],
) {
  let filteredRows = rows;
  const normalizedSearch = query.search?.trim().toLowerCase();

  if (normalizedSearch) {
    filteredRows = filteredRows.filter((row) => matchesDriverSearch(row, normalizedSearch));
  }

  const hasVehicleFilter = query.filters.hasVehicle;
  if (hasVehicleFilter === 'true') {
    return filteredRows.filter((row) => row.assignedVehicle !== null);
  }
  if (hasVehicleFilter === 'false') {
    return filteredRows.filter((row) => row.assignedVehicle === null);
  }

  return filteredRows;
}

function paginateDriverRows(
  rows: DriverListRow[],
  page: number,
  perPage: number,
) {
  const start = (page - 1) * perPage;
  return rows.slice(start, start + perPage);
}

const listDrivers = (slug: string) =>
  authRequest<ApiCompanyMember[]>(
    `/v1/company/${slug}/users?${new URLSearchParams({
      page: '1',
      perPage: '100',
      role: 'driver',
    })}`,
  );

const listVehicles = (slug: string) =>
  authRequest<ApiVehicleListItem[]>(
    `/v1/company/${slug}/vehicles?${new URLSearchParams({
      page: '1',
      perPage: '100',
      sortBy: 'licensePlate',
      sortOrder: 'asc',
    })}`,
  );

const listVehicleMileage = (slug: string, vehicleId: string) =>
  authRequest<ApiMileageEntry[]>(
    `/v1/company/${slug}/vehicles/${vehicleId}/mileage?${new URLSearchParams({
      page: '1',
      perPage: '1',
    })}`,
  );

const listInspections = (slug: string, vehicleId: string) =>
  authRequest<ApiInspectionListItem[]>(
    `/v1/company/${slug}/inspections?${new URLSearchParams({
      page: '1',
      perPage: '1',
      vehicleId,
    })}`,
  );

async function buildDriverRows(slug: string): Promise<DriverListRow[]> {
  const [usersResponse, vehiclesResponse] = await Promise.all([
    listDrivers(slug),
    listVehicles(slug),
  ]);

  if ('code' in usersResponse) throw new Error(usersResponse.message);
  if ('code' in vehiclesResponse) throw new Error(vehiclesResponse.message);

  const drivers = [...usersResponse.data].sort(compareByName);
  const vehicleByDriverId = new Map<string, ApiVehicleListItem>();

  for (const vehicle of vehiclesResponse.data) {
    if (vehicle.assignedDriver?.id) {
      vehicleByDriverId.set(vehicle.assignedDriver.id, vehicle);
    }
  }

  const assignedVehicles = drivers
    .map((driver) => vehicleByDriverId.get(driver.id))
    .filter((vehicle): vehicle is ApiVehicleListItem => vehicle !== undefined);

  const activityEntries = await Promise.all(
    assignedVehicles.map(async (vehicle) => {
      const [mileageResponse, inspectionsResponse] = await Promise.all([
        listVehicleMileage(slug, vehicle.id),
        listInspections(slug, vehicle.id),
      ]);

      return {
        vehicleId: vehicle.id,
        lastMileageEntry: 'code' in mileageResponse ? null : (mileageResponse.data[0] ?? null),
        lastInspection:
          'code' in inspectionsResponse ? null : (inspectionsResponse.data[0] ?? null),
      };
    }),
  );

  const activityByVehicleId = new Map(activityEntries.map((entry) => [entry.vehicleId, entry]));

  return drivers.map((driver) => {
    const assignedVehicle = vehicleByDriverId.get(driver.id) ?? null;
    const activity = assignedVehicle ? activityByVehicleId.get(assignedVehicle.id) : undefined;

    return {
      driver,
      assignedVehicle,
      lastMileageEntry: activity?.lastMileageEntry ?? null,
      lastInspection: activity?.lastInspection ?? null,
    };
  });
}

function createDriverColumns(
  onAssignVehicle: (driver: ApiCompanyMember) => void,
): ColumnDef<DriverListRow>[] {
  return [
    {
      key: 'name',
      label: 'Name / Email',
      render: ({ driver }) => (
        <Flex direction="column" gap="0">
          <Text size="2" weight="medium">
            {driver.name}
          </Text>
          <Text size="1" color="gray">
            {driver.email}
          </Text>
        </Flex>
      ),
    },
    {
      key: 'assignedVehicle',
      label: 'Assigned vehicle',
      render: ({ assignedVehicle }) =>
        assignedVehicle ? (
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="2" color="gray">
              {assignedVehicle.licensePlate}
            </Text>
            {assignedVehicle.archived ? (
              <StatusBadge kind="active" active={false} inactiveLabel="Archived" />
            ) : null}
          </Flex>
        ) : (
          <Text size="2" color="gray">
            -
          </Text>
        ),
    },
    {
      key: 'lastMileage',
      label: 'Last mileage entry',
      render: ({ lastMileageEntry }) => (
        <Text size="2" color="gray">
          {lastMileageEntry?.date ? formatDate(lastMileageEntry.date) : '-'}
        </Text>
      ),
    },
    {
      key: 'lastInspection',
      label: 'Last inspection',
      render: ({ lastInspection }) => (
        <Text size="2" color="gray">
          {lastInspection?.date ? formatDate(lastInspection.date) : '-'}
        </Text>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: ({ driver }) => (
        <Flex direction="column" gap="1" align="start">
          <StatusBadge kind="active" active={!driver.banned} inactiveLabel="Deactivated" />
          {driver.firstLogin ? (
            <Text size="1" color="gray">
              First login pending
            </Text>
          ) : null}
        </Flex>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="ghost" color="gray" size="1" aria-label="Driver actions">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item onSelect={() => onAssignVehicle(row.driver)}>
                <Car size={14} />
                {row.assignedVehicle ? 'Change vehicle' : 'Assign vehicle'}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      ),
    },
  ];
}

export default function DriversPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [assignmentTarget, setAssignmentTarget] = useState<ApiCompanyMember | null>(null);
  const [tableKey, setTableKey] = useState(0);

  const refresh = useCallback(() => setTableKey((current) => current + 1), []);

  useEffect(() => {
    if (isPending || !session) return;
    if (!canManageDrivers(session.user.role)) {
      router.replace(`/company/${slug}`);
    }
  }, [isPending, router, session, slug]);

  useEffect(() => {
    const handleAssignmentChanged = () => refresh();
    window.addEventListener(DRIVER_ASSIGNMENT_CHANGED_EVENT, handleAssignmentChanged);
    return () =>
      window.removeEventListener(DRIVER_ASSIGNMENT_CHANGED_EVENT, handleAssignmentChanged);
  }, [refresh]);

  const fetchData: DataTableProps<DriverListRow>['fetchData'] = useCallback(
    async (query) => {
      const rows = filterDriverRows(await buildDriverRows(slug), query);

      return {
        data: paginateDriverRows(rows, query.page, query.perPage),
        total: rows.length,
      };
    },
    [slug],
  );

  const columns = createDriverColumns(setAssignmentTarget);

  if (isPending || !session) return null;
  if (!canManageDrivers(session.user.role)) return null;

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Drivers"
        description="Review driver assignments, mileage cadence, and inspection activity"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} />
            Invite driver
          </Button>
        }
      />

      <DataTable
        key={tableKey}
        columns={columns}
        filters={FILTERS}
        searchPlaceholder="Search by name or email"
        fetchData={fetchData}
        getRowKey={(row) => row.driver.id}
        onRowClick={(row) => router.push(`/company/${slug}/drivers/${row.driver.id}`)}
        perPage={20}
      />

      <CompanyUserInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        slug={slug}
        onSuccess={refresh}
        initialRole="driver"
        lockRole
        title="Invite driver"
      />

      <DriverVehicleAssignmentDialog
        open={assignmentTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAssignmentTarget(null);
        }}
        slug={slug}
        driver={assignmentTarget}
        onAssigned={refresh}
      />
    </Flex>
  );
}
