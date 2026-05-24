'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { Box, Card, Flex, Select, Text, TextField, Tooltip } from '@radix-ui/themes';
import { mileageEntryCreateSchema, type MileageEntryCreateInput } from '@tirely/validators';
import { Info } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/feedback/EmptyState';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/auth-client';
import { formatDate, formatInteger } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiMileageEntry, ApiVehicleListItem } from '@tirely/types';

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDelta(entries: ApiMileageEntry[], index: number) {
  const prev = entries[index + 1];
  const current = entries[index];
  if (!prev || !current) return null;
  const delta = current.odometer - prev.odometer;
  return delta > 0 ? `+${formatInteger(delta)} km` : null;
}

const listVehicles = (slug: string, signal?: AbortSignal) =>
  authRequest<ApiVehicleListItem[]>(
    `/v1/company/${slug}/vehicles?${new URLSearchParams({
      page: '1',
      perPage: '100',
      sortBy: 'licensePlate',
      sortOrder: 'asc',
    })}`,
    { signal },
  );

const listVehicleMileage = (slug: string, vehicleId: string, signal?: AbortSignal) =>
  authRequest<ApiMileageEntry[]>(
    `/v1/company/${slug}/vehicles/${vehicleId}/mileage?${new URLSearchParams({
      page: '1',
      perPage: '10',
    })}`,
    { signal },
  );

function MileagePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const { data: session } = useSession();
  const { toast } = useToast();

  const isDriver = session?.user.role === 'driver';
  const requestedVehicleId = searchParams.get('vehicleId');

  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [entries, setEntries] = useState<ApiMileageEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [todayLabel] = useState(() => dateInputValue(new Date()));
  const [defaultDate] = useState(() => new Date());

  const loadVehicles = useCallback(
    async (signal?: AbortSignal) => {
      const res = await listVehicles(slug, signal);
      if ('code' in res) return;
      setVehicles(res.data);
      const userId = session?.user?.id;
      const assigned = userId
        ? res.data.find((vehicle) => vehicle.assignedDriver?.id === userId)
        : undefined;

      if (isDriver) {
        setSelectedVehicleId(assigned?.id ?? '');
        return;
      }

      if (requestedVehicleId) {
        const requested = res.data.find((vehicle) => vehicle.id === requestedVehicleId);
        if (requested) {
          setSelectedVehicleId(requested.id);
          return;
        }
      }

      setSelectedVehicleId(assigned?.id ?? res.data[0]?.id ?? '');
    },
    [isDriver, requestedVehicleId, session?.user, slug],
  );

  const loadEntries = useCallback(
    async (vehicleId: string, signal?: AbortSignal) => {
      setEntriesLoading(true);
      const res = await listVehicleMileage(slug, vehicleId, signal);
      setEntriesLoading(false);
      if ('code' in res) return;
      setEntries(res.data);
    },
    [slug],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadVehicles(controller.signal);
    return () => controller.abort();
  }, [loadVehicles]);

  const entriesControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!selectedVehicleId) {
      setEntries([]);
      return;
    }
    entriesControllerRef.current?.abort();
    const controller = new AbortController();
    entriesControllerRef.current = controller;
    loadEntries(selectedVehicleId, controller.signal);
    return () => controller.abort();
  }, [selectedVehicleId, loadEntries]);

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === selectedVehicleId);

  const defaults: MileageEntryCreateInput = {
    odometer: 0,
    date: defaultDate,
  };

  return (
    <Box p={{ initial: '4', sm: '6' }} style={{ maxWidth: 640 }}>
      <PageHeader title="Log Mileage" description="Record odometer readings for fleet vehicles" />

      {!isDriver && (
        <Box mb="4">
          <Text as="label" size="2" weight="medium" mb="1" style={{ display: 'block' }}>
            Vehicle
          </Text>
          <Select.Root value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
            <Select.Trigger placeholder="Select a vehicle" style={{ width: '100%' }} />
            <Select.Content>
              {vehicles.map((vehicle) => (
                <Select.Item key={vehicle.id} value={vehicle.id}>
                  {vehicle.licensePlate} - {vehicle.make} {vehicle.model} ({vehicle.year})
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>
      )}

      {isDriver && selectedVehicle && (
        <Box mb="4">
          <Text size="2" color="gray">
            Vehicle:{' '}
            <Text weight="medium" color="gray">
              {selectedVehicle.licensePlate} - {selectedVehicle.make} {selectedVehicle.model}
            </Text>
          </Text>
        </Box>
      )}

      {isDriver && !selectedVehicle && vehicles.length > 0 && (
        <Box mb="4">
          <Text size="2" color="gray">
            No vehicle is assigned to you.
          </Text>
        </Box>
      )}

      <Card>
        <Form
          schema={mileageEntryCreateSchema}
          defaultValues={defaults}
          onSubmit={async (values, { setError, reset }) => {
            if (!selectedVehicleId) return;

            const res = await authRequest<ApiMileageEntry>(
              `/v1/company/${slug}/vehicles/${selectedVehicleId}/mileage`,
              {
                method: 'POST',
                body: values,
              },
            );
            if ('code' in res) {
              const detail =
                res.code === 'MILEAGE_REGRESSION' && res.details
                  ? ` Previous reading: ${formatInteger((res.details as { previousOdometer: number }).previousOdometer)} km.`
                  : '';
              setError('root.serverError', { message: res.message + detail });
              return;
            }

            toast({ title: 'Mileage logged', variant: 'success' });
            reset({ odometer: 0, date: new Date() });
            loadEntries(selectedVehicleId);
          }}
        >
          <Flex direction="column" gap="4">
            <FormField name="odometer" label="Odometer reading (km)" required>
              {(field) => (
                <Box>
                  <Flex align="center" gap="1" mb="1">
                    <Tooltip content="Enter the odometer value in kilometres (km).">
                      <Info size={14} style={{ cursor: 'help', color: 'var(--gray-9)' }} />
                    </Tooltip>
                  </Flex>
                  <TextField.Root
                    {...field}
                    type="number"
                    inputMode="numeric"
                    placeholder="e.g. 124350"
                    min={0}
                    max={10_000_000}
                    size="3"
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  >
                    <TextField.Slot side="right">
                      <Text size="2" color="gray">
                        km
                      </Text>
                    </TextField.Slot>
                  </TextField.Root>
                </Box>
              )}
            </FormField>

            <FormField name="date" label="Date" required>
              {(field) => (
                <input
                  id={field.id}
                  name={field.name}
                  type="date"
                  value={dateInputValue(field.value as unknown as Date)}
                  max={todayLabel}
                  onChange={(event) => field.onChange(new Date(event.target.value))}
                  onBlur={field.onBlur}
                  aria-invalid={field['aria-invalid']}
                  aria-describedby={field['aria-describedby']}
                  style={{
                    width: '100%',
                    padding: '0 12px',
                    height: '40px',
                    borderRadius: 'var(--radius-3)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--surface-panel)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--font-size-sm)',
                    boxSizing: 'border-box',
                  }}
                />
              )}
            </FormField>

            <FormErrorState />

            <SubmitButton disabled={!selectedVehicleId}>Submit</SubmitButton>
          </Flex>
        </Form>
      </Card>

      {selectedVehicleId && (
        <Box mt="6">
          <PageHeader title="Recent Entries" size="5" />
          {entriesLoading ? (
            <Text size="2" color="gray">
              Loading...
            </Text>
          ) : entries.length === 0 ? (
            <EmptyState title="No mileage entries yet" />
          ) : (
            <Flex direction="column" gap="2">
              {entries.map((entry, index) => (
                <Card key={entry.id} size="1">
                  <Flex justify="between" align="center">
                    <Flex direction="column" gap="1">
                      <Text size="2" weight="medium">
                        {formatInteger(entry.odometer)} km
                      </Text>
                      <Text size="1" color="gray">
                        {formatDate(entry.date)} - {entry.recordedBy.name}
                      </Text>
                    </Flex>
                    {formatDelta(entries, index) && (
                      <Text size="2" color="green">
                        {formatDelta(entries, index)}
                      </Text>
                    )}
                  </Flex>
                </Card>
              ))}
            </Flex>
          )}
        </Box>
      )}
    </Box>
  );
}

export default function MileagePage() {
  return (
    <Suspense>
      <MileagePageInner />
    </Suspense>
  );
}
