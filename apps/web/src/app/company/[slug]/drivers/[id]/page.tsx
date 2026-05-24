'use client';

import { InfoField } from '@/components/InfoField';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { TirePositionDiagram, type TireSlot } from '@/components/tire/TirePositionDiagram';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/auth-client';
import { DRIVER_ASSIGNMENT_CHANGED_EVENT, emitDriverAssignmentChanged } from '@/lib/company-events';
import { ROLE_LABELS } from '@/lib/display';
import { formatDate, formatDateTime, formatInteger } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type {
  ApiCompanyMember,
  ApiCompanySettings,
  ApiInspectionListItem,
  ApiMileageEntry,
  ApiTireSummary,
  ApiVehicle,
  ApiVehicleListItem,
} from '@tirely/types';
import {
  vehicleDriverAssignSchema,
  type VehicleDriverAssignInput,
} from '@tirely/validators';
import {
  Box,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Grid,
  Heading,
  Select,
  Separator,
  Text,
} from '@radix-ui/themes';
import { ArrowLeft, Car, ClipboardList, Gauge, Link as LinkIcon, Wrench } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type Position = 'FRONT_LEFT' | 'FRONT_RIGHT' | 'REAR_LEFT' | 'REAR_RIGHT' | 'SPARE';
type MountedTire = ApiTireSummary & { currentPosition: Position };

const POSITIONS: Position[] = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'SPARE'];

const assignVehicleDriver = (slug: string, vehicleId: string, driverId: string | null) =>
  authRequest<{ id: string; assignedDriverId: string | null }>(
    `/v1/company/${slug}/vehicles/${vehicleId}/driver`,
    { method: 'PATCH', body: { driverId } },
  );

const listCompanyUsers = (slug: string, signal?: AbortSignal) =>
  authRequest<ApiCompanyMember[]>(
    `/v1/company/${slug}/users?${new URLSearchParams({
      page: '1',
      perPage: '100',
      role: 'driver',
    })}`,
    { signal },
  );

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

const fetchVehicle = (slug: string, vehicleId: string, signal?: AbortSignal) =>
  authRequest<ApiVehicle>(`/v1/company/${slug}/vehicles/${vehicleId}`, { signal });

const fetchVehicleTires = (slug: string, vehicleId: string, signal?: AbortSignal) =>
  authRequest<ApiTireSummary[]>(
    `/v1/company/${slug}/tires?${new URLSearchParams({
      page: '1',
      perPage: '10',
      sortBy: 'createdAt',
      sortOrder: 'asc',
      vehicleId,
    })}`,
    { signal },
  );

const listVehicleMileage = (
  slug: string,
  vehicleId: string,
  page: number,
  perPage: number,
  signal?: AbortSignal,
) =>
  authRequest<ApiMileageEntry[]>(
    `/v1/company/${slug}/vehicles/${vehicleId}/mileage?${new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
    })}`,
    { signal },
  );

const listInspections = (
  slug: string,
  page: number,
  perPage: number,
  vehicleId: string,
  signal?: AbortSignal,
) =>
  authRequest<ApiInspectionListItem[]>(
    `/v1/company/${slug}/inspections?${new URLSearchParams({
      page: String(page),
      perPage: String(perPage),
      vehicleId,
    })}`,
    { signal },
  );

const fetchCompanySettings = (slug: string, signal?: AbortSignal) =>
  authRequest<ApiCompanySettings>(`/v1/company/${slug}/settings`, { signal });

function positionLabel(position: string) {
  return position.replaceAll('_', ' ');
}

function usageStatusFromPercentage(percentage: number) {
  if (percentage <= 25) return 'NEW';
  if (percentage <= 50) return 'GOOD';
  if (percentage <= 70) return 'MODERATE';
  if (percentage <= 85) return 'HIGH';
  if (percentage <= 94) return 'CRITICAL';
  return 'REPLACE_IMMEDIATELY';
}

function asMountedTires(tires: ApiTireSummary[]): MountedTire[] {
  return tires
    .map((tire) => {
      const currentPosition = (tire as ApiTireSummary & { currentPosition?: Position })
        .currentPosition;
      return currentPosition ? ({ ...tire, currentPosition } satisfies MountedTire) : null;
    })
    .filter((tire): tire is MountedTire => tire !== null);
}

type DriverAssignmentFormProps = {
  slug: string;
  driver: ApiCompanyMember;
  currentVehicleId: string | null;
  vehicleOptions: ApiVehicleListItem[];
  onClose: () => void;
  onAssigned: () => Promise<void>;
};

function DriverAssignmentForm({
  slug,
  driver,
  currentVehicleId,
  vehicleOptions,
  onClose,
  onAssigned,
}: DriverAssignmentFormProps) {
  const { toast } = useToast();

  return (
    <Form
      schema={vehicleDriverAssignSchema}
      defaultValues={{ driverId: currentVehicleId ?? '' }}
      onSubmit={async (values: VehicleDriverAssignInput, { setError }) => {
        const selectedVehicleId = values.driverId;
        if (!selectedVehicleId) return;
        if (selectedVehicleId === currentVehicleId) {
          onClose();
          return;
        }

        if (currentVehicleId && currentVehicleId !== selectedVehicleId) {
          const unassignResponse = await assignVehicleDriver(slug, currentVehicleId, null);
          if ('code' in unassignResponse) {
            setError('root.serverError', { message: unassignResponse.message });
            return;
          }
        }

        const assignResponse = await assignVehicleDriver(slug, selectedVehicleId, driver.id);
        if ('code' in assignResponse) {
          setError('root.serverError', {
            message:
              currentVehicleId && currentVehicleId !== selectedVehicleId
                ? `${assignResponse.message} The driver is currently unassigned.`
                : assignResponse.message,
          });
          emitDriverAssignmentChanged();
          await onAssigned();
          return;
        }

        emitDriverAssignmentChanged();
        await onAssigned();
        onClose();
        toast({
          title: currentVehicleId ? 'Vehicle assignment updated' : 'Vehicle assigned',
          variant: 'success',
        });
      }}
    >
      <Flex direction="column" gap="3" mt="4">
        <FormField name="driverId" label="Vehicle" required>
          {(field) => (
            <Select.Root value={(field.value as string | undefined) ?? ''} onValueChange={field.onChange}>
              <Select.Trigger
                id={field.id}
                placeholder={vehicleOptions.length === 0 ? 'No available vehicles' : 'Select a vehicle'}
              />
              <Select.Content>
                {vehicleOptions.map((candidate) => (
                  <Select.Item key={candidate.id} value={candidate.id}>
                    {candidate.licensePlate} - {candidate.make} {candidate.model}
                    {candidate.archived ? ' (Archived)' : ''}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </FormField>

        <FormErrorState />

        {vehicleOptions.length === 0 ? (
          <ErrorState message="No unassigned active vehicles are available." />
        ) : null}

        <Flex justify="end" gap="3" mt="1">
          <Dialog.Close>
            <Button type="button" variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <SubmitButton disabled={vehicleOptions.length === 0}>Save</SubmitButton>
        </Flex>
      </Flex>
    </Form>
  );
}

export default function DriverDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [driver, setDriver] = useState<ApiCompanyMember | null>(null);
  const [vehicle, setVehicle] = useState<ApiVehicle | null>(null);
  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [mountedTires, setMountedTires] = useState<MountedTire[]>([]);
  const [mileageEntries, setMileageEntries] = useState<ApiMileageEntry[]>([]);
  const [inspections, setInspections] = useState<ApiInspectionListItem[]>([]);
  const [settings, setSettings] = useState<ApiCompanySettings | null>(null);

  const [assignOpen, setAssignOpen] = useState(false);

  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  const loadDriverData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const [usersResponse, vehiclesResponse] = await Promise.all([
        listCompanyUsers(slug, signal),
        listVehicles(slug, signal),
      ]);

      if (signal?.aborted) return;

      if ('code' in usersResponse) {
        setError(usersResponse.message);
        setLoading(false);
        return;
      }

      if ('code' in vehiclesResponse) {
        setError(vehiclesResponse.message);
        setLoading(false);
        return;
      }

      const nextDriver = usersResponse.data.find((candidate) => candidate.id === id) ?? null;
      setVehicles(vehiclesResponse.data);

      if (!nextDriver) {
        setDriver(null);
        setVehicle(null);
        setMountedTires([]);
        setMileageEntries([]);
        setInspections([]);
        setSettings(null);
        setNotFound(true);
        setLoading(false);
        return;
      }

      setDriver(nextDriver);

      const assignedVehicleSummary =
        vehiclesResponse.data.find((candidate) => candidate.assignedDriver?.id === nextDriver.id) ??
        null;

      if (!assignedVehicleSummary) {
        setVehicle(null);
        setMountedTires([]);
        setMileageEntries([]);
        setInspections([]);
        setSettings(null);
        setLoading(false);
        return;
      }

      const [
        vehicleResponse,
        tiresResponse,
        mileageResponse,
        inspectionsResponse,
        settingsResponse,
      ] = await Promise.all([
        fetchVehicle(slug, assignedVehicleSummary.id, signal),
        fetchVehicleTires(slug, assignedVehicleSummary.id, signal),
        listVehicleMileage(slug, assignedVehicleSummary.id, 1, 5, signal),
        listInspections(slug, 1, 5, assignedVehicleSummary.id, signal),
        fetchCompanySettings(slug, signal),
      ]);

      if (signal?.aborted) return;

      if ('code' in vehicleResponse) {
        setError(vehicleResponse.message);
        setLoading(false);
        return;
      }

      setVehicle(vehicleResponse.data);
      setMountedTires('code' in tiresResponse ? [] : asMountedTires(tiresResponse.data));
      setMileageEntries('code' in mileageResponse ? [] : mileageResponse.data);
      setInspections('code' in inspectionsResponse ? [] : inspectionsResponse.data);
      setSettings('code' in settingsResponse ? null : settingsResponse.data);
      setLoading(false);
    },
    [id, slug],
  );

  useEffect(() => {
    if (isPending || !session) return;
    if (session.user.role !== 'admin' && session.user.role !== 'fleet_manager') {
      router.replace(`/company/${slug}`);
    }
  }, [isPending, router, session, slug]);

  useEffect(() => {
    if (isPending || !session || !canManage) return;
    const controller = new AbortController();
    void loadDriverData(controller.signal);
    return () => controller.abort();
  }, [canManage, isPending, loadDriverData, session]);

  useEffect(() => {
    const handleAssignmentChanged = () => {
      void loadDriverData();
    };
    window.addEventListener(DRIVER_ASSIGNMENT_CHANGED_EVENT, handleAssignmentChanged);
    return () =>
      window.removeEventListener(DRIVER_ASSIGNMENT_CHANGED_EVENT, handleAssignmentChanged);
  }, [loadDriverData]);

  const diagramSlots = useMemo<TireSlot[]>(
    () =>
      POSITIONS.map((position) => {
        const tire =
          mountedTires.find((candidate) => candidate.currentPosition === position) ?? null;
        return {
          position,
          tire: tire
            ? {
                id: tire.id,
                brand: tire.brand,
                model: tire.model,
                usagePercentage: tire.usagePercentage,
                usageStatus: tire.usageStatus,
              }
            : null,
        };
      }),
    [mountedTires],
  );

  const compositePercentage = useMemo(() => {
    if (mountedTires.length === 0) return null;
    const total = mountedTires.reduce((sum, tire) => sum + (tire.usagePercentage ?? 0), 0);
    return total / mountedTires.length;
  }, [mountedTires]);

  const compositeStatus =
    compositePercentage === null ? null : usageStatusFromPercentage(compositePercentage);
  const compositeEstimated = mountedTires.some((tire) => tire.usageIsEstimated);

  const imbalanceGap = useMemo(() => {
    const values = mountedTires
      .map((tire) => tire.usagePercentage)
      .filter((value): value is number => value !== null);
    if (values.length < 2) return null;
    return Math.max(...values) - Math.min(...values);
  }, [mountedTires]);

  const showImbalanceWarning =
    imbalanceGap !== null && settings !== null && imbalanceGap > settings.imbalanceThreshold;

  const vehicleOptions = useMemo(
    () =>
      vehicles.filter(
        (candidate) =>
          candidate.id === vehicle?.id ||
          (!candidate.archived &&
            (!candidate.assignedDriver || candidate.assignedDriver.id === driver?.id)),
      ),
    [driver?.id, vehicle?.id, vehicles],
  );

  const openAssignDialog = () => {
    setAssignOpen(true);
  };

  if (isPending || !session) return null;
  if (!canManage) return null;

  if (loading) {
    return (
      <Flex direction="column" gap="4">
        <Text color="gray">Loading driver details...</Text>
      </Flex>
    );
  }

  if (notFound) {
    return (
      <Flex direction="column" gap="4">
        <Button variant="ghost" color="gray" asChild style={{ alignSelf: 'flex-start' }}>
          <Link href={`/company/${slug}/drivers`}>
            <ArrowLeft size={16} />
            Back to drivers
          </Link>
        </Button>
        <ErrorState message="Driver not found." />
      </Flex>
    );
  }

  if (!driver) return null;

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title={driver.name}
        description="Driver overview and vehicle activity"
        breadcrumb={
          <Button variant="ghost" color="gray" asChild>
            <Link href={`/company/${slug}/drivers`}>
              <ArrowLeft size={16} />
              Back to drivers
            </Link>
          </Button>
        }
        actions={
          <Flex gap="2" wrap="wrap">
            <StatusBadge kind="role" role={driver.role} />
            <StatusBadge
              kind="active"
              active={!driver.banned}
              activeLabel="Active"
              inactiveLabel="Deactivated"
            />
            {driver.firstLogin ? (
              <StatusBadge
                kind="active"
                active={false}
                inactiveLabel="First login pending"
                activeLabel="Ready"
              />
            ) : null}
          </Flex>
        }
      />

      {error ? (
        <ErrorState message={error} />
      ) : null}

      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Flex direction="column" gap="4" p="3">
            <Heading size="4">Identity</Heading>
            <Grid columns={{ initial: '1', sm: '2' }} gap="4">
              <InfoField label="Name" value={driver.name} />
              <InfoField label="Email" value={driver.email} />
              <InfoField label="Role" value={ROLE_LABELS[driver.role] ?? driver.role} />
              <InfoField label="Status" value={driver.banned ? 'Deactivated' : 'Active'} />
            </Grid>
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="4" p="3">
            <Flex justify="between" align="center" gap="3" wrap="wrap">
              <Heading size="4">Assignment</Heading>
              <Button variant="soft" onClick={openAssignDialog}>
                <Car size={16} />
                {vehicle ? 'Change vehicle' : 'Assign vehicle'}
              </Button>
            </Flex>

            {vehicle ? (
              <Flex direction="column" gap="3">
                <Flex justify="between" align="center" gap="3" wrap="wrap">
                  <Box>
                    <Text size="2" weight="medium">
                      {vehicle.licensePlate}
                    </Text>
                    <Text size="2" color="gray">
                      {vehicle.make} {vehicle.model} ({vehicle.year})
                    </Text>
                  </Box>
                  <Flex gap="2" wrap="wrap" justify="end">
                    <Button variant="ghost" color="gray" asChild>
                      <Link href={`/company/${slug}/vehicles/${vehicle.id}`}>
                        <LinkIcon size={16} />
                        Open vehicle
                      </Link>
                    </Button>
                    <Button variant="soft" asChild>
                      <Link href={`/company/${slug}/mileage?vehicleId=${vehicle.id}`}>
                        <Gauge size={14} />
                        Log mileage
                      </Link>
                    </Button>
                    <Button variant="soft" asChild>
                      <Link href={`/company/${slug}/inspections/new?vehicleId=${vehicle.id}`}>
                        <ClipboardList size={14} />
                        New inspection
                      </Link>
                    </Button>
                    <Button variant="soft" asChild>
                      <Link href={`/company/${slug}/maintenance/new?vehicleId=${vehicle.id}`}>
                        <Wrench size={14} />
                        Log maintenance
                      </Link>
                    </Button>
                  </Flex>
                </Flex>

                {vehicle.archived ? (
                  <Callout.Root color="orange">
                    <Callout.Text>This driver&apos;s vehicle is archived.</Callout.Text>
                  </Callout.Root>
                ) : null}
              </Flex>
            ) : (
              <Callout.Root color="gray">
                <Callout.Text>No vehicle assigned.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>
      </Grid>

      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Flex direction="column" gap="4" p="3">
            <Flex align="center" gap="2">
              <Gauge size={18} />
              <Heading size="4">Tire health</Heading>
            </Flex>

            {vehicle ? (
              <>
                <Box>
                  <TirePositionDiagram slots={diagramSlots} mode="view" />
                </Box>

                <Separator size="4" />

                <Flex justify="between" align="center" gap="3" wrap="wrap">
                  <Text size="2" weight="medium">
                    Vehicle composite health
                  </Text>
                  <StatusBadge
                    kind="usage"
                    percentage={compositePercentage}
                    status={compositeStatus}
                    isEstimated={compositeEstimated}
                  />
                </Flex>

                {showImbalanceWarning ? (
                  <Callout.Root color="orange">
                    <Callout.Text>Tires are unbalanced - consider rotation.</Callout.Text>
                  </Callout.Root>
                ) : null}
              </>
            ) : (
              <Callout.Root color="gray">
                <Callout.Text>Assign a vehicle to see tire health.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="4" p="3">
            <Flex align="center" gap="2">
              <ClipboardList size={18} />
              <Heading size="4">Activity</Heading>
            </Flex>

            {vehicle ? (
              <Flex direction="column" gap="4">
                <Box>
                  <Text size="2" weight="medium">
                    Recent mileage
                  </Text>
                  <Flex direction="column" gap="2" mt="2">
                    {mileageEntries.length === 0 ? (
                      <Callout.Root color="gray">
                        <Callout.Text>No mileage entries yet.</Callout.Text>
                      </Callout.Root>
                    ) : (
                      mileageEntries.map((entry) => (
                        <Card key={entry.id} size="1">
                          <Flex justify="between" align="center" gap="3">
                            <Box>
                              <Text size="2" weight="medium">
                                {formatInteger(entry.odometer)} km
                              </Text>
                              <Text size="1" color="gray">
                                {formatDate(entry.date)} - {entry.recordedBy.name}
                              </Text>
                            </Box>
                            <Button variant="ghost" color="gray" asChild>
                              <Link href={`/company/${slug}/mileage?vehicleId=${vehicle.id}`}>
                                View
                              </Link>
                            </Button>
                          </Flex>
                        </Card>
                      ))
                    )}
                  </Flex>
                </Box>

                <Box>
                  <Text size="2" weight="medium">
                    Recent inspections
                  </Text>
                  <Flex direction="column" gap="2" mt="2">
                    {inspections.length === 0 ? (
                      <Callout.Root color="gray">
                        <Callout.Text>No inspections yet.</Callout.Text>
                      </Callout.Root>
                    ) : (
                      inspections.map((inspection) => (
                        <Card key={inspection.id} size="1">
                          <Flex justify="between" align="center" gap="3">
                            <Box>
                              <Text size="2" weight="medium">
                                {inspection.type === 'DETAILED'
                                  ? 'Detailed inspection'
                                  : 'Daily check'}
                              </Text>
                              <Text size="1" color="gray">
                                {formatDateTime(inspection.date)}
                              </Text>
                            </Box>
                            <Button variant="ghost" color="gray" asChild>
                              <Link href={`/company/${slug}/inspections/${inspection.id}`}>
                                Open
                              </Link>
                            </Button>
                          </Flex>
                        </Card>
                      ))
                    )}
                  </Flex>
                </Box>
              </Flex>
            ) : (
              <Callout.Root color="gray">
                <Callout.Text>Assign a vehicle to see recent activity.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>
      </Grid>

      {vehicle && mountedTires.length > 0 ? (
        <Card>
          <Flex direction="column" gap="3" p="3">
            <Heading size="4">Mounted tires</Heading>
            <Flex direction="column" gap="2">
              {mountedTires.map((tire) => (
                <Flex key={tire.id} justify="between" align="center" gap="3" wrap="wrap">
                  <Box>
                    <Text size="2" weight="medium">
                      {positionLabel(tire.currentPosition)}
                    </Text>
                    <Text size="1" color="gray">
                      {tire.brand} {tire.model}
                    </Text>
                  </Box>
                  <StatusBadge
                    kind="usage"
                    percentage={tire.usagePercentage}
                    status={tire.usageStatus}
                    isEstimated={tire.usageIsEstimated}
                  />
                </Flex>
              ))}
            </Flex>
          </Flex>
        </Card>
      ) : null}

      <Dialog.Root
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
        }}
      >
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>{vehicle ? 'Change vehicle' : 'Assign vehicle'}</Dialog.Title>
          <Dialog.Description>Select an available vehicle for {driver.name}.</Dialog.Description>
          <DriverAssignmentForm
            slug={slug}
            driver={driver}
            currentVehicleId={vehicle?.id ?? null}
            vehicleOptions={vehicleOptions}
            onClose={() => setAssignOpen(false)}
            onAssigned={() => loadDriverData()}
          />
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
