'use client';

import { usageBucketColor } from '@/lib/display';
import { CHART_BUCKET, CHART_COLORS } from '@/lib/chart-colors';

export type TireSlotData = {
  id: string;
  brand: string;
  model: string;
  usagePercentage: number | null;
  usageStatus: string | null;
};

export type TireSlot = {
  position: 'FRONT_LEFT' | 'FRONT_RIGHT' | 'REAR_LEFT' | 'REAR_RIGHT' | 'SPARE';
  tire: TireSlotData | null;
  selected?: boolean;
  highlight?: 'mismatch' | 'success';
};

type Props = {
  slots: TireSlot[];
  onSlotClick?: (position: string) => void;
  mode: 'view' | 'mount' | 'dismount' | 'rotate';
};

const POSITION_LABELS: Record<string, string> = {
  FRONT_LEFT: 'FL',
  FRONT_RIGHT: 'FR',
  REAR_LEFT: 'RL',
  REAR_RIGHT: 'RR',
  SPARE: 'SP',
};

const USAGE_STATUS_COLORS: Record<string, string> = {
  green: CHART_COLORS.success,
  yellow: CHART_COLORS.warning,
  orange: CHART_BUCKET[3],
  red: CHART_COLORS.danger,
  crimson: CHART_BUCKET[5],
};

const SLOT_POSITIONS: Record<string, { x: number; y: number }> = {
  FRONT_LEFT: { x: 30, y: 30 },
  FRONT_RIGHT: { x: 160, y: 30 },
  REAR_LEFT: { x: 30, y: 140 },
  REAR_RIGHT: { x: 160, y: 140 },
  SPARE: { x: 220, y: 195 },
};

const SLOT_W = 80;
const SLOT_H = 50;

export function TirePositionDiagram({ slots, onSlotClick, mode }: Props) {
  const slotByPosition = new Map(slots.map((s) => [s.position, s]));
  const allPositions = ['FRONT_LEFT', 'FRONT_RIGHT', 'REAR_LEFT', 'REAR_RIGHT', 'SPARE'] as const;

  const isClickable = mode !== 'view';

  return (
    <svg
      viewBox="0 0 330 260"
      style={{ width: '100%', maxWidth: 330, display: 'block' }}
      aria-label="Tire position diagram"
    >
      <rect
        x={90}
        y={55}
        width={110}
        height={110}
        rx={8}
        fill="var(--gray-3)"
        stroke="var(--border-default)"
        strokeWidth={1.5}
      />
      <line x1={90} y1={92} x2={110} y2={92} stroke="var(--gray-8)" strokeWidth={2} />
      <line x1={200} y1={92} x2={220} y2={92} stroke="var(--gray-8)" strokeWidth={2} />
      <line x1={90} y1={128} x2={110} y2={128} stroke="var(--gray-8)" strokeWidth={2} />
      <line x1={200} y1={128} x2={220} y2={128} stroke="var(--gray-8)" strokeWidth={2} />

      {allPositions.map((pos) => {
        const slotPos = SLOT_POSITIONS[pos]!;
        const { x, y } = slotPos;
        const slot = slotByPosition.get(pos);
        const isEmpty = !slot?.tire;
        const isSelected = slot?.selected;
        const hasMismatch = slot?.highlight === 'mismatch';
        const hasSuccess = slot?.highlight === 'success';

        let fillColor = 'var(--gray-1)';
        let strokeColor = 'var(--border-default)';
        let strokeWidth = 1.5;
        let strokeDasharray = '4 3';

        if (!isEmpty && slot?.tire) {
          const bucketColor = usageBucketColor(slot.tire.usageStatus ?? 'GOOD');
          fillColor = (USAGE_STATUS_COLORS[bucketColor] ?? CHART_COLORS.success) + '33';
          strokeColor = USAGE_STATUS_COLORS[bucketColor] ?? CHART_COLORS.success;
          strokeDasharray = '';
          strokeWidth = 2;
        }

        if (isSelected) {
          strokeColor = CHART_COLORS.accent;
          strokeWidth = 2.5;
          strokeDasharray = '';
        }
        if (hasMismatch) {
          strokeColor = CHART_BUCKET[3];
          strokeWidth = 2.5;
          strokeDasharray = '';
          fillColor = 'var(--orange-2)';
        }
        if (hasSuccess) {
          strokeColor = CHART_COLORS.success;
          strokeWidth = 2.5;
          strokeDasharray = '';
        }

        const canClick = isClickable && onSlotClick;
        const showAsTarget = mode === 'mount' && isEmpty;

        return (
          <g
            key={pos}
            onClick={canClick ? () => onSlotClick!(pos) : undefined}
            style={{ cursor: canClick ? 'pointer' : 'default' }}
            role={canClick ? 'button' : undefined}
            aria-label={`${POSITION_LABELS[pos]} – ${isEmpty ? 'empty' : slot!.tire!.brand + ' ' + slot!.tire!.model}`}
          >
            {showAsTarget && (
              <rect
                x={x - 3}
                y={y - 3}
                width={SLOT_W + 6}
                height={SLOT_H + 6}
                rx={8}
                fill="var(--cyan-3)"
                stroke="var(--cyan-8)"
                strokeWidth={1}
                strokeDasharray="4 2"
              />
            )}
            <rect
              x={x}
              y={y}
              width={SLOT_W}
              height={SLOT_H}
              rx={6}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
            />
            <text
              x={x + SLOT_W / 2}
              y={y + 16}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-muted)"
              fontWeight="600"
            >
              {POSITION_LABELS[pos]}
            </text>
            {isEmpty ? (
              <text
                x={x + SLOT_W / 2}
                y={y + 32}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
              >
                empty
              </text>
            ) : (
              <>
                <text
                  x={x + SLOT_W / 2}
                  y={y + 30}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--text-primary)"
                >
                  {slot!.tire!.brand.slice(0, 8)}
                </text>
                <text
                  x={x + SLOT_W / 2}
                  y={y + 42}
                  textAnchor="middle"
                  fontSize={8}
                  fill="var(--text-muted)"
                >
                  {slot!.tire!.usagePercentage !== null
                    ? `${Math.round(slot!.tire!.usagePercentage)}%`
                    : '—'}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
