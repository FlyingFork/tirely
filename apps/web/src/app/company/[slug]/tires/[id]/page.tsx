'use client';

import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { InfoField } from '@/components/InfoField';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/auth-client';
import { formatDate, formatDateTime, formatInteger } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiDepot, ApiTire, ApiTireSet, ApiTireUsageBreakdown } from '@tirely/types';
import {
  tireUpdateSchema,
  type TireSetUpdateInput,
  type TireUpdateInput,
} from '@tirely/validators';
import {
  Box,
  Button,
  Callout,
  Dialog,
  Flex,
  Grid,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ArrowLeft, Info, Layers, MapPin, Pencil, BarChart2, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const overrideLabels: Record<NonNullable<ApiTireUsageBreakdown['appliedOverride']>, string> = {
  NEEDS_REPLACEMENT: 'Replacement condition floor applied',
  NEEDS_MONITORING: 'Monitoring condition floor applied',
  TREAD_CRITICAL: 'Critical tread floor applied',
  AGE_EXCEEDED: 'Maximum age floor applied',
};

const updateTire = (slug: string, id: string, body: TireUpdateInput) =>
  authRequest<ApiTire>(`/v1/company/${slug}/tires/${id}`, { method: 'PATCH', body });

const fetchTire = (slug: string, id: string, signal?: AbortSignal) =>
  authRequest<ApiTire>(`/v1/company/${slug}/tires/${id}`, { signal });

const fetchTireUsageBreakdown = (slug: string, id: string, signal?: AbortSignal) =>
  authRequest<ApiTireUsageBreakdown>(`/v1/company/${slug}/tires/${id}/usage-breakdown`, {
    signal,
  });

const getTireSet = (slug: string, id: string, signal?: AbortSignal) =>
  authRequest<ApiTireSet>(`/v1/company/${slug}/tire-sets/${id}`, { signal });

const listDepots = (slug: string) =>
  authRequest<ApiDepot[]>(
    `/v1/company/${slug}/depots?${new URLSearchParams({
      page: '1',
      perPage: '100',
      sortBy: 'name',
      sortOrder: 'asc',
    })}`,
  );

const updateTireSet = (slug: string, id: string, body: TireSetUpdateInput) =>
  authRequest<ApiTireSet>(`/v1/company/${slug}/tire-sets/${id}`, { method: 'PATCH', body });

const disposeTire = (slug: string, id: string, body: { date: string }) =>
  authRequest<ApiTire>(`/v1/company/${slug}/tires/${id}/dispose`, {
    method: 'POST',
    body,
  });

function formatFactorValue(value: number | null) {
  if (value === null) return 'Unavailable';
  return `${Math.round(value * 100)}%`;
}

function formatWeight(weight: number) {
  return `${Math.round(weight * 100)}%`;
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function tireUpdateDefaults(tire: ApiTire): TireUpdateInput {
  return {
    loadIndex: tire.loadIndex ?? undefined,
    speedRating: tire.speedRating ?? undefined,
    dotCode: tire.dotCode ?? undefined,
    expectedMileageLifespan: tire.expectedMileageLifespan ?? undefined,
    depotId: tire.depot?.id ?? undefined,
  };
}

type TireEditFormProps = {
  slug: string;
  tire: ApiTire;
  depots: ApiDepot[];
  onSaved: (tire: ApiTire) => void;
};

function TireEditForm({ slug, tire, depots, onSaved }: TireEditFormProps) {
  const { toast } = useToast();

  return (
    <Form
      schema={tireUpdateSchema}
      defaultValues={tireUpdateDefaults(tire)}
      onSubmit={async (values, { setError }) => {
        const res = await updateTire(slug, tire.id, {
          ...values,
          loadIndex: optionalText(values.loadIndex),
          speedRating: optionalText(values.speedRating),
          dotCode: optionalText(values.dotCode),
          expectedMileageLifespan: values.expectedMileageLifespan || undefined,
          depotId: optionalText(values.depotId),
        });

        if ('code' in res) {
          setError('root.serverError', { message: res.message });
          return;
        }

        onSaved(res.data);
        toast({ title: 'Tire updated', variant: 'success' });
      }}
    >
      <Flex direction="column" gap="3">
        <Grid columns={{ initial: '1', sm: '3' }} gap="3">
          <FormField name="loadIndex" label="Load index">
            {(field) => (
              <TextField.Root
                {...field}
                value={field.value ?? ''}
                placeholder="e.g. 148"
                maxLength={8}
              />
            )}
          </FormField>
          <FormField name="speedRating" label="Speed rating">
            {(field) => (
              <TextField.Root
                {...field}
                value={field.value ?? ''}
                placeholder="e.g. L"
                maxLength={4}
              />
            )}
          </FormField>
          <FormField name="dotCode" label="DOT code">
            {(field) => (
              <TextField.Root
                {...field}
                value={field.value ?? ''}
                placeholder="e.g. DOT U2LL 0923"
                maxLength={20}
              />
            )}
          </FormField>
        </Grid>

        <Grid columns={{ initial: '1', sm: '2' }} gap="3">
          <FormField name="expectedMileageLifespan" label="Expected mileage (km)">
            {(field) => (
              <TextField.Root
                id={field.id}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={field['aria-invalid']}
                aria-describedby={field['aria-describedby']}
                type="number"
                placeholder="e.g. 150000"
                min={1000}
                max={2000000}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value ? parseInt(event.target.value, 10) : undefined)
                }
              />
            )}
          </FormField>
          <FormField name="depotId" label="Depot">
            {(field) => (
              <Select.Root
                value={(field.value as string | undefined) ?? ''}
                onValueChange={field.onChange}
              >
                <Select.Trigger id={field.id} placeholder="Select depot" />
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
        </Grid>

        <FormErrorState />
        <Box>
          <SubmitButton>Save changes</SubmitButton>
        </Box>
      </Flex>
    </Form>
  );
}

export default function TireDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const { data: session } = useSession();
  const { toast } = useToast();

  const [tire, setTire] = useState<ApiTire | null>(null);
  const [editing, setEditing] = useState(false);
  const [tireSet, setTireSet] = useState<ApiTireSet | null | undefined>(undefined);
  const [removingFromSet, setRemovingFromSet] = useState(false);
  const [depots, setDepots] = useState<ApiDepot[]>([]);
  const [disposeOpen, setDisposeOpen] = useState(false);
  const [disposing, setDisposing] = useState(false);
  const [disposeError, setDisposeError] = useState<string | null>(null);
  const [usageBreakdown, setUsageBreakdown] = useState<ApiTireUsageBreakdown | null>(null);
  const [usageBreakdownError, setUsageBreakdownError] = useState<string | null>(null);

  const canManage =
    session?.user.role === 'admin' ||
    session?.user.role === 'fleet_manager' ||
    session?.user.role === 'maintenance';

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const res = await fetchTire(slug, id, signal);
      if ('code' in res) return;

      setTire(res.data);

      const breakdownRes = await fetchTireUsageBreakdown(slug, id, signal);
      if ('code' in breakdownRes) {
        setUsageBreakdown(null);
        setUsageBreakdownError(breakdownRes.message);
      } else {
        setUsageBreakdown(breakdownRes.data);
        setUsageBreakdownError(null);
      }

      if (res.data.tireSetId) {
        const setRes = await getTireSet(slug, res.data.tireSetId, signal);
        setTireSet('code' in setRes ? null : setRes.data);
      } else {
        setTireSet(null);
      }
    },
    [slug, id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (!editing) return;
    listDepots(slug).then((res) => {
      if (!('code' in res)) setDepots(res.data);
    });
  }, [editing, slug]);

  const handleRemoveFromSet = async () => {
    if (!tire || !tireSet) return;
    setRemovingFromSet(true);
    const remainingIds = tireSet.tires.filter((setTire) => setTire.id !== tire.id).map((t) => t.id);
    const res = await updateTireSet(slug, tireSet.id, { tireIds: remainingIds });
    setRemovingFromSet(false);

    if ('code' in res) {
      toast({ title: res.message, variant: 'error' });
      return;
    }

    setTireSet(null);
    setTire((prev) => (prev ? { ...prev, tireSetId: null } : prev));
    toast({ title: 'Removed from tire set', variant: 'success' });
  };

  const handleDispose = async () => {
    if (!tire) return;
    setDisposing(true);
    setDisposeError(null);
    const res = await disposeTire(slug, tire.id, { date: new Date().toISOString() });
    setDisposing(false);

    if ('code' in res) {
      setDisposeError(res.message);
      return;
    }

    setTire(res.data);
    setDisposeOpen(false);
    toast({ title: 'Tire disposed', variant: 'success' });
  };

  if (!tire) {
    return (
      <Flex align="center" justify="center" style={{ minHeight: 200 }}>
        <Text color="gray">Loading...</Text>
      </Flex>
    );
  }

  const sizeLabel = `${tire.width}/${tire.aspectRatio}R${tire.rimDiameter}`;

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title={`${tire.brand} ${tire.model}`}
        description={sizeLabel}
        breadcrumb={
          <Button variant="ghost" color="gray" asChild>
            <Link href={`/company/${slug}/tires`}>
              <ArrowLeft size={16} />
              Back to tires
            </Link>
          </Button>
        }
        actions={
          canManage && !tire.archived ? (
            <Flex gap="2" wrap="wrap">
              {!editing ? (
                <Button variant="soft" onClick={() => setEditing(true)}>
                  <Pencil size={14} /> Edit
                </Button>
              ) : (
                <Button variant="ghost" color="gray" onClick={() => setEditing(false)}>
                  <X size={14} /> Cancel
                </Button>
              )}
              {tire.status === 'IN_STOCK' && (
                <Button color="red" variant="soft" onClick={() => setDisposeOpen(true)}>
                  <Trash2 size={14} /> Dispose
                </Button>
              )}
            </Flex>
          ) : null
        }
      />

      <SectionCard title="Identity" icon={Info}>
        {editing ? (
          <TireEditForm
            slug={slug}
            tire={tire}
            depots={depots}
            onSaved={(updated) => {
              setTire(updated);
              setEditing(false);
            }}
          />
        ) : (
          <Flex wrap="wrap" gap="4">
            <InfoField label="Brand" value={tire.brand} />
            <InfoField label="Model" value={tire.model} />
            <InfoField label="Size" value={sizeLabel} />
            <InfoField label="Load index" value={tire.loadIndex ?? '-'} />
            <InfoField label="Speed rating" value={tire.speedRating ?? '-'} />
            <InfoField label="DOT code" value={tire.dotCode ?? '-'} />
            <InfoField label="Purchase date" value={formatDate(tire.purchaseDate)} />
            <InfoField label="Initial tread depth" value={`${tire.initialTreadDepth} mm`} />
            <InfoField
              label="Expected mileage"
              value={
                tire.expectedMileageLifespan
                  ? `${formatInteger(tire.expectedMileageLifespan)} km`
                  : '-'
              }
            />
            <InfoField label="Retreading count" value={String(tire.retreadingCount)} />
            <InfoField label="Lifecycle #" value={String(tire.currentLifecycleNumber)} />
            <InfoField label="Created" value={formatDateTime(tire.createdAt)} />
            <InfoField label="Updated" value={formatDateTime(tire.updatedAt)} />
          </Flex>
        )}
      </SectionCard>

      <SectionCard title="Status & Location" icon={MapPin}>
        <Flex gap="4" align="center" wrap="wrap">
          <StatusBadge kind="tire" status={tire.status} />
          {tire.currentVehicle ? (
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Mounted on
              </Text>
              <Text size="2" color="gray">
                {tire.currentVehicle.licensePlate} - position {tire.currentVehicle.position}
              </Text>
            </Flex>
          ) : tire.depot ? (
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Depot
              </Text>
              <Text size="2" color="gray">
                {tire.depot.name}
              </Text>
            </Flex>
          ) : null}
        </Flex>
      </SectionCard>

      <SectionCard
        title="Tire Set"
        icon={Layers}
        actions={
          tireSet && canManage ? (
            <Button
              variant="soft"
              color="gray"
              size="1"
              onClick={handleRemoveFromSet}
              loading={removingFromSet}
            >
              Remove from set
            </Button>
          ) : undefined
        }
      >
        {tireSet === undefined ? (
          <Text size="2" color="gray">
            Loading...
          </Text>
        ) : tireSet ? (
          <Text size="2">{tireSet.name}</Text>
        ) : (
          <Text size="2" color="gray">
            Not part of a set.
          </Text>
        )}
      </SectionCard>

      <SectionCard title="Usage" icon={BarChart2}>
        <Flex gap="3" align="center" wrap="wrap">
          <StatusBadge
            kind="usage"
            percentage={tire.usagePercentage}
            status={tire.usageStatus}
            isEstimated={tire.usageIsEstimated}
          />
          {tire.accumulatedMileage > 0 && (
            <Text size="2" color="gray">
              {formatInteger(tire.accumulatedMileage)} km accumulated
            </Text>
          )}
          {tire.latestTreadDepth !== null && (
            <Text size="2" color="gray">
              Latest tread: {tire.latestTreadDepth} mm
            </Text>
          )}
        </Flex>
        {tire.usagePercentage === null && (
          <Callout.Root color="gray" size="1">
            <Callout.Text>
              Usage data will appear after the first inspection or daily algorithm run.
            </Callout.Text>
          </Callout.Root>
        )}
        {usageBreakdownError && (
          <Callout.Root color="orange" size="1">
            <Callout.Text>{usageBreakdownError}</Callout.Text>
          </Callout.Root>
        )}
        {usageBreakdown && (
          <Flex direction="column" gap="3">
            {usageBreakdown.appliedOverride && (
              <Callout.Root color="orange" size="1">
                <Callout.Text>{overrideLabels[usageBreakdown.appliedOverride]}</Callout.Text>
              </Callout.Root>
            )}
            <Flex wrap="wrap" gap="4">
              <InfoField
                label="Tread factor"
                value={`${formatFactorValue(usageBreakdown.factors.tread.value)} at ${formatWeight(usageBreakdown.factors.tread.weight)}`}
              />
              <InfoField
                label="Mileage factor"
                value={`${formatFactorValue(usageBreakdown.factors.mileage.value)} at ${formatWeight(usageBreakdown.factors.mileage.weight)}`}
              />
              <InfoField
                label="Age factor"
                value={`${formatFactorValue(usageBreakdown.factors.age.value)} at ${formatWeight(usageBreakdown.factors.age.weight)}`}
              />
              <InfoField
                label="Condition factor"
                value={`${formatFactorValue(usageBreakdown.factors.condition.value)} at ${formatWeight(usageBreakdown.factors.condition.weight)}`}
              />
            </Flex>
            {usageBreakdown.isEstimated && (
              <Text size="2" color="gray">
                Tread usage is estimated because the last detailed inspection is stale.
              </Text>
            )}
          </Flex>
        )}
      </SectionCard>

      <Dialog.Root open={disposeOpen} onOpenChange={setDisposeOpen}>
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Dispose tire</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            This will mark the tire as disposed and archive it. This action cannot be undone.
            <br />
            <strong>
              {tire.brand} {tire.model}
            </strong>{' '}
            - {sizeLabel}
          </Dialog.Description>
          {disposeError && (
            <Callout.Root color="red" size="1" mb="3">
              <Callout.Text>{disposeError}</Callout.Text>
            </Callout.Root>
          )}
          <Flex gap="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button color="red" onClick={handleDispose} loading={disposing}>
              <Trash2 size={14} />
              Confirm dispose
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
