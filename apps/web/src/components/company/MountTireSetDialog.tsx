'use client';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useToast } from '@/components/ui/toast';
import { authRequest } from '@/lib/http';
import type { ApiTireSet, ApiVehicleListItem } from '@tirely/types';
import {
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  Select,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { useCallback, useEffect, useState } from 'react';

const POSITIONS = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'SPARE'] as const;
type Position = (typeof POSITIONS)[number];

type FitmentMismatch = {
  tireId: string;
  position: string;
  expectedSizes: { width: number; aspectRatio: number; rimDiameter: number }[];
  actualSize: { width: number; aspectRatio: number; rimDiameter: number };
};

function todayIso() {
  return new Date().toISOString().slice(0, 16);
}

function sizeLabel(s: { width: number; aspectRatio: number; rimDiameter: number }) {
  return `${s.width}/${s.aspectRatio}R${s.rimDiameter}`;
}

const listVehicles = (slug: string, signal?: AbortSignal) =>
  authRequest<ApiVehicleListItem[]>(
    `/v1/company/${slug}/vehicles?${new URLSearchParams({
      page: '1',
      perPage: '100',
      archived: 'false',
      sortBy: 'licensePlate',
      sortOrder: 'asc',
    })}`,
    { signal },
  );

const mountTireSet = (
  slug: string,
  vehicleId: string,
  body: {
    vehicleId: string;
    date: Date;
    odometer: number;
    tireSetId: string;
    positionMap: Record<string, Position>;
    assignments: [];
    confirmFitmentOverride?: boolean;
    fitmentNote?: string;
  },
) =>
  authRequest<{ ok: true }>(`/v1/company/${slug}/vehicles/${vehicleId}/mount`, {
    method: 'POST',
    body,
  });

export type MountTireSetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  tireSet: ApiTireSet | null;
  onMounted?: () => void | Promise<void>;
};

export function MountTireSetDialog({
  open,
  onOpenChange,
  slug,
  tireSet,
  onMounted,
}: MountTireSetDialogProps) {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [vehicleId, setVehicleId] = useState('');
  const [positionMap, setPositionMap] = useState<Record<string, Position>>({});
  const [date, setDate] = useState(todayIso);
  const [odometer, setOdometer] = useState('');
  const [fitmentNote, setFitmentNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mismatches, setMismatches] = useState<FitmentMismatch[]>([]);

  const resetForm = useCallback(() => {
    setVehicleId('');
    setPositionMap({});
    setDate(todayIso());
    setOdometer('');
    setFitmentNote('');
    setError(null);
    setMismatches([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    resetForm();
    const controller = new AbortController();
    setLoading(true);
    listVehicles(slug, controller.signal).then((res) => {
      if (controller.signal.aborted) return;
      setLoading(false);
      if ('code' in res) {
        setError(res.message);
        return;
      }
      setVehicles(res.data);
      setVehicleId(res.data[0]?.id ?? '');
    });
    return () => controller.abort();
  }, [open, resetForm, slug]);

  const canSubmit =
    Boolean(tireSet) &&
    Boolean(vehicleId) &&
    odometer.trim() !== '' &&
    !Number.isNaN(parseInt(odometer, 10)) &&
    tireSet!.tires.length > 0 &&
    tireSet!.tires.every((tire) => Boolean(positionMap[tire.id]));

  const handleMount = async (confirmOverride = false) => {
    if (!tireSet || !vehicleId) return;

    setSaving(true);
    setError(null);
    if (!confirmOverride) setMismatches([]);

    const res = await mountTireSet(slug, vehicleId, {
      vehicleId,
      date: new Date(date),
      odometer: parseInt(odometer, 10),
      tireSetId: tireSet.id,
      positionMap,
      assignments: [],
      confirmFitmentOverride: confirmOverride || undefined,
      fitmentNote: fitmentNote.trim() || undefined,
    });

    setSaving(false);

    if ('code' in res) {
      if (res.code === 'FITMENT_OVERRIDE_REQUIRED') {
        const details = res.details as { mismatches: FitmentMismatch[] } | undefined;
        setMismatches(details?.mismatches ?? []);
        return;
      }
      setError(res.message);
      return;
    }

    toast({ title: 'Tire set mounted', variant: 'success' });
    await onMounted?.();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="560px">
        <Dialog.Title>Mount tire set</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Choose a vehicle and assign each tire in {tireSet?.name ?? 'this set'} to a position.
        </Dialog.Description>

        {loading ? (
          <Text size="2" color="gray">
            Loading vehicles...
          </Text>
        ) : error ? (
          <ErrorState message={error} />
        ) : (
          <Flex direction="column" gap="3">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Vehicle
              </Text>
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
            </Flex>

            <Flex direction="column" gap="2">
              <Text size="2" weight="medium">
                Positions
              </Text>
              {tireSet?.tires.map((tire) => (
                <Flex key={tire.id} align="center" gap="3">
                  <Text size="2" style={{ flex: 1 }}>
                    {tire.brand} {tire.model} - {sizeLabel(tire)}
                  </Text>
                  <Select.Root
                    value={positionMap[tire.id] ?? ''}
                    onValueChange={(value) =>
                      setPositionMap((current) => ({ ...current, [tire.id]: value as Position }))
                    }
                  >
                    <Select.Trigger placeholder="Position" style={{ minWidth: 140 }} />
                    <Select.Content>
                      {POSITIONS.map((position) => (
                        <Select.Item key={position} value={position}>
                          {position.replace('_', ' ')}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
              ))}
            </Flex>

            <Flex gap="3">
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">
                  Date
                </Text>
                <TextField.Root
                  type="datetime-local"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Flex>
              <Flex direction="column" gap="1" style={{ flex: 1 }}>
                <Text size="2" weight="medium">
                  Odometer (km)
                </Text>
                <TextField.Root
                  type="number"
                  min={0}
                  placeholder="e.g. 125000"
                  value={odometer}
                  onChange={(event) => setOdometer(event.target.value)}
                />
              </Flex>
            </Flex>

            <Flex direction="column" gap="1">
              <Text size="2" weight="medium" color="gray">
                Override note (optional)
              </Text>
              <TextArea
                rows={2}
                value={fitmentNote}
                onChange={(event) => setFitmentNote(event.target.value)}
                placeholder="Reason for any size override..."
              />
            </Flex>

            {mismatches.length > 0 ? (
              <Callout.Root color="orange" size="1">
                <Box>
                  <Text size="2" weight="bold">
                    Fitment mismatch
                  </Text>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                    {mismatches.map((mismatch) => (
                      <li key={mismatch.tireId}>
                        <Text size="2">
                          {mismatch.position.replace('_', ' ')} is {sizeLabel(mismatch.actualSize)};
                          expected {mismatch.expectedSizes.map(sizeLabel).join(' or ')}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </Box>
              </Callout.Root>
            ) : null}

            <Flex justify="end" gap="3">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              {mismatches.length > 0 ? (
                <Button color="orange" onClick={() => handleMount(true)} loading={saving}>
                  Proceed anyway
                </Button>
              ) : (
                <Button onClick={() => handleMount(false)} loading={saving} disabled={!canSubmit}>
                  Mount
                </Button>
              )}
            </Flex>
          </Flex>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
