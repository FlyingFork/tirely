'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps, FilterDef } from '@/components/data-table';
import { formatDateTime } from '@/lib/format';
import { Badge, Code, Flex, Text } from '@radix-ui/themes';
import { AuditAction } from '@tirely/database/client-types';
import type { ApiAuditLog } from '@tirely/types';

const ENTITY_TYPES = [
  'CompanyRequest',
  'Company',
  'User',
  'Vehicle',
  'Tire',
  'MaintenanceEvent',
  'Inspection',
];

const formatActionLabel = (action: string): string => {
  const lower = action.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const columns: ColumnDef<ApiAuditLog>[] = [
  {
    key: 'createdAt',
    label: 'Time',
    sortable: true,
    render: (log) => (
      <Text size="2" color="gray">
        {formatDateTime(log.createdAt)}
      </Text>
    ),
  },
  {
    key: 'action',
    label: 'Action',
    render: (log) => (
      <Badge color="gray" size="1">
        {formatActionLabel(log.action)}
      </Badge>
    ),
  },
  {
    key: 'actor',
    label: 'Actor',
    render: (log) =>
      log.actor ? (
        <Text size="2">{log.actor.email}</Text>
      ) : (
        <Text size="2" color="gray">
          —
        </Text>
      ),
  },
  {
    key: 'entity',
    label: 'Entity',
    render: (log) =>
      log.entityType ? (
        <Flex direction="column" gap="1">
          <Text size="2">{log.entityType}</Text>
          {log.entityId && (
            <Code size="1" variant="soft">
              {log.entityId}
            </Code>
          )}
        </Flex>
      ) : (
        <Text size="2" color="gray">
          —
        </Text>
      ),
  },
  {
    key: 'ipAddress',
    label: 'IP',
    render: (log) => {
      const hideIp = typeof log.action === 'string' && log.action.startsWith('COMPANY_');
      return (
        <Text size="2" color="gray">
          {hideIp ? '—' : (log.ipAddress ?? '—')}
        </Text>
      );
    },
  },
];

const filters: FilterDef[] = [
  {
    key: 'action',
    label: 'Action',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All actions' },
      ...Object.values(AuditAction).map((a) => ({ value: a, label: formatActionLabel(a) })),
    ],
    defaultValue: 'ALL',
  },
  {
    key: 'entityType',
    label: 'Entity',
    type: 'select',
    options: [
      { value: 'ALL', label: 'All entities' },
      ...ENTITY_TYPES.map((e) => ({ value: e, label: e })),
    ],
    defaultValue: 'ALL',
  },
];

interface AuditLogsTableProps {
  fetchData: DataTableProps<ApiAuditLog>['fetchData'];
}

export function AuditLogsTable({ fetchData }: AuditLogsTableProps) {
  return (
    <DataTable
      columns={columns}
      filters={filters}
      searchPlaceholder="Search by entity ID or details..."
      fetchData={fetchData}
      defaultSort={{ field: 'createdAt', direction: 'desc' }}
      perPage={10}
      getRowKey={(log) => log.id}
    />
  );
}
