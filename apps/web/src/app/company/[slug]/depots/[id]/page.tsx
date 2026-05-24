'use client';

import { InfoField } from '@/components/InfoField';
import { ConfirmActionDialog } from '@/components/company/ConfirmActionDialog';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiDepot, ApiVehicleListItem } from '@tirely/types';
import { depotUpdateSchema } from '@tirely/validators';
import {
  Box,
  Button,
  Card,
  Flex,
  Heading,
  Separator,
  Table,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import { ArrowLeft, Gauge, Pencil, Truck, X } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const fetchDepot = (slug: string, id: string, signal?: AbortSignal) =>
  authRequest<ApiDepot>(`/v1/company/${slug}/depots/${id}`, { signal });

const listDepotVehicles = (slug: string, depotId: string, signal?: AbortSignal) =>
  authRequest<ApiVehicleListItem[]>(
    `/v1/company/${slug}/vehicles?${new URLSearchParams({
      depotId,
      page: '1',
      perPage: '100',
      sortBy: 'licensePlate',
      sortOrder: 'asc',
    })}`,
    { signal },
  );

const setDepotArchived = (slug: string, id: string, archived: boolean) =>
  authRequest<ApiDepot>(`/v1/company/${slug}/depots/${id}/archive`, {
    method: 'PATCH',
    body: { archived },
  });

export default function DepotDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter();

  const [depot, setDepot] = useState<ApiDepot | null>(null);
  const [editing, setEditing] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [vehicles, setVehicles] = useState<ApiVehicleListItem[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);

  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  const load = useCallback(
    async (signal?: AbortSignal) => {
      const res = await fetchDepot(slug, id, signal);
      if ('code' in res) return;
      setDepot(res.data);
    },
    [slug, id],
  );

  const loadVehicles = useCallback(
    async (signal?: AbortSignal) => {
      setVehiclesLoading(true);
      const res = await listDepotVehicles(slug, id, signal);
      setVehiclesLoading(false);
      if ('code' in res) return;
      setVehicles(res.data);
    },
    [slug, id],
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    loadVehicles(controller.signal);
    return () => controller.abort();
  }, [load, loadVehicles]);

  const startEdit = () => {
    if (!depot) return;
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleArchive = async (archived: boolean) => {
    if (!depot) return;
    setArchiving(true);
    const res = await setDepotArchived(slug, depot.id, archived);
    setArchiving(false);
    if ('code' in res) {
      toast({ title: res.message, variant: 'error' });
      return;
    }
    setDepot({ ...depot, archived });
    toast({
      title: archived ? 'Depot archived' : 'Depot unarchived',
      variant: 'success',
    });
  };

  if (!depot) return null;

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Button variant="ghost" color="gray" asChild>
          <Link href={`/company/${slug}/depots`}>
            <ArrowLeft size={16} />
            Back to depots
          </Link>
        </Button>
      </Flex>

      <PageHeader
        title={depot.name}
        description={`${depot.vehicleCount ?? 0} vehicle${depot.vehicleCount !== 1 ? 's' : ''} assigned`}
        actions={
          <>
            {depot.archived && (
              <StatusBadge kind="active" active={false} inactiveLabel="Archived" />
            )}
            {canManage && !editing && (
              <>
              <Button variant="soft" asChild>
                <Link href={`/company/${slug}/vehicles/new?depotId=${depot.id}`}>
                  <Truck size={14} />
                  Add vehicle
                </Link>
              </Button>
              <Button variant="soft" asChild>
                <Link href={`/company/${slug}/tires/new?depotId=${depot.id}`}>
                  <Gauge size={14} />
                  Add tires
                </Link>
              </Button>
              <Button variant="soft" onClick={startEdit}>
                <Pencil size={14} />
                Edit
              </Button>
              </>
            )}
            {canManage && (
              <Button
                variant="soft"
                color={depot.archived ? 'green' : 'red'}
                onClick={() => setArchiveConfirmOpen(true)}
                loading={archiving}
              >
                {depot.archived ? 'Unarchive' : 'Archive'}
              </Button>
            )}
          </>
        }
      />

      <Card>
        <Flex direction="column" gap="4" p="2">
          {editing ? (
            <Form
              schema={depotUpdateSchema}
              defaultValues={{
                name: depot.name,
                address: depot.address ?? undefined,
                contactInfo: depot.contactInfo ?? undefined,
              }}
              onSubmit={async (values, { setError }) => {
                const res = await authRequest<ApiDepot>(`/v1/company/${slug}/depots/${depot.id}`, {
                  method: 'PATCH',
                  body: {
                    name: values.name?.trim(),
                    ...(values.address?.trim() ? { address: values.address.trim() } : {}),
                    ...(values.contactInfo?.trim()
                      ? { contactInfo: values.contactInfo.trim() }
                      : {}),
                  },
                });
                if ('code' in res) {
                  setError('root.serverError', { message: res.message });
                  return;
                }
                setDepot({ ...depot, ...res.data });
                setEditing(false);
                toast({ title: 'Depot updated', variant: 'success' });
              }}
            >
              <Flex direction="column" gap="4">
                <FormField name="name" label="Name" required>
                  {(field) => <TextField.Root {...field} size="3" />}
                </FormField>

                <FormField name="address" label="Address">
                  {(field) => <TextArea {...field} value={(field.value as string | undefined) ?? ''} rows={3} size="3" />}
                </FormField>

                <FormField name="contactInfo" label="Contact info">
                  {(field) => <TextArea {...field} value={(field.value as string | undefined) ?? ''} rows={3} size="3" />}
                </FormField>

                <FormErrorState />

                <Flex gap="2">
                  <SubmitButton>Save</SubmitButton>
                  <Button variant="soft" color="gray" onClick={cancelEdit}>
                    <X size={14} />
                    Cancel
                  </Button>
                </Flex>
              </Flex>
            </Form>
          ) : (
            <>
              <InfoField label="Name" value={depot.name} />
              <Separator size="4" />
              <InfoField label="Address" value={depot.address} />
              <Separator size="4" />
              <InfoField label="Contact info" value={depot.contactInfo} />
              <Separator size="4" />
              <Flex gap="6">
                <InfoField label="Created" value={formatDateTime(depot.createdAt)} />
                <InfoField label="Last updated" value={formatDateTime(depot.updatedAt)} />
              </Flex>
            </>
          )}
        </Flex>
      </Card>

      <Box mt="2">
        <Heading size="4" mb="3">
          Assigned vehicles
        </Heading>
        {vehiclesLoading ? (
          <Text color="gray" size="2">Loading...</Text>
        ) : vehicles.length === 0 ? (
          <Text color="gray" size="2">No vehicles assigned to this depot.</Text>
        ) : (
          <Table.Root variant="surface" size="2">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>License plate</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Make / Model / Year</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Driver</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {vehicles.map((v) => (
                <Table.Row
                  key={v.id}
                  align="center"
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/company/${slug}/vehicles/${v.id}`)}
                >
                  <Table.RowHeaderCell>
                    <Flex align="center" gap="2">
                      <Text size="2" weight="medium" color={v.archived ? 'gray' : undefined}>
                        {v.licensePlate}
                      </Text>
                      {v.archived && (
                        <StatusBadge kind="active" active={false} inactiveLabel="Archived" />
                      )}
                    </Flex>
                  </Table.RowHeaderCell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {v.make} {v.model} ({v.year})
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="2" color="gray">
                      {v.assignedDriver?.name ?? '—'}
                    </Text>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </Box>

      <ConfirmActionDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={depot.archived ? 'Unarchive depot' : 'Archive depot'}
        description={
          depot.archived
            ? `Make ${depot.name} available for fleet workflows again?`
            : `Archive ${depot.name}? It will be hidden from active depot lists.`
        }
        confirmLabel={depot.archived ? 'Unarchive' : 'Archive'}
        color={depot.archived ? 'green' : 'red'}
        onConfirm={() => handleArchive(!depot.archived)}
      />
    </Flex>
  );
}
