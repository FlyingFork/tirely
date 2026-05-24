'use client';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { MountTireSetDialog } from '@/components/company/MountTireSetDialog';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useToast } from '@/components/ui/toast';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiTireSet, ApiTireSummary } from '@tirely/types';
import {
  tireSetCreateSchema,
  tireSetUpdateSchema,
  type TireSetCreateInput,
  type TireSetUpdateInput,
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
  ScrollArea,
  Separator,
  Text,
  TextField,
} from '@radix-ui/themes';
import { Archive, Layers, Pencil, Plus, Truck } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type SelectableTire = Pick<
  ApiTireSummary,
  'id' | 'brand' | 'model' | 'width' | 'aspectRatio' | 'rimDiameter'
> & {
  depot?: { id: string; name: string } | null;
};

function sizeLabel(tire: Pick<SelectableTire, 'width' | 'aspectRatio' | 'rimDiameter'>) {
  return `${tire.width}/${tire.aspectRatio}R${tire.rimDiameter}`;
}

function hasMixedSizes(tires: SelectableTire[]): boolean {
  if (tires.length < 2) return false;
  const first = sizeLabel(tires[0]!);
  return tires.some((tire) => sizeLabel(tire) !== first);
}

function mergeTires(available: SelectableTire[], current: SelectableTire[] = []) {
  const byId = new Map<string, SelectableTire>();
  for (const tire of current) byId.set(tire.id, tire);
  for (const tire of available) byId.set(tire.id, tire);
  return Array.from(byId.values());
}

const createTireSet = (slug: string, body: TireSetCreateInput) =>
  authRequest<ApiTireSet>(`/v1/company/${slug}/tire-sets`, { method: 'POST', body });

const updateTireSet = (slug: string, id: string, body: TireSetUpdateInput) =>
  authRequest<ApiTireSet>(`/v1/company/${slug}/tire-sets/${id}`, { method: 'PATCH', body });

const listTireSets = (slug: string, signal?: AbortSignal) =>
  authRequest<ApiTireSet[]>(`/v1/company/${slug}/tire-sets`, { signal });

const listTires = (slug: string) =>
  authRequest<ApiTireSummary[]>(
    `/v1/company/${slug}/tires?${new URLSearchParams({
      page: '1',
      perPage: '200',
      status: 'IN_STOCK',
      sortBy: 'brand',
      sortOrder: 'asc',
    })}`,
  );

const dissolveTireSet = (slug: string, id: string) =>
  authRequest<{ ok: true }>(`/v1/company/${slug}/tire-sets/${id}`, { method: 'DELETE' });

type TireSetFieldsProps = {
  tires: SelectableTire[];
  tiresLoading: boolean;
};

function TireSetFields({ tires, tiresLoading }: TireSetFieldsProps) {
  return (
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

      <Separator size="4" />

      <FormField name="tireIds" label="Select tires" required>
        {(field) => {
          const selectedIds = (field.value ?? []) as string[];
          const selectedTires = tires.filter((tire) => selectedIds.includes(tire.id));

          const toggleTire = (id: string) => {
            field.onChange(
              selectedIds.includes(id)
                ? selectedIds.filter((selectedId) => selectedId !== id)
                : [...selectedIds, id],
            );
          };

          return (
            <Flex direction="column" gap="2">
              <Text size="1" color="gray">
                {selectedIds.length} selected
              </Text>
              {tiresLoading ? (
                <Text size="2" color="gray">
                  Loading tires...
                </Text>
              ) : tires.length === 0 ? (
                <Text size="2" color="gray">
                  No in-stock tires available.
                </Text>
              ) : (
                <ScrollArea style={{ maxHeight: 260 }}>
                  <Flex direction="column" gap="1">
                    {tires.map((tire) => (
                      <Box
                        key={tire.id}
                        style={{
                          cursor: 'pointer',
                          padding: '8px 6px',
                          borderRadius: 'var(--radius-2)',
                        }}
                        onClick={() => toggleTire(tire.id)}
                      >
                        <Flex align="center" gap="2">
                          <Checkbox
                            checked={selectedIds.includes(tire.id)}
                            onCheckedChange={() => toggleTire(tire.id)}
                          />
                          <Text size="2">
                            {tire.brand} {tire.model} - {sizeLabel(tire)}
                            {tire.depot ? ` - ${tire.depot.name}` : ''}
                          </Text>
                        </Flex>
                      </Box>
                    ))}
                  </Flex>
                </ScrollArea>
              )}

              {hasMixedSizes(selectedTires) && (
                <Callout.Root color="orange" size="1">
                  <Callout.Text>
                    Tires in this set have different sizes. You can still save.
                  </Callout.Text>
                </Callout.Root>
              )}
            </Flex>
          );
        }}
      </FormField>
    </Flex>
  );
}

type CreateDialogProps = {
  slug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tires: SelectableTire[];
  tiresLoading: boolean;
  onCreated: () => void;
};

function CreateTireSetDialog({
  slug,
  open,
  onOpenChange,
  tires,
  tiresLoading,
  onCreated,
}: CreateDialogProps) {
  const { toast } = useToast();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Create tire set</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Name the set and pick the tires to include.
        </Dialog.Description>

        <Form
          schema={tireSetCreateSchema}
          defaultValues={{ name: '', tireIds: [] }}
          onSubmit={async (values, { setError }) => {
            const res = await createTireSet(slug, values);
            if ('code' in res) {
              setError('root.serverError', { message: res.message });
              return;
            }

            toast({ title: 'Tire set created', variant: 'success' });
            onOpenChange(false);
            onCreated();
          }}
        >
          <Flex direction="column" gap="3">
            <TireSetFields tires={tires} tiresLoading={tiresLoading} />
            <FormErrorState />
            <Flex gap="2" justify="end">
              <Dialog.Close>
                <Button type="button" variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <SubmitButton disabled={tiresLoading}>Create set</SubmitButton>
            </Flex>
          </Flex>
        </Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

type EditDialogProps = {
  slug: string;
  set: ApiTireSet | null;
  onClose: () => void;
  tires: SelectableTire[];
  tiresLoading: boolean;
  onUpdated: () => void;
};

function EditTireSetDialog({ slug, set, onClose, tires, tiresLoading, onUpdated }: EditDialogProps) {
  const { toast } = useToast();

  return (
    <Dialog.Root
      open={set !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>Edit tire set</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Update the set name or tire membership.
        </Dialog.Description>

        {set && (
          <Form
            key={set.id}
            schema={tireSetUpdateSchema}
            defaultValues={{
              name: set.name,
              tireIds: set.tires.map((tire) => tire.id),
            }}
            onSubmit={async (values: TireSetUpdateInput, { setError }) => {
              const res = await updateTireSet(slug, set.id, values);
              if ('code' in res) {
                setError('root.serverError', { message: res.message });
                return;
              }

              toast({ title: 'Tire set updated', variant: 'success' });
              onClose();
              onUpdated();
            }}
          >
            <Flex direction="column" gap="3">
              <TireSetFields tires={tires} tiresLoading={tiresLoading} />
              <FormErrorState />
              <Flex gap="2" justify="end">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <SubmitButton disabled={tiresLoading}>Save changes</SubmitButton>
              </Flex>
            </Flex>
          </Form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function TireSetsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session, isPending } = useSession();
  const { toast } = useToast();

  const canAccess =
    session?.user.role === 'admin' ||
    session?.user.role === 'fleet_manager' ||
    session?.user.role === 'maintenance';
  const canManage = canAccess;

  const [sets, setSets] = useState<ApiTireSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ApiTireSet | null>(null);
  const [availableTires, setAvailableTires] = useState<SelectableTire[]>([]);
  const [tiresLoading, setTiresLoading] = useState(false);
  const [dissolveTarget, setDissolveTarget] = useState<ApiTireSet | null>(null);
  const [mountTarget, setMountTarget] = useState<ApiTireSet | null>(null);
  const [dissolving, setDissolving] = useState(false);

  const loadSets = useCallback(
    async (signal?: AbortSignal) => {
      if (!canAccess) return;
      const res = await listTireSets(slug, signal);
      if ('code' in res) {
        setLoadError(res.message);
        setLoading(false);
        return;
      }

      setLoadError(null);
      setSets(res.data);
      setLoading(false);
    },
    [canAccess, slug],
  );

  const loadAvailableTires = useCallback(
    async (current: SelectableTire[] = []) => {
      setTiresLoading(true);
      const res = await listTires(slug);
      setTiresLoading(false);

      if ('code' in res) {
        toast({ title: res.message, variant: 'error' });
        setAvailableTires(mergeTires([], current));
        return;
      }

      setAvailableTires(mergeTires(res.data, current));
    },
    [slug, toast],
  );

  useEffect(() => {
    if (isPending || !canAccess) return;
    setLoading(true);
    const controller = new AbortController();
    loadSets(controller.signal);
    return () => controller.abort();
  }, [canAccess, isPending, loadSets]);

  if (isPending || !session || !canAccess) return null;

  const openCreate = () => {
    setCreateOpen(true);
    loadAvailableTires();
  };

  const openEdit = (set: ApiTireSet) => {
    setEditTarget(set);
    loadAvailableTires(set.tires);
  };

  const handleDissolve = async () => {
    if (!dissolveTarget) return;
    setDissolving(true);
    const res = await dissolveTireSet(slug, dissolveTarget.id);
    setDissolving(false);

    if ('code' in res) {
      toast({ title: res.message, variant: 'error' });
      return;
    }

    setDissolveTarget(null);
    toast({ title: 'Tire set dissolved', variant: 'success' });
    loadSets();
  };

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title="Tire sets"
        description="Group in-stock tires into reusable sets."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus size={14} />
              Create set
            </Button>
          ) : null
        }
      />

      {loadError && <ErrorState message={loadError} onRetry={() => loadSets()} />}

      {loading ? (
        <Flex align="center" justify="center" style={{ minHeight: 160 }}>
          <Text color="gray">Loading...</Text>
        </Flex>
      ) : sets.length === 0 ? (
        <EmptyState icon={Layers} title="No tire sets yet" />
      ) : (
        <Flex direction="column" gap="3">
          {sets.map((set) => (
            <Card key={set.id}>
              <Flex justify="between" align="start" p="2" gap="4" wrap="wrap">
                <Flex direction="column" gap="2" style={{ flex: 1, minWidth: 0 }}>
                  <Flex align="center" gap="2" wrap="wrap">
                    <Text size="3" weight="bold">
                      {set.name}
                    </Text>
                    <Badge variant="soft" color="gray" size="1">
                      {set.tires.length} tire{set.tires.length !== 1 ? 's' : ''}
                    </Badge>
                  </Flex>
                  <Flex gap="2" wrap="wrap">
                    {set.tires.map((tire) => (
                      <Badge key={tire.id} variant="outline" color="cyan" size="1">
                        {tire.brand} {tire.model} - {sizeLabel(tire)}
                      </Badge>
                    ))}
                  </Flex>
                </Flex>
                {canManage && (
                  <Flex gap="2" wrap="wrap">
                    <Button variant="soft" size="1" onClick={() => setMountTarget(set)}>
                      <Truck size={14} />
                      Mount
                    </Button>
                    <Button variant="soft" color="gray" size="1" onClick={() => openEdit(set)}>
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      color="gray"
                      size="1"
                      onClick={() => setDissolveTarget(set)}
                    >
                      <Archive size={14} />
                      Dissolve
                    </Button>
                  </Flex>
                )}
              </Flex>
            </Card>
          ))}
        </Flex>
      )}

      <CreateTireSetDialog
        slug={slug}
        open={createOpen}
        onOpenChange={setCreateOpen}
        tires={availableTires}
        tiresLoading={tiresLoading}
        onCreated={() => loadSets()}
      />

      <EditTireSetDialog
        slug={slug}
        set={editTarget}
        onClose={() => setEditTarget(null)}
        tires={availableTires}
        tiresLoading={tiresLoading}
        onUpdated={() => loadSets()}
      />

      <MountTireSetDialog
        open={mountTarget !== null}
        onOpenChange={(open) => {
          if (!open) setMountTarget(null);
        }}
        slug={slug}
        tireSet={mountTarget}
        onMounted={() => loadSets()}
      />

      <Dialog.Root
        open={dissolveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDissolveTarget(null);
        }}
      >
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Dissolve tire set</Dialog.Title>
          <Dialog.Description size="2" mb="4">
            This will remove all tires from <strong>{dissolveTarget?.name}</strong> and delete the
            set. The tires themselves will not be affected.
          </Dialog.Description>
          <Flex gap="2" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button color="red" onClick={handleDissolve} loading={dissolving}>
              <Archive size={14} />
              Dissolve
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
