'use client';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { FormSection } from '@/components/forms/FormSection';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiInspection, ApiMountedTire, ApiVehicleListItem } from '@tirely/types';
import {
  dailyInspectionSchema,
  detailedInspectionSchema,
  type DailyInspectionInput,
  type DetailedInspectionInput,
} from '@tirely/validators';
import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  RadioGroup,
  Select,
  Separator,
  Tabs,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { ArrowLeft, ClipboardCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useFieldArray } from 'react-hook-form';

function dailyDefaults(vehicleId: string, tires: ApiMountedTire[], date: Date): DailyInspectionInput {
  return {
    vehicleId,
    date,
    results: tires.map((tire) => ({
      tireId: tire.tireId,
      visualCondition: 'GOOD',
      anomalyNotes: undefined,
    })),
    overallNotes: undefined,
  };
}

function detailedDefaults(
  vehicleId: string,
  tires: ApiMountedTire[],
  date: Date,
): DetailedInspectionInput {
  return {
    vehicleId,
    date,
    results: tires.map((tire) => ({
      tireId: tire.tireId,
      treadDepth: undefined as unknown as number,
      tirePressure: undefined,
      damageNotes: undefined,
      condition: 'GOOD',
    })),
    overallNotes: undefined,
  };
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function tireLabel(tire: ApiMountedTire | undefined) {
  if (!tire) return 'Mounted tire';
  return `${tire.position} - ${tire.brand} ${tire.model}`;
}

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

const fetchMountedTires = (slug: string, vehicleId: string) =>
  authRequest<ApiMountedTire[]>(`/v1/company/${slug}/vehicles/${vehicleId}/mounted-tires`);

const submitDailyInspection = (slug: string, body: DailyInspectionInput) =>
  authRequest<ApiInspection>(`/v1/company/${slug}/inspections/daily`, {
    method: 'POST',
    body,
  });

const submitDetailedInspection = (slug: string, body: DetailedInspectionInput) =>
  authRequest<ApiInspection>(`/v1/company/${slug}/inspections/detailed`, {
    method: 'POST',
    body,
  });

type DailyInspectionFieldsProps = {
  tires: ApiMountedTire[];
};

function DailyInspectionFields({ tires }: DailyInspectionFieldsProps) {
  const { fields } = useFieldArray<DailyInspectionInput, 'results'>({ name: 'results' });

  return (
    <Flex direction="column" gap="4">
      {fields.map((field, index) => {
        const tire = tires.find((item) => item.tireId === field.tireId);

        return (
          <Card key={field.id} variant="surface">
            <Flex direction="column" gap="3" p="2">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  {tireLabel(tire)}
                </Text>
                {tire && (
                  <Text size="1" color="gray">
                    Tire ID {tire.tireId}
                  </Text>
                )}
              </Flex>

              <FormField name={`results.${index}.visualCondition`} label="Condition" required>
                {(fieldProps) => (
                  <RadioGroup.Root
                    value={fieldProps.value as string | null | undefined}
                    onValueChange={fieldProps.onChange}
                    onBlur={fieldProps.onBlur}
                  >
                    <Flex gap="4" wrap="wrap">
                      <RadioGroup.Item value="GOOD">Good</RadioGroup.Item>
                      <RadioGroup.Item value="MINOR_WEAR">Minor wear</RadioGroup.Item>
                      <RadioGroup.Item value="CONCERN">Concern</RadioGroup.Item>
                    </Flex>
                  </RadioGroup.Root>
                )}
              </FormField>

              <FormField name={`results.${index}.anomalyNotes`} label="Notes">
                {(fieldProps) => (
                  <TextArea
                    {...fieldProps}
                    value={(fieldProps.value as string | undefined) ?? ''}
                    size="2"
                    placeholder="Describe any anomalies..."
                    maxLength={500}
                  />
                )}
              </FormField>
            </Flex>
          </Card>
        );
      })}

      <FormField name="overallNotes" label="Overall notes">
        {(fieldProps) => (
          <TextArea
            {...fieldProps}
            value={(fieldProps.value as string | undefined) ?? ''}
            size="2"
            placeholder="Optional notes for this check"
            maxLength={2000}
          />
        )}
      </FormField>
    </Flex>
  );
}

type DetailedInspectionFieldsProps = {
  tires: ApiMountedTire[];
};

function DetailedInspectionFields({ tires }: DetailedInspectionFieldsProps) {
  const { fields } = useFieldArray<DetailedInspectionInput, 'results'>({ name: 'results' });

  return (
    <Flex direction="column" gap="4">
      {fields.map((field, index) => {
        const tire = tires.find((item) => item.tireId === field.tireId);

        return (
          <Card key={field.id} variant="surface">
            <Flex direction="column" gap="3" p="2">
              <Flex direction="column" gap="1">
                <Text size="2" weight="medium">
                  {tireLabel(tire)}
                </Text>
                {tire && (
                  <Text size="1" color="gray">
                    Tire ID {tire.tireId}
                  </Text>
                )}
              </Flex>

              <Grid columns={{ initial: '1', sm: '2' }} gap="3">
                <FormField name={`results.${index}.treadDepth`} label="Tread depth (mm)" required>
                  {(fieldProps) => (
                    <TextField.Root
                      id={fieldProps.id}
                      name={fieldProps.name}
                      onBlur={fieldProps.onBlur}
                      ref={fieldProps.ref}
                      aria-invalid={fieldProps['aria-invalid']}
                      aria-describedby={fieldProps['aria-describedby']}
                      type="number"
                      min="0"
                      max="50"
                      step="0.1"
                      placeholder="e.g. 6.5"
                      value={fieldProps.value ?? ''}
                      onChange={(event) =>
                        fieldProps.onChange(
                          event.target.value ? parseFloat(event.target.value) : undefined,
                        )
                      }
                    />
                  )}
                </FormField>
                <FormField name={`results.${index}.tirePressure`} label="Pressure (bar)">
                  {(fieldProps) => (
                    <TextField.Root
                      id={fieldProps.id}
                      name={fieldProps.name}
                      onBlur={fieldProps.onBlur}
                      ref={fieldProps.ref}
                      aria-invalid={fieldProps['aria-invalid']}
                      aria-describedby={fieldProps['aria-describedby']}
                      type="number"
                      min="0"
                      max="20"
                      step="0.1"
                      placeholder="e.g. 8.5"
                      value={fieldProps.value ?? ''}
                      onChange={(event) =>
                        fieldProps.onChange(
                          event.target.value ? parseFloat(event.target.value) : undefined,
                        )
                      }
                    />
                  )}
                </FormField>
              </Grid>

              <FormField name={`results.${index}.condition`} label="Condition" required>
                {(fieldProps) => (
                  <RadioGroup.Root
                    value={fieldProps.value as string | null | undefined}
                    onValueChange={fieldProps.onChange}
                    onBlur={fieldProps.onBlur}
                  >
                    <Flex gap="4" wrap="wrap">
                      <RadioGroup.Item value="GOOD">Good</RadioGroup.Item>
                      <RadioGroup.Item value="NEEDS_MONITORING">Needs monitoring</RadioGroup.Item>
                      <RadioGroup.Item value="NEEDS_REPLACEMENT">
                        Needs replacement
                      </RadioGroup.Item>
                    </Flex>
                  </RadioGroup.Root>
                )}
              </FormField>

              <FormField name={`results.${index}.damageNotes`} label="Damage notes">
                {(fieldProps) => (
                  <TextArea
                    {...fieldProps}
                    value={(fieldProps.value as string | undefined) ?? ''}
                    size="2"
                    placeholder="Describe any damage..."
                    maxLength={500}
                  />
                )}
              </FormField>
            </Flex>
          </Card>
        );
      })}

      <FormField name="overallNotes" label="Overall notes">
        {(fieldProps) => (
          <TextArea
            {...fieldProps}
            value={(fieldProps.value as string | undefined) ?? ''}
            size="2"
            placeholder="Optional notes for this inspection"
            maxLength={2000}
          />
        )}
      </FormField>
    </Flex>
  );
}

function NewInspectionPageInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const role = session?.user.role;
  const isDriver = role === 'driver';
  const requestedVehicleId = searchParams.get('vehicleId');
  const requestedType = searchParams.get('type');

  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [mountedTires, setMountedTires] = useState<ApiMountedTire[]>([]);
  const [tiresLoading, setTiresLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [defaultDate] = useState(() => new Date());

  const loadVehicles = useCallback(async () => {
    const res = await listVehicles(slug);

    if ('code' in res) {
      setLoadError(res.message);
      return;
    }

    setLoadError(null);
    setVehicles(res.data);
    if (isDriver && session?.user.id) {
      const assignedVehicle = res.data.find((vehicle) => vehicle.assignedDriver?.id === session.user.id);
      if (assignedVehicle) setVehicleId(assignedVehicle.id);
      return;
    }

    if (requestedVehicleId) {
      const requestedVehicle = res.data.find((vehicle) => vehicle.id === requestedVehicleId);
      if (requestedVehicle) setVehicleId(requestedVehicle.id);
    }
  }, [slug, isDriver, requestedVehicleId, session?.user.id]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const loadMountedTires = useCallback(
    async (selectedVehicleId: string) => {
      if (!selectedVehicleId) return;
      setTiresLoading(true);
      const res = await fetchMountedTires(slug, selectedVehicleId);
      setTiresLoading(false);

      if ('code' in res) {
        setLoadError(res.message);
        return;
      }

      setLoadError(null);
      setMountedTires(res.data);
    },
    [slug],
  );

  useEffect(() => {
    if (vehicleId) {
      loadMountedTires(vehicleId);
    } else {
      setMountedTires([]);
    }
  }, [vehicleId, loadMountedTires]);

  const canSubmitDetailed = role === 'admin' || role === 'fleet_manager' || role === 'maintenance';
  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === vehicleId);

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title="New inspection"
        description="Record a daily visual check or a detailed tire inspection."
        breadcrumb={
          <Button variant="ghost" color="gray" asChild>
            <Link href={`/company/${slug}/inspections`}>
              <ArrowLeft size={16} />
              Back to inspections
            </Link>
          </Button>
        }
      />

      <Card style={{ maxWidth: 760 }}>
        <Flex direction="column" gap="4" p={{ initial: '3', sm: '4' }}>
          <FormSection title="Vehicle" icon={ClipboardCheck}>
            {isDriver ? (
              <Text size="2" color="gray">
                {selectedVehicle
                  ? `${selectedVehicle.licensePlate} - ${selectedVehicle.make} ${selectedVehicle.model}`
                  : vehicleId
                    ? 'Loading...'
                    : 'No vehicle assigned to you'}
              </Text>
            ) : (
              <Select.Root value={vehicleId} onValueChange={setVehicleId}>
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
          </FormSection>

          {loadError && <ErrorState message={loadError} />}

          {vehicleId && (
            <>
              <Separator size="4" />

              {tiresLoading ? (
                <Text size="2" color="gray">
                  Loading mounted tires...
                </Text>
              ) : mountedTires.length === 0 ? (
                <EmptyState
                  icon={ClipboardCheck}
                  title="No mounted tires"
                  description="This vehicle needs mounted tires before an inspection can be recorded."
                />
              ) : (
                <Tabs.Root
                  defaultValue={
                    requestedType === 'DAILY_CHECK'
                      ? 'daily'
                      : requestedType === 'DETAILED' && canSubmitDetailed
                        ? 'detailed'
                        : canSubmitDetailed
                          ? 'detailed'
                          : 'daily'
                  }
                >
                  <Tabs.List>
                    <Tabs.Trigger value="daily">Daily check</Tabs.Trigger>
                    {canSubmitDetailed && (
                      <Tabs.Trigger value="detailed">Detailed inspection</Tabs.Trigger>
                    )}
                  </Tabs.List>

                  <Box pt="4">
                    <Tabs.Content value="daily">
                      <Form
                        key={`daily-${vehicleId}-${mountedTires.map((tire) => tire.tireId).join('-')}`}
                        schema={dailyInspectionSchema}
                        defaultValues={dailyDefaults(vehicleId, mountedTires, defaultDate)}
                        onSubmit={async (values, { setError }) => {
                          const freshRes = await fetchMountedTires(slug, vehicleId);
                          if ('code' in freshRes) {
                            setError('root.serverError', {
                              message: 'Failed to verify mounted tires. Please try again.',
                            });
                            return;
                          }

                          const res = await submitDailyInspection(slug, {
                            ...values,
                            date: new Date(),
                            results: values.results.map((result) => ({
                              ...result,
                              anomalyNotes: optionalText(result.anomalyNotes),
                            })),
                            overallNotes: optionalText(values.overallNotes),
                          });

                          if ('code' in res) {
                            setError('root.serverError', { message: res.message });
                            return;
                          }

                          router.push(`/company/${slug}/inspections/${res.data.id}`);
                        }}
                      >
                        <Flex direction="column" gap="4">
                          <DailyInspectionFields tires={mountedTires} />
                          <FormErrorState />
                          <Box>
                            <SubmitButton>Submit daily check</SubmitButton>
                          </Box>
                        </Flex>
                      </Form>
                    </Tabs.Content>

                    {canSubmitDetailed && (
                      <Tabs.Content value="detailed">
                        <Form
                          key={`detailed-${vehicleId}-${mountedTires.map((tire) => tire.tireId).join('-')}`}
                          schema={detailedInspectionSchema}
                          defaultValues={detailedDefaults(vehicleId, mountedTires, defaultDate)}
                          onSubmit={async (values, { setError }) => {
                            const freshRes = await fetchMountedTires(slug, vehicleId);
                            if ('code' in freshRes) {
                              setError('root.serverError', {
                                message: 'Failed to verify mounted tires. Please try again.',
                              });
                              return;
                            }

                            const res = await submitDetailedInspection(slug, {
                              ...values,
                              date: new Date(),
                              results: values.results.map((result) => ({
                                ...result,
                                tirePressure: result.tirePressure || undefined,
                                damageNotes: optionalText(result.damageNotes),
                              })),
                              overallNotes: optionalText(values.overallNotes),
                            });

                            if ('code' in res) {
                              setError('root.serverError', { message: res.message });
                              return;
                            }

                            router.push(`/company/${slug}/inspections/${res.data.id}`);
                          }}
                        >
                          <Flex direction="column" gap="4">
                            <DetailedInspectionFields tires={mountedTires} />
                            <FormErrorState />
                            <Box>
                              <SubmitButton>Submit detailed inspection</SubmitButton>
                            </Box>
                          </Flex>
                        </Form>
                      </Tabs.Content>
                    )}
                  </Box>
                </Tabs.Root>
              )}
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

export default function NewInspectionPage() {
  return (
    <Suspense>
      <NewInspectionPageInner />
    </Suspense>
  );
}
