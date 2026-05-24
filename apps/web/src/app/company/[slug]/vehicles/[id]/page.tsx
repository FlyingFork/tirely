'use client';

import { InfoField } from '@/components/InfoField';
import { ConfirmActionDialog } from '@/components/company/ConfirmActionDialog';
import { TireSizeSelector, EMPTY_COMPATIBLE_SIZE } from '@/components/TireSizeSelector';
import { TirePositionDiagram, type TireSlot } from '@/components/tire/TirePositionDiagram';
import { useToast } from '@/components/ui/toast';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { SectionCard } from '@/components/layout/SectionCard';
import { useSession } from '@/lib/auth-client';
import { emitDriverAssignmentChanged } from '@/lib/company-events';
import { formatDate, formatDateTime, formatInteger } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type {
  ApiCompanyMember,
  ApiDepot,
  ApiMileageEntry,
  ApiTireSummary,
  ApiTireSet,
  ApiVehicle,
  ApiVehicleCompatibleSize,
} from '@tirely/types';
import {
  type DismountTiresInput,
  type MountTiresInput,
  type RotateTiresInput,
  vehicleUpdateSchema,
  type VehicleCompatibleSizeInput,
  type VehicleUpdateInput,
} from '@tirely/validators';
import {
  Badge,
  Box,
  Button,
  Callout,
  Card,
  Checkbox,
  Dialog,
  Flex,
  Heading,
  ScrollArea,
  Select,
  Separator,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import {
  ArrowLeft,
  Car,
  ClipboardList,
  Gauge,
  Pencil,
  RotateCw,
  Ruler,
  User,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const POSITIONS = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'SPARE'] as const;
type Position = (typeof POSITIONS)[number];

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
  query: { page: number; perPage: number },
  signal?: AbortSignal,
) =>
  authRequest<ApiMileageEntry[]>(
    `/v1/company/${slug}/vehicles/${vehicleId}/mileage?${new URLSearchParams({
      page: String(query.page),
      perPage: String(query.perPage),
    })}`,
    { signal },
  );

const listDepots = (
  slug: string,
  query: { page: number; perPage: number; sortBy: string; sortOrder: string },
  signal?: AbortSignal,
) =>
  authRequest<ApiDepot[]>(
    `/v1/company/${slug}/depots?${new URLSearchParams({
      page: String(query.page),
      perPage: String(query.perPage),
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })}`,
    { signal },
  );

const listCompanyUsers = (
  slug: string,
  query: { page: number; perPage: number; role?: string },
  signal?: AbortSignal,
) => {
  const params = new URLSearchParams({
    page: String(query.page),
    perPage: String(query.perPage),
  });
  if (query.role) params.set('role', query.role);
  return authRequest<ApiCompanyMember[]>(`/v1/company/${slug}/users?${params}`, { signal });
};

const listTires = (
  slug: string,
  query: {
    page: number;
    perPage: number;
    status?: string;
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
  if (query.status) params.set('status', query.status);
  return authRequest<ApiTireSummary[]>(`/v1/company/${slug}/tires?${params}`);
};

const listTireSets = (slug: string) => authRequest<ApiTireSet[]>(`/v1/company/${slug}/tire-sets`);

const setVehicleArchived = (slug: string, vehicleId: string, archived: boolean) =>
  authRequest<ApiVehicle>(`/v1/company/${slug}/vehicles/${vehicleId}/archive`, {
    method: 'PATCH',
    body: { archived },
  });

const replaceCompatibleSizes = (
  slug: string,
  vehicleId: string,
  sizes: VehicleCompatibleSizeInput[],
) =>
  authRequest<ApiVehicleCompatibleSize[]>(
    `/v1/company/${slug}/vehicles/${vehicleId}/compatible-sizes`,
    { method: 'PUT', body: { sizes } },
  );

const assignVehicleDriver = (slug: string, vehicleId: string, driverId: string | null) =>
  authRequest<{ id: string; assignedDriverId: string | null }>(
    `/v1/company/${slug}/vehicles/${vehicleId}/driver`,
    { method: 'PATCH', body: { driverId } },
  );

const mountTires = (slug: string, vehicleId: string, body: MountTiresInput) =>
  authRequest<{ ok: true }>(`/v1/company/${slug}/vehicles/${vehicleId}/mount`, {
    method: 'POST',
    body,
  });

const dismountTires = (slug: string, vehicleId: string, body: DismountTiresInput) =>
  authRequest<{ ok: true }>(`/v1/company/${slug}/vehicles/${vehicleId}/dismount`, {
    method: 'POST',
    body,
  });

const rotateTires = (slug: string, vehicleId: string, body: RotateTiresInput) =>
  authRequest<{ ok: true }>(`/v1/company/${slug}/vehicles/${vehicleId}/rotate`, {
    method: 'POST',
    body,
  });

const updateVehicle = (slug: string, vehicleId: string, body: VehicleUpdateInput) =>
  authRequest<ApiVehicle>(`/v1/company/${slug}/vehicles/${vehicleId}`, {
    method: 'PATCH',
    body,
  });

type FitmentMismatch = {
  tireId: string;
  position: string;
  expectedSizes: { width: number; aspectRatio: number; rimDiameter: number }[];
  actualSize: { width: number; aspectRatio: number; rimDiameter: number };
};

type MountedTire = ApiTireSummary & { currentPosition: string };

function formatSize(s: { width: number; aspectRatio: number; rimDiameter: number }) {
  return `${s.width}/${s.aspectRatio}R${s.rimDiameter}`;
}

const AXLE_POSITION_LABELS: Record<string, string> = {
  ANY: 'Any',
  FRONT: 'Front',
  REAR: 'Rear',
  REAR_DUALLY: 'Rear (Dually)',
  SPARE: 'Spare',
  TRAILER: 'Trailer',
};

function todayIso() {
  return new Date().toISOString().slice(0, 16);
}

export default function VehicleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const { data: session } = useSession();
  const { toast } = useToast();
  const [yearLimit] = useState(() => new Date().getFullYear() + 1);

  const [vehicle, setVehicle] = useState<ApiVehicle | null>(null);
  const [depots, setDepots] = useState<ApiDepot[]>([]);
  const [drivers, setDrivers] = useState<ApiCompanyMember[]>([]);
  const [mountedTires, setMountedTires] = useState<MountedTire[]>([]);

  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const [sizesOpen, setSizesOpen] = useState(false);
  const [sizesForm, setSizesForm] = useState<VehicleCompatibleSizeInput[]>([]);
  const [sizesSaving, setSizesSaving] = useState(false);
  const [sizesError, setSizesError] = useState<string | null>(null);

  const [driverOpen, setDriverOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [driverSaving, setDriverSaving] = useState(false);
  const [driverError, setDriverError] = useState<string | null>(null);
  const [unassigning, setUnassigning] = useState(false);

  const [mileageEntries, setMileageEntries] = useState<ApiMileageEntry[]>([]);

  const [mountOpen, setMountOpen] = useState(false);
  const [mountSource, setMountSource] = useState<'individual' | 'set'>('individual');
  const [inStockTires, setInStockTires] = useState<ApiTireSummary[]>([]);
  const [tireSets, setTireSets] = useState<ApiTireSet[]>([]);
  const [mountSelectedTireIds, setMountSelectedTireIds] = useState<string[]>([]);
  const [mountTireSetId, setMountTireSetId] = useState('');
  const [mountPositionMap, setMountPositionMap] = useState<Record<string, Position>>({});
  const [mountDate, setMountDate] = useState(() => todayIso());
  const [mountOdometer, setMountOdometer] = useState('');
  const [mountFitmentNote, setMountFitmentNote] = useState('');
  const [mountLoading, setMountLoading] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [mountMismatches, setMountMismatches] = useState<FitmentMismatch[]>([]);

  const [dismountOpen, setDismountOpen] = useState(false);
  const [dismountSelectedTireIds, setDismountSelectedTireIds] = useState<string[]>([]);
  const [dismountReason, setDismountReason] = useState('');
  const [dismountDepotId, setDismountDepotId] = useState('');
  const [dismountDate, setDismountDate] = useState(() => todayIso());
  const [dismountOdometer, setDismountOdometer] = useState('');
  const [dismountLoading, setDismountLoading] = useState(false);
  const [dismountError, setDismountError] = useState<string | null>(null);

  const [rotateOpen, setRotateOpen] = useState(false);
  const [rotateNewPositions, setRotateNewPositions] = useState<Record<string, Position>>({});
  const [rotateDate, setRotateDate] = useState(() => todayIso());
  const [rotateOdometer, setRotateOdometer] = useState('');
  const [rotateFitmentNote, setRotateFitmentNote] = useState('');
  const [rotateLoading, setRotateLoading] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [rotateMismatches, setRotateMismatches] = useState<FitmentMismatch[]>([]);

  const role = session?.user.role;
  const canManageVehicle = role === 'admin' || role === 'fleet_manager';
  const canManageTireOperations = canManageVehicle || role === 'maintenance';
  const canViewDrivers = canManageVehicle;

  const loadMountedTires = useCallback(
    async (signal?: AbortSignal) => {
      const res = await fetchVehicleTires(slug, id, signal);
      if (!('code' in res)) {
        setMountedTires(
          (res.data as (ApiTireSummary & { currentPosition?: string })[])
            .filter((t) => t.currentPosition)
            .map((t) => ({ ...t, currentPosition: t.currentPosition! })),
        );
      }
    },
    [slug, id],
  );

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const [vehicleRes, mileageRes] = await Promise.all([
        fetchVehicle(slug, id, signal),
        listVehicleMileage(slug, id, { page: 1, perPage: 10 }, signal),
      ]);
      if (!('code' in vehicleRes)) setVehicle(vehicleRes.data);
      if (!('code' in mileageRes)) setMileageEntries(mileageRes.data);
      await loadMountedTires(signal);
    },
    [slug, id, loadMountedTires],
  );

  const loadOptions = useCallback(async () => {
    const [depotRes, driverRes] = await Promise.all([
      listDepots(slug, { page: 1, perPage: 100, sortBy: 'name', sortOrder: 'asc' }),
      listCompanyUsers(slug, { page: 1, perPage: 100, role: 'driver' }),
    ]);
    if (!('code' in depotRes)) setDepots(depotRes.data);
    if (!('code' in driverRes)) setDrivers(driverRes.data);
  }, [slug]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    loadOptions();
    return () => controller.abort();
  }, [load, loadOptions]);

  const startEdit = () => setEditing(true);
  const cancelEdit = () => setEditing(false);

  const handleArchive = async (archived: boolean) => {
    if (!vehicle) return;
    setArchiving(true);
    const res = await setVehicleArchived(slug, vehicle.id, archived);
    setArchiving(false);
    if ('code' in res) {
      toast({ title: res.message, variant: 'error' });
      return;
    }
    setVehicle(res.data);
    toast({ title: archived ? 'Vehicle archived' : 'Vehicle restored', variant: 'success' });
  };

  const openSizesDialog = () => {
    if (!vehicle) return;
    setSizesForm(
      vehicle.compatibleSizes.map((s) => ({
        width: s.width,
        aspectRatio: s.aspectRatio,
        rimDiameter: s.rimDiameter,
        axlePosition: s.axlePosition,
      })),
    );
    setSizesError(null);
    setSizesOpen(true);
  };

  const handleSaveSizes = async () => {
    if (!vehicle) return;
    setSizesSaving(true);
    setSizesError(null);
    const res = await replaceCompatibleSizes(slug, vehicle.id, sizesForm);
    setSizesSaving(false);
    if ('code' in res) {
      setSizesError(res.message);
      return;
    }
    setVehicle((v) => (v ? { ...v, compatibleSizes: res.data } : v));
    setSizesOpen(false);
    toast({ title: 'Compatible sizes updated', variant: 'success' });
  };

  const openDriverDialog = () => {
    setSelectedDriverId(vehicle?.assignedDriver?.id ?? '');
    setDriverError(null);
    setDriverOpen(true);
  };

  const handleAssignDriver = async () => {
    if (!vehicle || !selectedDriverId) return;
    setDriverSaving(true);
    setDriverError(null);
    const res = await assignVehicleDriver(slug, vehicle.id, selectedDriverId);
    setDriverSaving(false);
    if ('code' in res) {
      setDriverError(res.message);
      return;
    }
    const driver = drivers.find((d) => d.id === selectedDriverId) ?? null;
    setVehicle((v) =>
      v
        ? {
            ...v,
            assignedDriver: driver
              ? { id: driver.id, name: driver.name, email: driver.email }
              : null,
          }
        : v,
    );
    emitDriverAssignmentChanged();
    setDriverOpen(false);
    toast({ title: 'Driver assigned', variant: 'success' });
  };

  const handleUnassignDriver = async () => {
    if (!vehicle) return;
    setUnassigning(true);
    const res = await assignVehicleDriver(slug, vehicle.id, null);
    setUnassigning(false);
    if ('code' in res) {
      toast({ title: res.message, variant: 'error' });
      return;
    }
    setVehicle((v) => (v ? { ...v, assignedDriver: null } : v));
    emitDriverAssignmentChanged();
    toast({ title: 'Driver unassigned', variant: 'success' });
  };

  const openMountDialog = async () => {
    setMountSource('individual');
    setMountSelectedTireIds([]);
    setMountTireSetId('');
    setMountPositionMap({});
    setMountDate(todayIso());
    setMountOdometer('');
    setMountFitmentNote('');
    setMountError(null);
    setMountMismatches([]);
    const [tiresRes, setsRes] = await Promise.all([
      listTires(slug, {
        page: 1,
        perPage: 100,
        status: 'IN_STOCK',
        sortBy: 'brand',
        sortOrder: 'asc',
      }),
      listTireSets(slug),
    ]);
    if (!('code' in tiresRes)) setInStockTires(tiresRes.data);
    if (!('code' in setsRes)) setTireSets(setsRes.data);
    setMountOpen(true);
  };

  const getSelectedSetTires = () => {
    if (!mountTireSetId) return [];
    return tireSets.find((s) => s.id === mountTireSetId)?.tires ?? [];
  };

  const buildMountBody = (confirmOverride?: boolean) => {
    const base = {
      vehicleId: id,
      date: new Date(mountDate),
      odometer: parseInt(mountOdometer, 10),
      confirmFitmentOverride: confirmOverride,
      fitmentNote: mountFitmentNote || undefined,
    };
    if (mountSource === 'set' && mountTireSetId) {
      return { ...base, tireSetId: mountTireSetId, positionMap: mountPositionMap, assignments: [] };
    }
    return {
      ...base,
      assignments: mountSelectedTireIds.map((tid) => ({
        tireId: tid,
        position: mountPositionMap[tid]!,
      })),
    };
  };

  const handleMount = async (confirmOverride = false) => {
    setMountLoading(true);
    setMountError(null);
    if (!confirmOverride) setMountMismatches([]);
    const res = await mountTires(
      slug,
      id,
      buildMountBody(confirmOverride || undefined) as unknown as Parameters<typeof mountTires>[2],
    );
    setMountLoading(false);
    if ('code' in res) {
      if (res.code === 'FITMENT_OVERRIDE_REQUIRED') {
        const details = res.details as { mismatches: FitmentMismatch[] } | undefined;
        setMountMismatches(details?.mismatches ?? []);
        return;
      }
      setMountError(res.message);
      return;
    }
    setMountOpen(false);
    await loadMountedTires();
    toast({ title: 'Tires mounted successfully', variant: 'success' });
  };

  const mountAssignmentTires =
    mountSource === 'individual'
      ? inStockTires.filter((t) => mountSelectedTireIds.includes(t.id))
      : getSelectedSetTires();

  const mountCanSubmit =
    mountOdometer.trim() !== '' &&
    !isNaN(parseInt(mountOdometer, 10)) &&
    mountAssignmentTires.length > 0 &&
    mountAssignmentTires.every((t) => Boolean(mountPositionMap[t.id]));

  const openDismountDialog = () => {
    setDismountSelectedTireIds([]);
    setDismountReason('');
    setDismountDepotId(depots[0]?.id ?? '');
    setDismountDate(todayIso());
    setDismountOdometer('');
    setDismountError(null);
    setDismountOpen(true);
  };

  const handleDismount = async () => {
    setDismountLoading(true);
    setDismountError(null);
    const res = await dismountTires(slug, id, {
      vehicleId: id,
      date: new Date(dismountDate),
      odometer: parseInt(dismountOdometer, 10),
      tireIds: dismountSelectedTireIds,
      reason: dismountReason as
        | 'REPLACEMENT'
        | 'SEASONAL_SWAP'
        | 'END_OF_LIFE'
        | 'SENT_FOR_RETREADING',
      targetDepotId: dismountDepotId,
    });
    setDismountLoading(false);
    if ('code' in res) {
      setDismountError(res.message);
      return;
    }
    setDismountOpen(false);
    await loadMountedTires();
    toast({ title: 'Tires dismounted successfully', variant: 'success' });
  };

  const dismountCanSubmit =
    dismountSelectedTireIds.length > 0 &&
    dismountReason !== '' &&
    dismountDepotId !== '' &&
    dismountOdometer.trim() !== '' &&
    !isNaN(parseInt(dismountOdometer, 10));

  const openRotateDialog = () => {
    const initial: Record<string, Position> = {};
    for (const t of mountedTires) {
      initial[t.id] = t.currentPosition as Position;
    }
    setRotateNewPositions(initial);
    setRotateDate(todayIso());
    setRotateOdometer('');
    setRotateFitmentNote('');
    setRotateError(null);
    setRotateMismatches([]);
    setRotateOpen(true);
  };

  const buildRotateBody = (confirmOverride?: boolean) => ({
    vehicleId: id,
    date: new Date(rotateDate),
    odometer: parseInt(rotateOdometer, 10),
    swaps: mountedTires
      .filter((t) => rotateNewPositions[t.id] && rotateNewPositions[t.id] !== t.currentPosition)
      .map((t) => ({ tireId: t.id, newPosition: rotateNewPositions[t.id]! })),
    confirmFitmentOverride: confirmOverride,
    fitmentNote: rotateFitmentNote || undefined,
  });

  const handleRotate = async (confirmOverride = false) => {
    setRotateLoading(true);
    setRotateError(null);
    if (!confirmOverride) setRotateMismatches([]);
    const body = buildRotateBody(confirmOverride || undefined);
    if (body.swaps.length === 0) {
      setRotateLoading(false);
      setRotateError('No position changes detected.');
      return;
    }
    const res = await rotateTires(slug, id, body as Parameters<typeof rotateTires>[2]);
    setRotateLoading(false);
    if ('code' in res) {
      if (res.code === 'FITMENT_OVERRIDE_REQUIRED') {
        const details = res.details as { mismatches: FitmentMismatch[] } | undefined;
        setRotateMismatches(details?.mismatches ?? []);
        return;
      }
      setRotateError(res.message);
      return;
    }
    setRotateOpen(false);
    await loadMountedTires();
    toast({ title: 'Tires rotated successfully', variant: 'success' });
  };

  const rotateMoved = mountedTires.filter(
    (t) => rotateNewPositions[t.id] && rotateNewPositions[t.id] !== t.currentPosition,
  );
  const rotateCanSubmit =
    rotateOdometer.trim() !== '' && !isNaN(parseInt(rotateOdometer, 10)) && rotateMoved.length > 0;

  const diagSlots: TireSlot[] = POSITIONS.map((pos) => {
    const tire = mountedTires.find((t) => t.currentPosition === pos);
    return {
      position: pos,
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
  });

  if (!vehicle) return null;

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

      <Flex justify="between" align="start">
        <Flex direction="column" gap="1">
          <Flex align="center" gap="2">
            <Heading size="6">{vehicle.licensePlate}</Heading>
            {vehicle.archived && <Badge color="orange">Archived</Badge>}
          </Flex>
          <Text size="2" color="gray">
            {vehicle.make} {vehicle.model} · {vehicle.year}
          </Text>
        </Flex>

        <Flex gap="2" wrap="wrap" justify="end">
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
          {canManageTireOperations ? (
            <Button variant="soft" asChild>
              <Link href={`/company/${slug}/maintenance/new?vehicleId=${vehicle.id}`}>
                <Wrench size={14} />
                Log maintenance
              </Link>
            </Button>
          ) : null}
          {canManageVehicle && (
            <>
              {!editing && (
                <Button variant="soft" onClick={startEdit}>
                  <Pencil size={14} />
                  Edit
                </Button>
              )}
              <Button
                variant="soft"
                color={vehicle.archived ? 'green' : 'red'}
                onClick={() => setArchiveConfirmOpen(true)}
                loading={archiving}
              >
                {vehicle.archived ? 'Restore' : 'Archive'}
              </Button>
            </>
          )}
        </Flex>
      </Flex>

      <SectionCard title="Vehicle Details" icon={Car}>
        {editing ? (
          <EditVehicleForm
            vehicle={vehicle}
            depots={depots}
            yearLimit={yearLimit}
            onCancel={cancelEdit}
            onSaved={(updated) => {
              setVehicle(updated);
              setEditing(false);
              toast({ title: 'Vehicle updated', variant: 'success' });
            }}
          />
        ) : (
          <>
            <Flex gap="6" wrap="wrap">
              <InfoField label="License plate" value={vehicle.licensePlate} />
              <InfoField label="Make" value={vehicle.make} />
              <InfoField label="Model" value={vehicle.model} />
              <InfoField label="Year" value={String(vehicle.year)} />
            </Flex>
            <Separator size="4" mt="3" mb="3" />
            <Flex gap="6" wrap="wrap">
              <InfoField label="VIN" value={vehicle.vin} />
              <InfoField label="Vehicle type" value={vehicle.vehicleType} />
              <InfoField label="Depot" value={vehicle.depot.name} />
            </Flex>
            <Separator size="4" mt="3" mb="3" />
            <Flex gap="6">
              <InfoField label="Created" value={formatDateTime(vehicle.createdAt)} />
              <InfoField label="Last updated" value={formatDateTime(vehicle.updatedAt)} />
            </Flex>
          </>
        )}
      </SectionCard>

      <SectionCard
        title="Compatible Tire Sizes"
        icon={Ruler}
        actions={
          canManageVehicle ? (
            <Button variant="soft" size="2" onClick={openSizesDialog}>
              Edit
            </Button>
          ) : undefined
        }
      >
        <Flex gap="2" wrap="wrap">
          {vehicle.compatibleSizes.length === 0 ? (
            <Text size="2" color="gray">
              No sizes defined
            </Text>
          ) : (
            vehicle.compatibleSizes.map((s) => (
              <Badge key={s.id} variant="soft" color="cyan" size="2">
                {formatSize(s)}
                {s.axlePosition !== 'ANY' && (
                  <Text size="1" color="gray" ml="1">
                    ({AXLE_POSITION_LABELS[s.axlePosition] ?? s.axlePosition})
                  </Text>
                )}
              </Badge>
            ))
          )}
        </Flex>
      </SectionCard>

      <SectionCard
        title="Driver"
        icon={User}
        actions={
          canManageVehicle ? (
            <Flex gap="2">
              <Button variant="soft" size="2" onClick={openDriverDialog}>
                {vehicle.assignedDriver ? 'Change' : 'Assign'}
              </Button>
              {vehicle.assignedDriver && (
                <Button
                  variant="soft"
                  color="red"
                  size="2"
                  onClick={handleUnassignDriver}
                  loading={unassigning}
                >
                  Unassign
                </Button>
              )}
            </Flex>
          ) : undefined
        }
      >
        {vehicle.assignedDriver ? (
          <Flex direction="column" gap="1">
            {canViewDrivers ? (
              <Text asChild size="2" weight="medium">
                <Link href={`/company/${slug}/drivers/${vehicle.assignedDriver.id}`}>
                  {vehicle.assignedDriver.name}
                </Link>
              </Text>
            ) : (
              <Text size="2" weight="medium">
                {vehicle.assignedDriver.name}
              </Text>
            )}
            <Text size="2" color="gray">
              {vehicle.assignedDriver.email}
            </Text>
          </Flex>
        ) : (
          <Text size="2" color="gray">
            No driver assigned
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Recent Mileage" icon={Gauge}>
        {mileageEntries.length === 0 ? (
          <Callout.Root color="gray">
            <Callout.Text>No mileage entries yet.</Callout.Text>
          </Callout.Root>
        ) : (
          <Flex direction="column" gap="2">
            {mileageEntries.map((entry, i) => (
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
                  {(() => {
                    const prev = mileageEntries[i + 1];
                    return prev ? (
                      <Text size="2" color="green">
                        +{formatInteger(entry.odometer - prev.odometer)} km
                      </Text>
                    ) : null;
                  })()}
                </Flex>
              </Card>
            ))}
          </Flex>
        )}
      </SectionCard>

      <SectionCard
        title="Tire Positions"
        icon={RotateCw}
        actions={
          canManageTireOperations ? (
            <Flex gap="2">
              <Button variant="soft" size="2" onClick={openMountDialog}>
                Mount
              </Button>
              <Button
                variant="soft"
                size="2"
                color="orange"
                onClick={openDismountDialog}
                disabled={mountedTires.length === 0}
              >
                Dismount
              </Button>
              <Button
                variant="soft"
                size="2"
                color="cyan"
                onClick={openRotateDialog}
                disabled={mountedTires.length < 2}
              >
                Rotate
              </Button>
            </Flex>
          ) : undefined
        }
      >
        <TirePositionDiagram slots={diagSlots} mode="view" />
        {mountedTires.length === 0 && (
          <Text size="2" color="gray" mt="2" style={{ display: 'block', textAlign: 'center' }}>
            No tires mounted
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Inspections & Maintenance">
        <Callout.Root color="gray">
          <Callout.Text>Mounting and inspection data not yet available.</Callout.Text>
        </Callout.Root>
      </SectionCard>

      <Dialog.Root
        open={sizesOpen}
        onOpenChange={(open) => {
          if (!open) setSizesOpen(false);
        }}
      >
        <Dialog.Content maxWidth="560px">
          <Dialog.Title>Edit compatible sizes</Dialog.Title>
          <Dialog.Description>
            Replace the full list of compatible tire sizes for this vehicle.
          </Dialog.Description>
          <Flex direction="column" gap="3" mt="4">
            {sizesForm.map((size, i) => (
              <TireSizeSelector
                key={i}
                value={size}
                onChange={(v) => setSizesForm((s) => s.map((item, idx) => (idx === i ? v : item)))}
                onRemove={() => setSizesForm((s) => s.filter((_, idx) => idx !== i))}
                showRemove={sizesForm.length > 1}
              />
            ))}
            <Box>
              <Button
                variant="ghost"
                onClick={() => setSizesForm((s) => [...s, { ...EMPTY_COMPATIBLE_SIZE }])}
                disabled={sizesForm.length >= 20}
              >
                + Add size
              </Button>
            </Box>
            {sizesError && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{sizesError}</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleSaveSizes}
              loading={sizesSaving}
              disabled={sizesForm.length === 0}
            >
              Save sizes
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <ConfirmActionDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={vehicle.archived ? 'Restore vehicle' : 'Archive vehicle'}
        description={
          vehicle.archived
            ? `Restore ${vehicle.licensePlate} to the active fleet?`
            : `Archive ${vehicle.licensePlate}? It will be hidden from active fleet workflows.`
        }
        confirmLabel={vehicle.archived ? 'Restore' : 'Archive'}
        color={vehicle.archived ? 'green' : 'red'}
        onConfirm={() => handleArchive(!vehicle.archived)}
      />

      <Dialog.Root
        open={driverOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDriverOpen(false);
            setDriverError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="400px">
          <Dialog.Title>{vehicle.assignedDriver ? 'Change driver' : 'Assign driver'}</Dialog.Title>
          <Flex direction="column" gap="3" mt="4">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Driver
              </Text>
              <Select.Root value={selectedDriverId} onValueChange={setSelectedDriverId}>
                <Select.Trigger placeholder="Select a driver" />
                <Select.Content>
                  {drivers.map((d) => (
                    <Select.Item key={d.id} value={d.id}>
                      {d.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            {driverError && (
              <Callout.Root color="red" size="1">
                <Callout.Text>{driverError}</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
          <Flex justify="end" gap="3" mt="4">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              onClick={handleAssignDriver}
              loading={driverSaving}
              disabled={!selectedDriverId}
            >
              Assign
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={mountOpen}
        onOpenChange={(open) => {
          if (!open) {
            setMountOpen(false);
            setMountMismatches([]);
            setMountError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="560px">
          <Dialog.Title>Mount tires</Dialog.Title>

          <Flex gap="3" mt="4" mb="3">
            <Button
              variant={mountSource === 'individual' ? 'solid' : 'soft'}
              color="gray"
              size="2"
              onClick={() => {
                setMountSource('individual');
                setMountSelectedTireIds([]);
                setMountPositionMap({});
              }}
            >
              Individual tires
            </Button>
            <Button
              variant={mountSource === 'set' ? 'solid' : 'soft'}
              color="gray"
              size="2"
              onClick={() => {
                setMountSource('set');
                setMountTireSetId('');
                setMountPositionMap({});
              }}
            >
              Tire set
            </Button>
          </Flex>

          {mountSource === 'individual' && (
            <Flex direction="column" gap="2" mb="3">
              <Text size="2" weight="medium">
                Select tires (IN STOCK)
              </Text>
              {inStockTires.length === 0 ? (
                <Text size="2" color="gray">
                  No tires in stock
                </Text>
              ) : (
                <ScrollArea style={{ maxHeight: 180 }}>
                  <Flex direction="column" gap="1">
                    {inStockTires.map((t) => (
                      <Flex key={t.id} align="center" gap="2" py="1">
                        <Checkbox
                          checked={mountSelectedTireIds.includes(t.id)}
                          onCheckedChange={(checked) =>
                            setMountSelectedTireIds((ids) =>
                              checked ? [...ids, t.id] : ids.filter((x) => x !== t.id),
                            )
                          }
                        />
                        <Text size="2">
                          {t.brand} {t.model} — {formatSize(t)}
                        </Text>
                      </Flex>
                    ))}
                  </Flex>
                </ScrollArea>
              )}
            </Flex>
          )}

          {mountSource === 'set' && (
            <Flex direction="column" gap="2" mb="3">
              <Text size="2" weight="medium">
                Tire set
              </Text>
              <Select.Root
                value={mountTireSetId}
                onValueChange={(v) => {
                  setMountTireSetId(v);
                  setMountPositionMap({});
                }}
              >
                <Select.Trigger placeholder="Select a tire set" />
                <Select.Content>
                  {tireSets.map((s) => (
                    <Select.Item key={s.id} value={s.id}>
                      {s.name} ({s.tires.length} tires)
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
          )}

          {mountAssignmentTires.length > 0 && (
            <Flex direction="column" gap="2" mb="3">
              <Text size="2" weight="medium">
                Assign positions
              </Text>
              {mountAssignmentTires.map((t) => (
                <Flex key={t.id} align="center" gap="3">
                  <Text size="2" style={{ flex: 1 }}>
                    {t.brand} {t.model}
                  </Text>
                  <Select.Root
                    value={mountPositionMap[t.id] ?? ''}
                    onValueChange={(v) =>
                      setMountPositionMap((m) => ({ ...m, [t.id]: v as Position }))
                    }
                  >
                    <Select.Trigger placeholder="Position" style={{ minWidth: 140 }} />
                    <Select.Content>
                      {POSITIONS.map((p) => (
                        <Select.Item key={p} value={p}>
                          {p.replace('_', ' ')}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
              ))}
            </Flex>
          )}

          <Flex gap="3" mb="3">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">
                Date
              </Text>
              <TextField.Root
                type="datetime-local"
                value={mountDate}
                onChange={(e) => setMountDate(e.target.value)}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">
                Odometer (km) <Text color="red">*</Text>
              </Text>
              <TextField.Root
                type="number"
                min={0}
                placeholder="e.g. 125000"
                value={mountOdometer}
                onChange={(e) => setMountOdometer(e.target.value)}
              />
            </Flex>
          </Flex>

          <Flex direction="column" gap="1" mb="3">
            <Text size="2" weight="medium" color="gray">
              Override note (optional)
            </Text>
            <TextArea
              placeholder="Reason for any size override..."
              value={mountFitmentNote}
              onChange={(e) => setMountFitmentNote(e.target.value)}
              rows={2}
            />
          </Flex>

          {mountMismatches.length > 0 && (
            <Callout.Root color="orange" mb="3">
              <Box>
                <Text size="2">
                  <Text weight="bold">Fitment mismatch</Text> — the following tires do not match the
                  vehicle&apos;s compatible sizes:
                </Text>
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {mountMismatches.map((m) => (
                    <li key={m.tireId}>
                      <Text size="2">
                        Tire at <strong>{m.position.replace('_', ' ')}</strong> is{' '}
                        {formatSize(m.actualSize)}; expected{' '}
                        {m.expectedSizes.map(formatSize).join(' or ')}
                      </Text>
                    </li>
                  ))}
                </ul>
              </Box>
            </Callout.Root>
          )}

          {mountError && (
            <Callout.Root color="red" mb="3">
              <Callout.Text>{mountError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="end" gap="3" mt="2">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            {mountMismatches.length > 0 ? (
              <Button color="orange" onClick={() => handleMount(true)} loading={mountLoading}>
                Proceed anyway
              </Button>
            ) : (
              <Button
                onClick={() => handleMount(false)}
                loading={mountLoading}
                disabled={!mountCanSubmit}
              >
                Mount
              </Button>
            )}
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={dismountOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDismountOpen(false);
            setDismountError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Dismount tires</Dialog.Title>

          <Flex direction="column" gap="2" mt="4" mb="3">
            <Text size="2" weight="medium">
              Select tires to dismount
            </Text>
            {mountedTires.map((t) => (
              <Flex key={t.id} align="center" gap="2" py="1">
                <Checkbox
                  checked={dismountSelectedTireIds.includes(t.id)}
                  onCheckedChange={(checked) =>
                    setDismountSelectedTireIds((ids) =>
                      checked ? [...ids, t.id] : ids.filter((x) => x !== t.id),
                    )
                  }
                />
                <Text size="2">
                  {t.brand} {t.model} — {t.currentPosition.replace('_', ' ')}
                </Text>
              </Flex>
            ))}
          </Flex>

          <Flex direction="column" gap="1" mb="3">
            <Text size="2" weight="medium">
              Reason <Text color="red">*</Text>
            </Text>
            <Select.Root value={dismountReason} onValueChange={setDismountReason}>
              <Select.Trigger placeholder="Select reason" />
              <Select.Content>
                <Select.Item value="REPLACEMENT">Replacement</Select.Item>
                <Select.Item value="SEASONAL_SWAP">Seasonal swap</Select.Item>
                <Select.Item value="END_OF_LIFE">End of life</Select.Item>
                <Select.Item value="SENT_FOR_RETREADING">Send for retreading</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex direction="column" gap="1" mb="3">
            <Text size="2" weight="medium">
              Return to depot <Text color="red">*</Text>
            </Text>
            <Select.Root value={dismountDepotId} onValueChange={setDismountDepotId}>
              <Select.Trigger placeholder="Select depot" />
              <Select.Content>
                {depots.map((d) => (
                  <Select.Item key={d.id} value={d.id}>
                    {d.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>

          <Flex gap="3" mb="3">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">
                Date
              </Text>
              <TextField.Root
                type="datetime-local"
                value={dismountDate}
                onChange={(e) => setDismountDate(e.target.value)}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">
                Odometer (km) <Text color="red">*</Text>
              </Text>
              <TextField.Root
                type="number"
                min={0}
                placeholder="e.g. 125000"
                value={dismountOdometer}
                onChange={(e) => setDismountOdometer(e.target.value)}
              />
            </Flex>
          </Flex>

          {dismountError && (
            <Callout.Root color="red" mb="3">
              <Callout.Text>{dismountError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="end" gap="3" mt="2">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="red"
              onClick={handleDismount}
              loading={dismountLoading}
              disabled={!dismountCanSubmit}
            >
              Dismount
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={rotateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRotateOpen(false);
            setRotateMismatches([]);
            setRotateError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Rotate tires</Dialog.Title>
          <Dialog.Description size="2" mb="3">
            Assign a new position for each tire that should move.
          </Dialog.Description>

          <Flex direction="column" gap="2" mb="3">
            {mountedTires.map((t) => (
              <Flex key={t.id} align="center" gap="3">
                <Text size="2" style={{ flex: 1 }}>
                  {t.brand} {t.model}
                  <Text size="1" color="gray" ml="1">
                    ({t.currentPosition.replace('_', ' ')})
                  </Text>
                </Text>
                <Select.Root
                  value={rotateNewPositions[t.id] ?? t.currentPosition}
                  onValueChange={(v) =>
                    setRotateNewPositions((m) => ({ ...m, [t.id]: v as Position }))
                  }
                >
                  <Select.Trigger style={{ minWidth: 140 }} />
                  <Select.Content>
                    {POSITIONS.map((p) => (
                      <Select.Item key={p} value={p}>
                        {p.replace('_', ' ')}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Flex>
            ))}
          </Flex>

          {rotateMoved.length > 0 && (
            <Callout.Root color="blue" mb="3" size="1">
              <Callout.Text>
                {rotateMoved.length} tire{rotateMoved.length > 1 ? 's' : ''} will be moved.
              </Callout.Text>
            </Callout.Root>
          )}

          <Flex gap="3" mb="3">
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">
                Date
              </Text>
              <TextField.Root
                type="datetime-local"
                value={rotateDate}
                onChange={(e) => setRotateDate(e.target.value)}
              />
            </Flex>
            <Flex direction="column" gap="1" style={{ flex: 1 }}>
              <Text size="2" weight="medium">
                Odometer (km) <Text color="red">*</Text>
              </Text>
              <TextField.Root
                type="number"
                min={0}
                placeholder="e.g. 125000"
                value={rotateOdometer}
                onChange={(e) => setRotateOdometer(e.target.value)}
              />
            </Flex>
          </Flex>

          <Flex direction="column" gap="1" mb="3">
            <Text size="2" weight="medium" color="gray">
              Override note (optional)
            </Text>
            <TextArea
              placeholder="Reason for any size override..."
              value={rotateFitmentNote}
              onChange={(e) => setRotateFitmentNote(e.target.value)}
              rows={2}
            />
          </Flex>

          {rotateMismatches.length > 0 && (
            <Callout.Root color="orange" mb="3">
              <Callout.Text>
                <Text weight="bold">Fitment mismatch</Text> — some tires don&apos;t match at their
                new positions:
                <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                  {rotateMismatches.map((m) => (
                    <li key={m.tireId}>
                      Tire at <strong>{m.position.replace('_', ' ')}</strong> is{' '}
                      {formatSize(m.actualSize)}; expected{' '}
                      {m.expectedSizes.map(formatSize).join(' or ')}
                    </li>
                  ))}
                </ul>
              </Callout.Text>
            </Callout.Root>
          )}

          {rotateError && (
            <Callout.Root color="red" mb="3">
              <Callout.Text>{rotateError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="end" gap="3" mt="2">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            {rotateMismatches.length > 0 ? (
              <Button color="orange" onClick={() => handleRotate(true)} loading={rotateLoading}>
                Proceed anyway
              </Button>
            ) : (
              <Button
                onClick={() => handleRotate(false)}
                loading={rotateLoading}
                disabled={!rotateCanSubmit}
              >
                Rotate
              </Button>
            )}
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}

type EditVehicleFormProps = {
  vehicle: ApiVehicle;
  depots: ApiDepot[];
  yearLimit: number;
  onCancel: () => void;
  onSaved: (updated: ApiVehicle) => void;
};

function EditVehicleForm({ vehicle, depots, yearLimit, onCancel, onSaved }: EditVehicleFormProps) {
  const params = useParams();
  const slug = params.slug as string;

  const defaults: VehicleUpdateInput = {
    licensePlate: vehicle.licensePlate,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    vin: vehicle.vin ?? undefined,
    vehicleType: vehicle.vehicleType ?? undefined,
    depotId: vehicle.depot.id,
  };

  return (
    <Form
      schema={vehicleUpdateSchema}
      defaultValues={defaults}
      onSubmit={async (values, { setError }) => {
        const res = await updateVehicle(slug, vehicle.id, values);
        if ('code' in res) {
          setError('root.serverError', { message: res.message });
          return;
        }
        onSaved(res.data);
      }}
    >
      <Flex direction="column" gap="3">
        <Flex gap="3">
          <Box style={{ flex: 1 }}>
            <FormField name="licensePlate" label="License plate" required>
              {(f) => <TextField.Root {...f} value={(f.value as string) ?? ''} />}
            </FormField>
          </Box>
          <Box style={{ flex: 1 }}>
            <FormField name="year" label="Year" required>
              {(f) => (
                <TextField.Root
                  id={f.id}
                  name={f.name}
                  ref={f.ref as never}
                  onBlur={f.onBlur}
                  type="number"
                  min={1980}
                  max={yearLimit}
                  value={String((f.value as number | undefined) ?? vehicle.year)}
                  onChange={(e) => f.onChange(parseInt(e.target.value, 10) || vehicle.year)}
                  aria-invalid={f['aria-invalid']}
                  aria-describedby={f['aria-describedby']}
                />
              )}
            </FormField>
          </Box>
        </Flex>

        <Flex gap="3">
          <Box style={{ flex: 1 }}>
            <FormField name="make" label="Make" required>
              {(f) => <TextField.Root {...f} value={(f.value as string) ?? ''} />}
            </FormField>
          </Box>
          <Box style={{ flex: 1 }}>
            <FormField name="model" label="Model" required>
              {(f) => <TextField.Root {...f} value={(f.value as string) ?? ''} />}
            </FormField>
          </Box>
        </Flex>

        <Flex gap="3">
          <Box style={{ flex: 1 }}>
            <FormField name="vin" label="VIN">
              {(f) => (
                <TextField.Root
                  id={f.id}
                  name={f.name}
                  ref={f.ref as never}
                  onBlur={f.onBlur}
                  maxLength={17}
                  value={(f.value as string | undefined) ?? ''}
                  onChange={(e) => f.onChange(e.target.value || undefined)}
                  aria-invalid={f['aria-invalid']}
                  aria-describedby={f['aria-describedby']}
                />
              )}
            </FormField>
          </Box>
          <Box style={{ flex: 1 }}>
            <FormField name="vehicleType" label="Vehicle type">
              {(f) => (
                <TextField.Root
                  id={f.id}
                  name={f.name}
                  ref={f.ref as never}
                  onBlur={f.onBlur}
                  value={(f.value as string | undefined) ?? ''}
                  onChange={(e) => f.onChange(e.target.value || undefined)}
                  aria-invalid={f['aria-invalid']}
                  aria-describedby={f['aria-describedby']}
                />
              )}
            </FormField>
          </Box>
        </Flex>

        <FormField name="depotId" label="Depot" required>
          {(f) => (
            <Select.Root
              value={(f.value as string | undefined) ?? vehicle.depot.id}
              onValueChange={f.onChange}
            >
              <Select.Trigger />
              <Select.Content>
                {depots.map((d) => (
                  <Select.Item key={d.id} value={d.id}>
                    {d.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </FormField>

        <FormErrorState />

        <Flex gap="2">
          <SubmitButton>Save</SubmitButton>
          <Button type="button" variant="soft" color="gray" onClick={onCancel}>
            Cancel
          </Button>
        </Flex>
      </Flex>
    </Form>
  );
}
