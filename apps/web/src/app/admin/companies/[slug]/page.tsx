'use client';

import { InfoField } from '@/components/InfoField';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { useAdminLoading } from '@/context/admin-loading';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiCompany, ApiCompanyUser } from '@tirely/types';
import {
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Link,
  Select,
  Separator,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ArrowLeft, Building2, ExternalLink, Search, Users } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

interface CompanyWithUsers extends ApiCompany {
  users: ApiCompanyUser[];
}

interface ApiState {
  data: CompanyWithUsers | null;
  error: string | null;
}

export default function AdminCompanyDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { setIsPageLoading } = useAdminLoading();
  const [state, setState] = useState<ApiState>({ data: null, error: null });
  const [memberSearch, setMemberSearch] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('ALL');

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

  const { data, error } = state;

  const filteredUsers = useMemo(() => {
    if (!data) return [];
    return data.users.filter((u) => {
      const q = memberSearch.toLowerCase();
      const matchesSearch =
        !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = memberRoleFilter === 'ALL' || u.role === memberRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [data, memberSearch, memberRoleFilter]);

  if (error) {
    return (
      <Flex direction="column" gap="4">
        <ErrorState message={error} />
        <Button asChild variant="ghost" color="gray" style={{ alignSelf: 'flex-start' }}>
          <Link underline="none" href="/admin/companies">
            <ArrowLeft size={16} /> Go back
          </Link>
        </Button>
      </Flex>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Flex direction="column" gap="5">
      <PageHeader
        title={data.name}
        description={`/${data.slug}`}
        actions={
          <>
            <StatusBadge kind="company" status={data.status} />
            <Button asChild>
              <Link underline="none" href={`/company/${data.slug}`}>
                <ExternalLink size={16} /> Open company workspace
              </Link>
            </Button>
            <Button asChild variant="ghost" color="gray">
              <Link underline="none" href="/admin/companies">
                <ArrowLeft size={16} /> Back
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard title="Company Information" icon={Building2}>
        <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
          <InfoField label="Contact Email" value={data.contactEmail} />
          <InfoField label="Contact Phone" value={data.contactPhone} />
          <InfoField label="Address" value={data.address} />
          <InfoField label="Created" value={formatDate(data.createdAt)} />
        </Grid>
      </SectionCard>

      <Card>
        <Flex direction="column" gap="4" p="3">
          <Flex justify="between" align="center">
            <Heading size="3">Team Members</Heading>
            <Text size="2" color="gray">
              {data.users.length} {data.users.length === 1 ? 'member' : 'members'}
            </Text>
          </Flex>
          <Flex gap="3" wrap="wrap">
            <TextField.Root
              placeholder="Search by name or email..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              style={{ flex: 1, minWidth: 200 }}
            >
              <TextField.Slot>
                <Search size={14} />
              </TextField.Slot>
            </TextField.Root>
            <Select.Root value={memberRoleFilter} onValueChange={setMemberRoleFilter}>
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="ALL">All roles</Select.Item>
                <Select.Item value="fleet_manager">Fleet Manager</Select.Item>
                <Select.Item value="maintenance">Maintenance</Select.Item>
                <Select.Item value="driver">Driver</Select.Item>
                <Select.Item value="admin">Admin</Select.Item>
                <Select.Item value="user">User</Select.Item>
              </Select.Content>
            </Select.Root>
          </Flex>
          <Separator size="4" />
          {data.users.length === 0 ? (
            <EmptyState icon={Users} title="No team members yet" />
          ) : filteredUsers.length === 0 ? (
            <EmptyState icon={Search} title="No members match your filters" />
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredUsers.map((user) => (
                  <Table.Row
                    key={user.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => router.push(`/admin/users/${user.id}`)}
                  >
                    <Table.Cell>
                      <Text size="2" weight="medium">
                        {user.name}
                      </Text>
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
