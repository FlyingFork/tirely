'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { CompanyUserInviteDialog } from '@/components/company/CompanyUserInviteDialog';
import { ConfirmActionDialog } from '@/components/company/ConfirmActionDialog';
import { DriverVehicleAssignmentDialog } from '@/components/company/DriverVehicleAssignmentDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiCompanyMember } from '@tirely/types';
import {
  Button,
  Dialog,
  DropdownMenu,
  Flex,
  Select,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { Car, MoreHorizontal, UserPlus } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useSession } from '@/lib/auth-client';

const COMPANY_ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'driver', label: 'Driver' },
] as const;

type CompanyRole = 'fleet_manager' | 'maintenance' | 'driver';

const buildCompanyUserParams = (query: {
  page: number;
  perPage: number;
  search?: string;
  role?: CompanyRole;
  active?: boolean;
}) => {
  const params = new URLSearchParams({
    page: String(query.page),
    perPage: String(query.perPage),
  });
  if (query.search) params.set('search', query.search);
  if (query.role) params.set('role', query.role);
  if (query.active !== undefined) params.set('active', String(query.active));
  return params;
};

const listCompanyUsers = (
  slug: string,
  query: Parameters<typeof buildCompanyUserParams>[0],
) => authRequest<ApiCompanyMember[]>(`/v1/company/${slug}/users?${buildCompanyUserParams(query)}`);

const updateCompanyUserRole = (slug: string, userId: string, role: CompanyRole) =>
  authRequest<{ id: string; role: string }>(`/v1/company/${slug}/users/${userId}/role`, {
    method: 'PATCH',
    body: { role },
  });

const setCompanyUserActive = (slug: string, userId: string, active: boolean) =>
  authRequest<{ id: string; active: boolean }>(`/v1/company/${slug}/users/${userId}/status`, {
    method: 'PATCH',
    body: { active },
  });

const FILTERS: FilterDef[] = [
  {
    key: 'role',
    label: 'Role',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All roles' },
      { value: 'fleet_manager', label: 'Fleet Manager' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'driver', label: 'Driver' },
    ],
  },
  {
    key: 'active',
    label: 'Status',
    type: 'segmented',
    options: [
      { value: 'ALL', label: 'All' },
      { value: 'true', label: 'Active' },
      { value: 'false', label: 'Deactivated' },
    ],
  },
];

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: ApiCompanyMember | null;
  slug: string;
  onSuccess: () => void;
}

function RoleDialog({ open, onOpenChange, user, slug, onSuccess }: RoleDialogProps) {
  const [role, setRole] = useState<CompanyRole>('driver');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next && user) setRole(user.role as CompanyRole);
    setError(null);
    onOpenChange(next);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const res = await updateCompanyUserRole(slug, user.id, role);
    setLoading(false);
    if ('code' in res) {
      setError(res.message);
      return;
    }
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Change role</Dialog.Title>
        <Dialog.Description>
          Update the role for <strong>{user?.name}</strong>.
        </Dialog.Description>
        <Flex direction="column" gap="3" mt="4">
          <Select.Root value={role} onValueChange={(v) => setRole(v as CompanyRole)}>
            <Select.Trigger />
            <Select.Content>
              {COMPANY_ROLES.map((r) => (
                <Select.Item key={r.value} value={r.value}>
                  {r.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          {error && <ErrorState message={error} />}
        </Flex>
        <Flex justify="end" gap="3" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Cancel
            </Button>
          </Dialog.Close>
          <Button onClick={handleSave} loading={loading}>
            Save
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function CompanyUsersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { data: session, isPending } = useSession();
  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<ApiCompanyMember | null>(null);
  const [assignmentTarget, setAssignmentTarget] = useState<ApiCompanyMember | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);
  const [tableKey, setTableKey] = useState(0);

  const refresh = useCallback(() => setTableKey((k) => k + 1), []);

  const fetchData: DataTableProps<ApiCompanyMember>['fetchData'] = useCallback(
    async (query) => {
      const activeFilter = query.filters.active;
      const active = activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined;

      const response = await listCompanyUsers(slug, {
        page: query.page,
        perPage: query.perPage,
        search: query.search,
        role: query.filters.role as CompanyRole | undefined,
        active,
      });

      if ('code' in response) throw new Error(response.message);

      return {
        data: response.data,
        total: response.meta?.total ?? 0,
      };
    },
    [slug],
  );

  const columns: ColumnDef<ApiCompanyMember>[] = [
    {
      key: 'name',
      label: 'Name / Email',
      render: (row) => (
        <Flex direction="column" gap="0">
          <Text size="2" weight="medium">
            {row.name}
          </Text>
          <Text size="1" color="gray">
            {row.email}
          </Text>
        </Flex>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (row) => <StatusBadge kind="role" role={row.role} />,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge kind="active" active={!row.banned} inactiveLabel="Deactivated" />
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row) => (
        <Text size="2" color="gray">
          {formatDate(row.createdAt)}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <RowActions
          row={row}
          slug={slug}
          onChangeRole={() => {
            setRoleTarget(row);
            setRoleOpen(true);
          }}
          onAssignVehicle={() => setAssignmentTarget(row)}
          onStatusToggled={refresh}
        />
      ),
    },
  ];

  if (isPending || !session || !canManage) return null;

  return (
    <Flex direction="column" gap="3">
      <PageHeader
        title="Users"
        description="Manage who has access to your company"
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus size={16} />
            Invite user
          </Button>
        }
      />

      <DataTable
        key={tableKey}
        columns={columns}
        filters={FILTERS}
        searchPlaceholder="Search by name or email"
        fetchData={fetchData}
        getRowKey={(row) => row.id}
        perPage={20}
      />

      <CompanyUserInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        slug={slug}
        onSuccess={refresh}
      />

      <RoleDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        user={roleTarget}
        slug={slug}
        onSuccess={refresh}
      />

      <DriverVehicleAssignmentDialog
        open={assignmentTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAssignmentTarget(null);
        }}
        slug={slug}
        driver={assignmentTarget}
        onAssigned={refresh}
      />
    </Flex>
  );
}

interface RowActionsProps {
  row: ApiCompanyMember;
  slug: string;
  onChangeRole: () => void;
  onAssignVehicle: () => void;
  onStatusToggled: () => void;
}

function RowActions({ row, slug, onChangeRole, onAssignVehicle, onStatusToggled }: RowActionsProps) {
  const [loading, setLoading] = useState(false);
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const { data: session } = useSession();
  const isSelf = row.id === session?.user?.id;

  const toggleStatus = async () => {
    setLoading(true);
    await setCompanyUserActive(slug, row.id, row.banned ?? false);
    setLoading(false);
    onStatusToggled();
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="ghost" color="gray" size="1" loading={loading} aria-label="Row actions">
          <MoreHorizontal size={16} />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {isSelf ? (
          <Tooltip content="You cannot change your own role">
            <DropdownMenu.Item disabled>Change role</DropdownMenu.Item>
          </Tooltip>
        ) : (
          <DropdownMenu.Item onSelect={onChangeRole}>Change role</DropdownMenu.Item>
        )}
        {row.role === 'driver' ? (
          <DropdownMenu.Item onSelect={onAssignVehicle}>
            <Car size={14} />
            Assign vehicle
          </DropdownMenu.Item>
        ) : null}
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          color={row.banned ? 'green' : 'red'}
          onSelect={() => setStatusConfirmOpen(true)}
        >
          {row.banned ? 'Reactivate' : 'Deactivate'}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
      <ConfirmActionDialog
        open={statusConfirmOpen}
        onOpenChange={setStatusConfirmOpen}
        title={row.banned ? 'Reactivate user' : 'Deactivate user'}
        description={
          row.banned
            ? `Restore access for ${row.name}?`
            : `Deactivate ${row.name}? They will lose company access.`
        }
        confirmLabel={row.banned ? 'Reactivate' : 'Deactivate'}
        color={row.banned ? 'green' : 'red'}
        onConfirm={toggleStatus}
      />
    </DropdownMenu.Root>
  );
}
