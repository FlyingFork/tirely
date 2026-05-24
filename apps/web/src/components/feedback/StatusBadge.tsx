import { Badge, type BadgeProps } from '@radix-ui/themes';
import type { CompanyStatus, MaintenanceType, TireStatus } from '@tirely/database';
import type { ApiCompanyRequestStatus, ApiUsageStatus, UserRole } from '@tirely/types';

import {
  companyStatusColor,
  catalogEntryStatusColor,
  maintenanceTypeColor,
  maintenanceTypeLabel,
  requestStatusColor,
  ROLE_COLORS,
  ROLE_LABELS,
  tireStatusColor,
  tireStatusLabel,
  usageBucketColor,
  usageBucketLabel,
} from '@/lib/display';

type BadgeColor = BadgeProps['color'];

export type StatusBadgeProps =
  | { kind: 'request'; status: ApiCompanyRequestStatus['status'] }
  | { kind: 'catalog'; status: string }
  | { kind: 'company'; status: CompanyStatus }
  | { kind: 'tire'; status: TireStatus }
  | { kind: 'role'; role: UserRole | string | null | undefined }
  | { kind: 'active'; active: boolean; activeLabel?: string; inactiveLabel?: string }
  | { kind: 'maintenanceType'; type: MaintenanceType }
  | {
      kind: 'usage';
      percentage: number | null;
      status: ApiUsageStatus | string | null;
      isEstimated?: boolean;
    };

export function StatusBadge(props: StatusBadgeProps) {
  switch (props.kind) {
    case 'request':
      return (
        <Badge color={requestStatusColor(props.status)} variant="soft">
          {props.status}
        </Badge>
      );
    case 'company':
      return (
        <Badge color={companyStatusColor(props.status)} variant="soft">
          {props.status}
        </Badge>
      );
    case 'catalog':
      return (
        <Badge color={catalogEntryStatusColor(props.status)} variant="soft">
          {props.status}
        </Badge>
      );
    case 'tire':
      return (
        <Badge color={tireStatusColor(props.status)} variant="soft">
          {tireStatusLabel(props.status)}
        </Badge>
      );
    case 'role': {
      const role = props.role ?? 'user';
      return (
        <Badge color={(ROLE_COLORS[role] ?? 'gray') as BadgeColor} variant="soft">
          {ROLE_LABELS[role] ?? role}
        </Badge>
      );
    }
    case 'active':
      return (
        <Badge color={props.active ? 'green' : 'red'} variant="soft">
          {props.active ? (props.activeLabel ?? 'Active') : (props.inactiveLabel ?? 'Inactive')}
        </Badge>
      );
    case 'maintenanceType':
      return (
        <Badge color={maintenanceTypeColor(props.type) as BadgeColor} variant="soft">
          {maintenanceTypeLabel(props.type)}
        </Badge>
      );
    case 'usage':
      if (props.percentage === null || props.status === null) {
        return (
          <Badge color="gray" variant="soft">
            -
          </Badge>
        );
      }
      return (
        <Badge color={usageBucketColor(props.status)} variant="soft">
          {Math.round(props.percentage)}% {usageBucketLabel(props.status)}
          {props.isEstimated ? ' (est.)' : ''}
        </Badge>
      );
  }
}
