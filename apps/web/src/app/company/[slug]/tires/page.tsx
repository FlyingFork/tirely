'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Form, type FormHelpers } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/auth-client';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiTireSet, ApiTireSummary } from '@tirely/types';
import { tireSetCreateSchema, type TireSetCreateInput } from '@tirely/validators';
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Layers, Plus, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

const FILTERS: FilterDef[] = [
  {
    key: 'status',
    label: 'Status',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'IN_STOCK', label: 'In stock' },
      { value: 'MOUNTED', label: 'Mounted' },
      { value: 'RETREADING', label: 'Retreading' },
      { value: 'DISPOSED', label: 'Disposed' },
    ],
    defaultValue: 'IN_STOCK',
  },
];

function sizeLabel(t: Pick<ApiTireSummary, 'width' | 'aspectRatio' | 'rimDiameter'>) {
  return `${t.width}/${t.aspectRatio}R${t.rimDiameter}`;
}

function hasMixedSizes(tires: ApiTireSummary[]) {
  if (tires.length < 2) return false;
  const first = sizeLabel(tires[0]!);
  return tires.some((t) => sizeLabel(t) !== first);
}

function canManageTires(role: string | null | undefined) {
  return role === 'admin' || role === 'fleet_manager' || role === 'maintenance';
}

function selectedTireStatus(statusFilter: string | undefined) {
  return statusFilter && statusFilter !== 'ALL'
    ? (statusFilter as ApiTireSummary['status'])
    : undefined;
}

function selectedTireIds(selectedTires: ApiTireSummary[]) {
  return selectedTires.map((tire) => tire.id);
}

function TireLocation({ tire }: { tire: ApiTireSummary }) {
  if (tire.currentVehicle) {
    return (
      <Flex direction="column" gap="1">
        <Text size="2">{tire.currentVehicle.licensePlate}</Text>
        <Text size="1" color="gray">
          {tire.currentVehicle.position}
        </Text>
      </Flex>
    );
  }

  if (tire.depot) {
    return (
      <Text size="2" color="gray">
        {tire.depot.name}
      </Text>
    );
  }

  return (
    <Text size="2" color="gray">
      {'\u2014'}
    </Text>
  );
}

function LastInspectionDate({ date }: { date: string | null }) {
  return (
    <Text size="2" color="gray">
      {date ? formatDate(date) : '\u2014'}
    </Text>
  );
}

const listTires = (
  slug: string,
  query: {
    page: number;
    perPage: number;
    search?: string;
    status?: ApiTireSummary['status'];
    sortBy: string;
    sortOrder: string;
  },
) => {
  const params = new URLSearchParams({
    page: String(query.page),
    perPage: String(query.perPage),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  return authRequest<ApiTireSummary[]>(`/v1/company/${slug}/tires?${params}`);
};

const createTireSet = (slug: string, body: TireSetCreateInput) =>
  authRequest<ApiTireSet>(`/v1/company/${slug}/tire-sets`, { method: 'POST', body });

function SelectedTireBar({
  selectedCount,
  onCreateSet,
  onClear,
}: {
  selectedCount: number;
  onCreateSet: () => void;
  onClear: () => void;
}) {
  if (selectedCount === 0) return null;

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
      }}
    >
      <Card>
        <Flex align="center" gap="3" p="2">
          <Text size="2">
            {selectedCount} tire{selectedCount !== 1 ? 's' : ''} selected
          </Text>
          <Button onClick={onCreateSet}>
            <Layers size={14} />
            Create tire set
          </Button>
          <Button variant="ghost" color="gray" onClick={onClear}>
            <X size={14} />
            Clear
          </Button>
        </Flex>
      </Card>
    </Box>
  );
}

export default function TiresPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();

  const canManage = canManageTires(session?.user.role);

  const [selectedTires, setSelectedTires] = useState<ApiTireSummary[]>([]);
  const [createSetOpen, setCreateSetOpen] = useState(false);

  const toggleTire = useCallback((tire: ApiTireSummary) => {
    setSelectedTires((prev) =>
      prev.some((t) => t.id === tire.id)
        ? prev.filter((t) => t.id !== tire.id)
        : [...prev, tire],
    );
  }, []);

  const columns = useMemo<ColumnDef<ApiTireSummary>[]>(
    () => [
      {
        key: 'select',
        label: '',
        render: (row) => (
          <Box
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: 'default', display: 'flex', alignItems: 'center' }}
          >
            <Checkbox
              checked={selectedTires.some((t) => t.id === row.id)}
              onCheckedChange={() => toggleTire(row)}
            />
          </Box>
        ),
      },
      {
        key: 'brand',
        label: 'Brand / Model',
        sortable: true,
        render: (row) => (
          <Flex direction="column" gap="1">
            <Text size="2" weight="medium">
              {row.brand}
            </Text>
            <Text size="1" color="gray">
              {row.model}
            </Text>
          </Flex>
        ),
      },
      {
        key: 'size',
        label: 'Size',
        render: (row) => (
          <Text size="2" color="gray">
            {sizeLabel(row)}
          </Text>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        render: (row) => <StatusBadge kind="tire" status={row.status} />,
      },
      {
        key: 'location',
        label: 'Location',
        render: (row) => <TireLocation tire={row} />,
      },
      {
        key: 'usagePercentage',
        label: 'Usage',
        sortable: true,
        render: (row) => (
          <StatusBadge
            kind="usage"
            percentage={row.usagePercentage}
            status={row.usageStatus}
            isEstimated={row.usageIsEstimated}
          />
        ),
      },
      {
        key: 'latestInspectionDate',
        label: 'Last inspection',
        render: (row) => <LastInspectionDate date={row.latestInspectionDate} />,
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
    ],
    [selectedTires, toggleTire],
  );

  const fetchData: DataTableProps<ApiTireSummary>['fetchData'] = useCallback(
    async (query) => {
      const status = selectedTireStatus(query.filters.status);

      const response = await listTires(slug, {
        page: query.page,
        perPage: query.perPage,
        search: query.search,
        status,
        sortBy: (query.sort?.field as 'createdAt' | 'usagePercentage' | 'brand') ?? 'createdAt',
        sortOrder: query.sort?.direction ?? 'desc',
      });

      if ('code' in response) throw new Error(response.message);

      return {
        data: response.data,
        total: response.meta?.total ?? 0,
      };
    },
    [slug],
  );

  const createSelectedTireSet = async (
    values: TireSetCreateInput,
    setError: FormHelpers<TireSetCreateInput>['setError'],
  ) => {
    const res = await createTireSet(slug, values);
    if ('code' in res) {
      setError('root.serverError', { message: res.message });
      return;
    }

    toast({ title: 'Tire set created', variant: 'success' });
    setCreateSetOpen(false);
    setSelectedTires([]);
  };

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Tires"
        description="Manage your tire inventory"
        actions={
          canManage ? (
            <Button onClick={() => router.push(`/company/${slug}/tires/new`)}>
              <Plus size={16} />
              Add tire
            </Button>
          ) : null
        }
      />

      <DataTable
        columns={columns}
        filters={FILTERS}
        searchPlaceholder="Search by brand or model"
        fetchData={fetchData}
        getRowKey={(row) => row.id}
        perPage={20}
        onRowClick={(row) => router.push(`/company/${slug}/tires/${row.id}`)}
        defaultSort={{ field: 'createdAt', direction: 'desc' }}
      />

      <SelectedTireBar
        selectedCount={selectedTires.length}
        onCreateSet={() => setCreateSetOpen(true)}
        onClear={() => setSelectedTires([])}
      />

      <Dialog.Root open={createSetOpen} onOpenChange={setCreateSetOpen}>
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Create tire set</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Name this set. The {selectedTires.length} selected tire
            {selectedTires.length !== 1 ? 's' : ''} will be added to it.
          </Dialog.Description>

          <Form
            schema={tireSetCreateSchema}
            defaultValues={{ name: '', tireIds: selectedTireIds(selectedTires) }}
            onSubmit={async (values, { setError }) => createSelectedTireSet(values, setError)}
          >
            <Flex direction="column" gap="3">
              <FormField name="name" label="Set name" required>
                {(field) => (
                  <TextField.Root
                    {...field}
                    value={field.value ?? ''}
                    placeholder="e.g. Truck-12 set #1"
                    maxLength={80}
                  />
                )}
              </FormField>

              <Flex gap="1" wrap="wrap">
                {selectedTires.map((t) => (
                  <Badge key={t.id} variant="outline" color="cyan" size="1">
                    {t.brand} {t.model} – {sizeLabel(t)}
                  </Badge>
                ))}
              </Flex>

              {hasMixedSizes(selectedTires) && (
                <Callout.Root color="orange" size="1">
                  <Callout.Text>
                    Tires in this set have different sizes. You can still save.
                  </Callout.Text>
                </Callout.Root>
              )}

              <FormErrorState />

              <Flex gap="2" justify="end">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <SubmitButton>Create set</SubmitButton>
              </Flex>
            </Flex>
          </Form>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
