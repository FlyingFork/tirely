'use client';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/ui/toast';
import { emitDriverAssignmentChanged } from '@/lib/company-events';
import { authRequest } from '@/lib/http';
import type { ApiCompanyMember, ApiVehicleListItem } from '@tirely/types';
import { Button, Callout, Dialog, Flex, Select, Text } from '@radix-ui/themes';
import { useCallback, useEffect, useMemo, useState } from 'react';

const NONE_VALUE = '__none__';

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

const assignVehicleDriver = (slug: string, vehicleId: string, driverId: string | null) =>
  authRequest<{ id: string; assignedDriverId: string | null }>(
    `/v1/company/${slug}/vehicles/${vehicleId}/driver`,
    { method: 'PATCH', body: { driverId } },
  );

export type DriverVehicleAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  driver: ApiCompanyMember | null;
  onAssigned?: () => void | Promise<void>;
};

export function DriverVehicleAssignmentDialog({
  open,
  onOpenChange,
  slug,
  driver,
  onAssigned,
}: DriverVehicleAssignmentDialogProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(NONE_VALUE);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentVehicle =
    driver && vehicles.find((vehicle) => vehicle.assignedDriver?.id === driver.id);
  const currentVehicleId = currentVehicle?.id ?? null;

  const vehicleOptions = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.id === currentVehicleId ||
          (!vehicle.archived &&
            (!vehicle.assignedDriver || vehicle.assignedDriver.id === driver?.id)),
      ),
    [currentVehicleId, driver?.id, vehicles],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      const res = await listVehicles(slug, signal);
      if (signal?.aborted) return;
      setLoading(false);
      if ('code' in res) {
        setError(res.message);
        return;
      }
      setVehicles(res.data);
      const assigned = driver
        ? res.data.find((vehicle) => vehicle.assignedDriver?.id === driver.id)
        : undefined;
      setSelectedVehicleId(assigned?.id ?? NONE_VALUE);
    },
    [driver, slug],
  );

  useEffect(() => {
    if (!open || !driver) return;
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [driver, load, open]);

  const handleSave = async () => {
    if (!driver) return;
    const nextVehicleId = selectedVehicleId === NONE_VALUE ? null : selectedVehicleId;
    if (nextVehicleId === currentVehicleId) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    setError(null);

    if (currentVehicleId && currentVehicleId !== nextVehicleId) {
      const unassignRes = await assignVehicleDriver(slug, currentVehicleId, null);
      if ('code' in unassignRes) {
        setSaving(false);
        setError(unassignRes.message);
        return;
      }
    }

    if (nextVehicleId) {
      const assignRes = await assignVehicleDriver(slug, nextVehicleId, driver.id);
      if ('code' in assignRes) {
        setSaving(false);
        setError(assignRes.message);
        emitDriverAssignmentChanged();
        await onAssigned?.();
        return;
      }
    }

    setSaving(false);
    emitDriverAssignmentChanged();
    await onAssigned?.();
    onOpenChange(false);
    toast({
      title: nextVehicleId
        ? currentVehicleId
          ? 'Vehicle assignment updated'
          : 'Vehicle assigned'
        : 'Vehicle unassigned',
      variant: 'success',
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="440px">
        <Dialog.Title>{currentVehicleId ? 'Change vehicle assignment' : 'Assign vehicle'}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Select the vehicle assigned to {driver?.name ?? 'this driver'}.
        </Dialog.Description>

        <Flex direction="column" gap="3">
          {loading ? (
            <Text size="2" color="gray">
              Loading vehicles...
            </Text>
          ) : error ? (
            <ErrorState message={error} />
          ) : (
            <>
              <Select.Root value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <Select.Trigger
                  placeholder={vehicleOptions.length === 0 ? 'No vehicles available' : 'Vehicle'}
                />
                <Select.Content>
                  <Select.Item value={NONE_VALUE}>No vehicle</Select.Item>
                  {vehicleOptions.map((vehicle) => (
                    <Select.Item key={vehicle.id} value={vehicle.id}>
                      {vehicle.licensePlate} - {vehicle.make} {vehicle.model}
                      {vehicle.archived ? ' (Archived)' : ''}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>

              {vehicleOptions.length === 0 ? (
                <Callout.Root color="gray" size="1">
                  <Callout.Text>No unassigned active vehicles are available.</Callout.Text>
                </Callout.Root>
              ) : null}
            </>
          )}

          <Flex justify="end" gap="3">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSave}
              loading={saving}
              disabled={loading || Boolean(error) || vehicleOptions.length === 0}
            >
              Save
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
