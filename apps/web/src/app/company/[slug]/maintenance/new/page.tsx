'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Box, Button, Callout, Card, Checkbox, Flex, Select, Text, TextArea, TextField } from '@radix-ui/themes';
import { maintenanceCreateSchema, type MaintenanceCreateInput } from '@tirely/validators';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFormContext, useWatch } from 'react-hook-form';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiMaintenanceEvent, ApiTireSummary, ApiVehicleListItem } from '@tirely/types';

const MAINTENANCE_TYPES = [
  { value: 'TIRE_REPLACEMENT', label: 'Tire replacement' },
  { value: 'TIRE_REPAIR', label: 'Tire repair' },
  { value: 'RETREADING_SEND_OFF', label: 'Retreading send-off' },
  { value: 'RETREADING_RETURN', label: 'Retreading return' },
  { value: 'OTHER', label: 'Other' },
] as const;

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const listTires = (
  slug: string,
  query: {
    page: number;
    perPage: number;
    sortBy: string;
    sortOrder: string;
    vehicleId?: string;
    status?: string;
    archived?: boolean;
  },
) => {
  const params = new URLSearchParams({
    page: String(query.page),
    perPage: String(query.perPage),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });
  if (query.vehicleId) params.set('vehicleId', query.vehicleId);
  if (query.status) params.set('status', query.status);
  if (query.archived !== undefined) params.set('archived', String(query.archived));
  return authRequest<ApiTireSummary[]>(`/v1/company/${slug}/tires?${params}`);
};

const listVehicles = (slug: string) =>
  authRequest<ApiVehicleListItem[]>(
    `/v1/company/${slug}/vehicles?${new URLSearchParams({
      page: '1',
      perPage: '100',
      sortBy: 'licensePlate',
      sortOrder: 'asc',
      archived: 'false',
    })}`,
  );

function TireSelectionFields({ slug, initialTireIds }: { slug: string; initialTireIds: string[] }) {
  const { setValue, getValues } = useFormContext<MaintenanceCreateInput>();
  const type = useWatch<MaintenanceCreateInput, 'type'>({ name: 'type' });
  const vehicleId = useWatch<MaintenanceCreateInput, 'vehicleId'>({ name: 'vehicleId' });
  const tireIds = useWatch<MaintenanceCreateInput, 'tireIds'>({ name: 'tireIds' }) ?? [];
  const newTreadDepths =
    useWatch<MaintenanceCreateInput, 'newTreadDepths'>({ name: 'newTreadDepths' }) ?? {};

  const [vehicleTires, setVehicleTires] = useState<ApiTireSummary[]>([]);
  const [retreadingTires, setRetreadingTires] = useState<ApiTireSummary[]>([]);
  const appliedInitialTiresRef = useRef(false);

  const isRetreading = type === 'RETREADING_RETURN';
  const displayedTires = isRetreading ? retreadingTires : vehicleTires;

  const loadVehicleTires = useCallback(
    async (vid: string) => {
      if (!vid) {
        setVehicleTires([]);
        return;
      }
      const res = await listTires(slug, {
        page: 1,
        perPage: 100,
        sortBy: 'createdAt',
        sortOrder: 'asc',
        vehicleId: vid,
        archived: false,
      });
      if ('code' in res) return;
      setVehicleTires(res.data);
    },
    [slug],
  );

  const loadRetreadingTires = useCallback(async () => {
    const res = await listTires(slug, {
      page: 1,
      perPage: 100,
      sortBy: 'createdAt',
      sortOrder: 'asc',
      status: 'RETREADING',
      archived: false,
    });
    if ('code' in res) return;
    setRetreadingTires(res.data);
  }, [slug]);

  useEffect(() => {
    setValue('tireIds', appliedInitialTiresRef.current ? [] : initialTireIds);
    setValue('newTreadDepths', {});
    appliedInitialTiresRef.current = true;
    if (isRetreading) {
      loadRetreadingTires();
    } else {
      loadVehicleTires(vehicleId);
    }
  }, [initialTireIds, isRetreading, loadRetreadingTires, loadVehicleTires, setValue, vehicleId]);

  const toggleTire = (tireId: string) => {
    const current = getValues('tireIds') ?? [];
    const next = current.includes(tireId)
      ? current.filter((id) => id !== tireId)
      : [...current, tireId];
    setValue('tireIds', next, { shouldDirty: true, shouldValidate: true });

    if (current.includes(tireId)) {
      const depths = { ...(getValues('newTreadDepths') ?? {}) };
      delete depths[tireId];
      setValue('newTreadDepths', depths, { shouldDirty: true, shouldValidate: true });
    }
  };

  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium">
        {isRetreading ? 'Tires returning from retreading (required)' : 'Tires involved (optional)'}
      </Text>

      {displayedTires.length === 0 ? (
        <Callout.Root color="gray" size="1">
          <Callout.Text>
            {isRetreading
              ? 'No tires are currently in RETREADING status.'
              : vehicleId
                ? 'No tires found for this vehicle.'
                : 'Select a vehicle first.'}
          </Callout.Text>
        </Callout.Root>
      ) : (
        <Flex direction="column" gap="2">
          {displayedTires.map((tire) => {
            const checked = tireIds.includes(tire.id);
            return (
              <Card key={tire.id} variant="surface">
                <Flex direction="column" gap="2" p="1">
                  <Flex align="center" gap="3">
                    <Checkbox checked={checked} onCheckedChange={() => toggleTire(tire.id)} />
                    <Text size="2">
                      {tire.brand} {tire.model}
                    </Text>
                  </Flex>
                  {isRetreading && checked && (
                    <Flex direction="column" gap="1" pl="6">
                      <Text size="1" color="gray" weight="medium">
                        New tread depth after retreading (mm) <Text color="red">*</Text>
                      </Text>
                      <TextField.Root
                        type="number"
                        min="1"
                        max="50"
                        step="0.1"
                        placeholder="e.g. 10"
                        style={{ maxWidth: 180 }}
                        value={newTreadDepths[tire.id] ?? ''}
                        onChange={(event) =>
                          setValue(
                            'newTreadDepths',
                            {
                              ...newTreadDepths,
                              [tire.id]: Number(event.target.value),
                            },
                            { shouldDirty: true, shouldValidate: true },
                          )
                        }
                      />
                    </Flex>
                  )}
                </Flex>
              </Card>
            );
          })}
        </Flex>
      )}
    </Flex>
  );
}

function NewMaintenancePageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { data: session, isPending } = useSession();
  const role = session?.user.role;
  const canCreate = role === 'admin' || role === 'fleet_manager' || role === 'maintenance';
  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [defaultDate] = useState(() => new Date());
  const requestedVehicleId = searchParams.get('vehicleId') ?? '';
  const requestedType = searchParams.get('type');
  const requestedTireIdsParam = searchParams.get('tireIds') ?? '';
  const requestedTireIds = useMemo(
    () =>
      requestedTireIdsParam
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
    [requestedTireIdsParam],
  );
  const initialType =
    MAINTENANCE_TYPES.some((type) => type.value === requestedType)
      ? (requestedType as MaintenanceCreateInput['type'])
      : 'TIRE_REPAIR';

  useEffect(() => {
    if (isPending || !canCreate) return;
    listVehicles(slug).then((res) => {
      if ('code' in res) return;
      setVehicles(res.data);
    });
  }, [canCreate, isPending, slug]);

  const defaults: MaintenanceCreateInput = {
    vehicleId: requestedVehicleId,
    type: initialType,
    date: defaultDate,
    description: undefined,
    cost: undefined,
    tireIds: requestedTireIds,
    newTreadDepths: {},
  };

  if (isPending || !session || !canCreate) return null;

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Button variant="ghost" color="gray" asChild>
          <Link href={`/company/${slug}/maintenance`}>
            <ArrowLeft size={16} />
            Back to maintenance
          </Link>
        </Button>
      </Flex>

      <PageHeader title="Log maintenance" description="Record tire repairs, replacements, and retreading events" />

      <Card style={{ maxWidth: 720 }}>
        <Box p="2">
          <Form
            schema={maintenanceCreateSchema}
            defaultValues={defaults}
            onSubmit={async (values, { setError }) => {
              const res = await authRequest<ApiMaintenanceEvent>(
                `/v1/company/${slug}/maintenance`,
                {
                  method: 'POST',
                  body: {
                    ...values,
                    description: values.description?.trim() || undefined,
                    tireIds: values.tireIds?.length ? values.tireIds : undefined,
                    newTreadDepths:
                      values.type === 'RETREADING_RETURN' ? values.newTreadDepths : undefined,
                  },
                },
              );

              if ('code' in res) {
                setError('root.serverError', { message: res.message });
                return;
              }

              router.push(`/company/${slug}/maintenance/${res.data.id}`);
            }}
          >
            <Flex direction="column" gap="4">
              <FormField name="vehicleId" label="Vehicle" required>
                {(field) => (
                  <Select.Root value={field.value as string | undefined} onValueChange={field.onChange}>
                    <Select.Trigger placeholder="Select a vehicle" />
                    <Select.Content>
                      {vehicles.map((vehicle) => (
                        <Select.Item key={vehicle.id} value={vehicle.id}>
                          {vehicle.licensePlate} - {vehicle.make} {vehicle.model}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </FormField>

              <FormField name="type" label="Type" required>
                {(field) => (
                  <Select.Root value={field.value as string | undefined} onValueChange={field.onChange}>
                    <Select.Trigger />
                    <Select.Content>
                      {MAINTENANCE_TYPES.map((type) => (
                        <Select.Item key={type.value} value={type.value}>
                          {type.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </FormField>

              <FormField name="date" label="Date" required>
                {(field) => (
                  <TextField.Root
                    type="date"
                    value={dateInputValue(field.value as unknown as Date)}
                    onChange={(event) => field.onChange(new Date(event.target.value))}
                    size="3"
                  />
                )}
              </FormField>

              <TireSelectionFields slug={slug} initialTireIds={requestedTireIds} />

              <FormField name="cost" label="Cost (optional)">
                {(field) => (
                  <TextField.Root
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    placeholder="e.g. 250"
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(event.target.value ? Number(event.target.value) : undefined)
                    }
                    size="3"
                    style={{ maxWidth: 240 }}
                  />
                )}
              </FormField>

              <FormField name="description" label="Description (optional)">
                {(field) => (
                  <TextArea
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                    placeholder="Describe the maintenance performed..."
                    maxLength={2000}
                    size="3"
                  />
                )}
              </FormField>

              <FormErrorState />

              <Box>
                <SubmitButton>Log maintenance</SubmitButton>
              </Box>
            </Flex>
          </Form>
        </Box>
      </Card>
    </Flex>
  );
}

export default function NewMaintenancePage() {
  return (
    <Suspense>
      <NewMaintenancePageInner />
    </Suspense>
  );
}
