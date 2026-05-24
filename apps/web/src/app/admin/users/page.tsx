'use client';

import { authClient } from '@/lib/auth-client';
import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/format';
import type { AdminUser } from '@/types/admin';
import { Avatar, Badge, Flex, Text } from '@radix-ui/themes';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

const columns: ColumnDef<AdminUser>[] = [
  {
    key: 'name',
    label: 'User',
    render: (user) => (
      <Flex align="center" gap="2">
        <Avatar src={user.image ?? undefined} fallback={(user.name?.[0] || 'U').toUpperCase()} />
        <Text>{user.name || 'Unnamed User'}</Text>
      </Flex>
    ),
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
  {
    key: 'role',
    label: 'Role',
    render: (user) => <StatusBadge kind="role" role={user.role} />,
  },
  {
    key: 'banned',
    label: 'Status',
    render: (user) => (
      <Badge color={user.banned ? 'red' : 'green'}>{user.banned ? 'Banned' : 'Active'}</Badge>
    ),
  },
  {
    key: 'companyId',
    label: 'Company',
    render: (user) => user.companyId || '—',
  },
  {
    key: 'createdAt',
    label: 'Created At',
    sortable: true,
    render: (user) => formatDate(user.createdAt),
  },
];

const filters: FilterDef[] = [
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'admin', label: 'Admin' },
      { value: 'fleet_manager', label: 'Fleet Manager' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'driver', label: 'Driver' },
      { value: 'user', label: 'User' },
    ],
    defaultValue: 'ALL',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'active', label: 'Active' },
      { value: 'banned', label: 'Banned' },
    ],
    defaultValue: 'ALL',
  },
];

export default function AdminUsersPage() {
  const router = useRouter();

  const fetchData: DataTableProps<AdminUser>['fetchData'] = useCallback(async (query) => {
    const q: Record<string, unknown> = {
      limit: query.perPage,
      offset: (query.page - 1) * query.perPage,
    };

    if (query.sort) {
      q.sortBy = query.sort.field;
      q.sortDirection = query.sort.direction;
    }

    if (query.search) {
      q.searchValue = query.search;
      q.searchOperator = 'contains';
    }

    // better-auth supports only one filterField at a time; role takes priority
    if (query.filters.role && query.filters.role !== 'ALL') {
      q.filterField = 'role';
      q.filterValue = query.filters.role;
      q.filterOperator = 'eq';
    } else if (query.filters.status && query.filters.status !== 'ALL') {
      q.filterField = 'banned';
      q.filterValue = query.filters.status === 'banned';
      q.filterOperator = 'eq';
    }

    const result = await authClient.admin.listUsers({ query: q });
    if (result.error) throw new Error(result.error.message || 'Failed to load users');

    return {
      data: (result.data?.users ?? []) as AdminUser[],
      total: result.data?.total ?? 0,
    };
  }, []);

  return (
    <Flex direction="column" gap="3">
      <PageHeader title="Users" description="View and manage all user accounts" />

      <DataTable
        columns={columns}
        filters={filters}
        searchPlaceholder="Search users..."
        fetchData={fetchData}
        defaultSort={{ field: 'createdAt', direction: 'desc' }}
        perPage={10}
        getRowKey={(user) => user.id}
        onRowClick={(user) => router.push(`/admin/users/${user.id}`)}
      />
    </Flex>
  );
}
