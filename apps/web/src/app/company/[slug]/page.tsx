'use client';

import { useEffect, useState } from 'react';

import {
  Avatar,
  Card,
  Flex,
  Grid,
  Heading,
  Separator,
  Skeleton,
  Table,
  Text,
} from '@radix-ui/themes';
import { Building2, Gauge, Truck, Users, Warehouse } from 'lucide-react';
import { useParams } from 'next/navigation';
import type {
  ApiCompany,
  ApiCompanyUser,
  ApiDepot,
  ApiTireSummary,
  ApiVehicleListItem,
} from '@tirely/types';

import { InfoField } from '@/components/InfoField';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCompanyLoading } from '@/context/company-loading';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';

import styles from './overview.module.css';

interface CompanyWithUsers extends ApiCompany {
  users: ApiCompanyUser[];
}

interface ApiState {
  data: CompanyWithUsers | null;
  error: string | null;
}

interface CountsState {
  vehicles: number | null;
  tires: number | null;
  depots: number | null;
  loading: boolean;
}

export default function CompanyPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { setIsPageLoading } = useCompanyLoading();
  const [state, setState] = useState<ApiState>({ data: null, error: null });
  const [counts, setCounts] = useState<CountsState>({
    vehicles: null,
    tires: null,
    depots: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    setIsPageLoading(true);

    authRequest<CompanyWithUsers>(`/v1/company/${slug}`, { signal: controller.signal })
      .then((response) => {
        if (controller.signal.aborted) return;
        if ('code' in response) {
          setState({ data: null, error: response.message });
          return;
        }
        setState({ data: response.data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setState({ data: null, error: errorMessage });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsPageLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug, setIsPageLoading]);

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      authRequest<ApiVehicleListItem[]>(
        `/v1/company/${slug}/vehicles?${new URLSearchParams({
          page: '1',
          perPage: '1',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })}`,
        { signal: controller.signal },
      ),
      authRequest<ApiTireSummary[]>(
        `/v1/company/${slug}/tires?${new URLSearchParams({
          page: '1',
          perPage: '1',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })}`,
        { signal: controller.signal },
      ),
      authRequest<ApiDepot[]>(
        `/v1/company/${slug}/depots?${new URLSearchParams({
          page: '1',
          perPage: '1',
          sortBy: 'name',
          sortOrder: 'asc',
        })}`,
        { signal: controller.signal },
      ),
    ]).then(([vehiclesRes, tiresRes, depotsRes]) => {
      if (controller.signal.aborted) return;
      setCounts({
        vehicles: 'code' in vehiclesRes ? null : (vehiclesRes.meta?.total ?? null),
        tires: 'code' in tiresRes ? null : (tiresRes.meta?.total ?? null),
        depots: 'code' in depotsRes ? null : (depotsRes.meta?.total ?? null),
        loading: false,
      });
    });

    return () => controller.abort();
  }, [slug]);

  const { data, error } = state;

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return null;
  }

  const statTiles = [
    { label: 'Team members', value: data.users.length, icon: Users, loading: false },
    { label: 'Vehicles', value: counts.vehicles, icon: Truck, loading: counts.loading },
    { label: 'Tires', value: counts.tires, icon: Gauge, loading: counts.loading },
    { label: 'Depots', value: counts.depots, icon: Warehouse, loading: counts.loading },
  ];

  return (
    <Flex direction="column" gap="5">
      <PageHeader
        title={data.name}
        description={`/${data.slug}`}
        actions={<StatusBadge kind="company" status={data.status} />}
      />

      <div className={styles.statGrid}>
        {statTiles.map(({ label, value, icon: Icon, loading }) => (
          <Card key={label}>
            <div className={styles.statTile}>
              <div className={styles.statIconWrap}>
                <Icon size={16} />
              </div>
              {loading ? (
                <Skeleton width="48px" height="28px" />
              ) : (
                <span className={styles.statValue}>
                  {value !== null ? value.toLocaleString() : '—'}
                </span>
              )}
              <span className={styles.statLabel}>{label}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <Flex direction="column" gap="4" p="3">
          <div className={styles.sectionHeadingRow}>
            <div className={styles.sectionIconWrap}>
              <Building2 size={16} />
            </div>
            <Heading size="3">Company Information</Heading>
          </div>
          <Separator size="4" />
          <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
            <InfoField label="Contact Email" value={data.contactEmail} />
            <InfoField label="Contact Phone" value={data.contactPhone} />
            <InfoField label="Address" value={data.address} />
            <InfoField label="Created" value={formatDate(data.createdAt)} />
          </Grid>
        </Flex>
      </Card>

      <Card>
        <Flex direction="column" gap="4" p="3">
          <Flex justify="between" align="center">
            <div className={styles.sectionHeadingRow}>
              <div className={styles.sectionIconWrap}>
                <Users size={16} />
              </div>
              <Heading size="3">Team Members</Heading>
            </div>
            <Text size="2" color="gray">
              {data.users.length} {data.users.length === 1 ? 'member' : 'members'}
            </Text>
          </Flex>
          <Separator size="4" />
          {data.users.length === 0 ? (
            <EmptyState icon={Users} title="No team members yet" />
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Member</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {data.users.map((user) => (
                  <Table.Row key={user.id}>
                    <Table.Cell>
                      <div className={styles.userRow}>
                        <Avatar
                          size="1"
                          fallback={(user.name?.[0] ?? user.email[0] ?? 'U').toUpperCase()}
                          radius="full"
                        />
                        <Text size="2" weight="medium">
                          {user.name}
                        </Text>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2">{user.email}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge kind="role" role={user.role} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
