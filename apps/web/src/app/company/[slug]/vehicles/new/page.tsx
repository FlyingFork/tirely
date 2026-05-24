'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';

import { TireSizeSelector, EMPTY_COMPATIBLE_SIZE } from '@/components/TireSizeSelector';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiCompanyMember, ApiDepot, ApiVehicle } from '@tirely/types';
import { vehicleCreateSchema, type VehicleCreateInput } from '@tirely/validators';
import { Box, Button, Card, Flex, Grid, Select, Text, TextField } from '@radix-ui/themes';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useFieldArray, useFormContext } from 'react-hook-form';

function defaultValues(year: number, depotId?: string, assignedDriverId?: string): VehicleCreateInput {
  return {
    licensePlate: '',
    make: '',
    model: '',
    year,
    vin: undefined,
    vehicleType: undefined,
    depotId: depotId ?? '',
    assignedDriverId: assignedDriverId || undefined,
    compatibleSizes: [{ ...EMPTY_COMPATIBLE_SIZE }],
  };
}

function CompatibleSizesFieldArray() {
  const { control, setValue } = useFormContext<VehicleCreateInput>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'compatibleSizes',
  });

  return (
    <Flex direction="column" gap="2">
      <Text size="2" weight="medium">
        Compatible tire sizes <Text color="red">*</Text>
      </Text>
      <Flex direction="column" gap="2">
        {fields.map((field, index) => (
          <TireSizeSelector
            key={field.id}
            value={field}
            onChange={(value) =>
              setValue(`compatibleSizes.${index}`, value, { shouldDirty: true })
            }
            onRemove={() => remove(index)}
            showRemove={fields.length > 1}
          />
        ))}
      </Flex>
      <Box>
        <Button
          type="button"
          variant="ghost"
          onClick={() => append({ ...EMPTY_COMPATIBLE_SIZE })}
          disabled={fields.length >= 20}
        >
          <Plus size={14} />
          Add another size
        </Button>
      </Box>
    </Flex>
  );
}

const listDepots = (slug: string) =>
  authRequest<ApiDepot[]>(
    `/v1/company/${slug}/depots?${new URLSearchParams({
      page: '1',
      perPage: '100',
      sortBy: 'name',
      sortOrder: 'asc',
    })}`,
  );

const listDrivers = (slug: string) =>
  authRequest<ApiCompanyMember[]>(
    `/v1/company/${slug}/users?${new URLSearchParams({
      page: '1',
      perPage: '100',
      role: 'driver',
    })}`,
  );

function NewVehiclePageInner() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';
  const [yearLimit] = useState(() => new Date().getFullYear() + 1);

  const [depots, setDepots] = useState<ApiDepot[]>([]);
  const [drivers, setDrivers] = useState<ApiCompanyMember[]>([]);
  const requestedDepotId = searchParams.get('depotId') ?? '';
  const requestedDriverId = searchParams.get('driverId') ?? '';

  const loadOptions = useCallback(async () => {
    if (!canManage) return;
    const [depotRes, driverRes] = await Promise.all([
      listDepots(slug),
      listDrivers(slug),
    ]);
    if (!('code' in depotRes)) setDepots(depotRes.data);
    if (!('code' in driverRes)) setDrivers(driverRes.data);
  }, [canManage, slug]);

  useEffect(() => {
    if (!isPending && canManage) loadOptions();
  }, [canManage, isPending, loadOptions]);

  if (isPending || !session || !canManage) return null;

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Button variant="ghost" color="gray" asChild>
          <Link href={`/company/${slug}/vehicles`}>
            <ArrowLeft size={16} />
            Back to vehicles
          </Link>
        </Button>
      </Flex>

      <PageHeader title="Add vehicle" description="Register a new fleet vehicle" />

      <Card style={{ maxWidth: 720 }}>
        <Box p="2">
          <Form
            schema={vehicleCreateSchema}
            defaultValues={defaultValues(yearLimit - 1, requestedDepotId, requestedDriverId)}
            onSubmit={async (values, { setError }) => {
              const res = await authRequest<ApiVehicle>(`/v1/company/${slug}/vehicles`, {
                method: 'POST',
                body: {
                  ...values,
                  vin: values.vin?.trim() || undefined,
                  vehicleType: values.vehicleType?.trim() || undefined,
                  assignedDriverId: values.assignedDriverId || undefined,
                },
              });

              if ('code' in res) {
                setError('root.serverError', { message: res.message });
                return;
              }

              router.push(`/company/${slug}/vehicles/${res.data.id}`);
            }}
          >
            <Flex direction="column" gap="4">
              <FormField name="licensePlate" label="License plate" required>
                {(field) => <TextField.Root {...field} placeholder="e.g. B-123-XYZ" size="3" />}
              </FormField>

              <Grid columns={{ initial: '1', sm: '3' }} gap="3">
                <FormField name="make" label="Make" required>
                  {(field) => <TextField.Root {...field} placeholder="e.g. Volvo" size="3" />}
                </FormField>
                <FormField name="model" label="Model" required>
                  {(field) => <TextField.Root {...field} placeholder="e.g. FH16" size="3" />}
                </FormField>
                <FormField name="year" label="Year" required>
                  {(field) => (
                    <TextField.Root
                      {...field}
                      type="number"
                      min={1980}
                      max={yearLimit}
                      size="3"
                      onChange={(event) => field.onChange(Number(event.target.value))}
                    />
                  )}
                </FormField>
              </Grid>

              <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                <FormField name="vin" label="VIN">
                  {(field) => (
                    <TextField.Root
                      {...field}
                      value={field.value ?? ''}
                      placeholder="17-character VIN"
                      maxLength={17}
                      size="3"
                    />
                  )}
                </FormField>
                <FormField name="vehicleType" label="Vehicle type">
                  {(field) => (
                    <TextField.Root
                      {...field}
                      value={field.value ?? ''}
                      placeholder="e.g. Truck, Semi, Trailer"
                      size="3"
                    />
                  )}
                </FormField>
              </Grid>

              <FormField name="depotId" label="Depot" required>
                {(field) => (
                  <Select.Root value={field.value as string | undefined} onValueChange={field.onChange}>
                    <Select.Trigger placeholder="Select a depot" />
                    <Select.Content>
                      {depots.map((depot) => (
                        <Select.Item key={depot.id} value={depot.id}>
                          {depot.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </FormField>

              <FormField name="assignedDriverId" label="Driver">
                {(field) => (
                  <Select.Root
                    value={(field.value as string | undefined) ?? 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                  >
                    <Select.Trigger placeholder="None" />
                    <Select.Content>
                      <Select.Item value="none">None</Select.Item>
                      {drivers.map((driver) => (
                        <Select.Item key={driver.id} value={driver.id}>
                          {driver.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </FormField>

              <CompatibleSizesFieldArray />

              <FormErrorState />

              <Box>
                <SubmitButton>Save vehicle</SubmitButton>
              </Box>
            </Flex>
          </Form>
        </Box>
      </Card>
    </Flex>
  );
}

export default function NewVehiclePage() {
  return (
    <Suspense>
      <NewVehiclePageInner />
    </Suspense>
  );
}
