'use client';

import type { VehicleCompatibleSizeInput } from '@tirely/validators';
import { Button, Card, Flex, Select, Text, TextField } from '@radix-ui/themes';
import { X } from 'lucide-react';

export const EMPTY_COMPATIBLE_SIZE: VehicleCompatibleSizeInput = {
  width: 315,
  aspectRatio: 80,
  rimDiameter: 22.5,
  axlePosition: 'ANY',
};

const AXLE_POSITIONS = [
  { value: 'ANY', label: 'Any position' },
  { value: 'FRONT', label: 'Front' },
  { value: 'REAR', label: 'Rear' },
  { value: 'REAR_DUALLY', label: 'Rear (Dually)' },
  { value: 'SPARE', label: 'Spare' },
  { value: 'TRAILER', label: 'Trailer' },
] as const;

interface TireSizeSelectorProps {
  value: VehicleCompatibleSizeInput;
  onChange: (v: VehicleCompatibleSizeInput) => void;
  onRemove?: () => void;
  showRemove?: boolean;
}

export function TireSizeSelector({ value, onChange, onRemove, showRemove }: TireSizeSelectorProps) {
  const set = (field: keyof VehicleCompatibleSizeInput, val: unknown) =>
    onChange({ ...value, [field]: val });

  return (
    <Card>
      <Flex direction="column" gap="3" p="1">
        <Flex gap="2" align="center">
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" weight="medium">
              Width (mm)
            </Text>
            <TextField.Root
              type="number"
              value={String(value.width)}
              min={100}
              max={500}
              onChange={(e) => set('width', parseInt(e.target.value, 10) || 0)}
              placeholder="315"
            />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" weight="medium">
              Aspect ratio
            </Text>
            <TextField.Root
              type="number"
              value={String(value.aspectRatio)}
              min={20}
              max={100}
              onChange={(e) => set('aspectRatio', parseInt(e.target.value, 10) || 0)}
              placeholder="80"
            />
          </Flex>
          <Flex direction="column" gap="1" style={{ flex: 1 }}>
            <Text size="1" color="gray" weight="medium">
              Rim (in)
            </Text>
            <TextField.Root
              type="number"
              value={String(value.rimDiameter)}
              min={10}
              max={30}
              step={0.5}
              onChange={(e) => set('rimDiameter', parseFloat(e.target.value) || 0)}
              placeholder="22.5"
            />
          </Flex>
          {showRemove && onRemove && (
            <Button
              variant="ghost"
              color="red"
              onClick={onRemove}
              style={{ flexShrink: 0 }}
              aria-label="Remove tire size"
            >
              <X size={16} />
            </Button>
          )}
        </Flex>
        <Flex direction="column" gap="1">
          <Text size="1" color="gray" weight="medium">
            Axle position
          </Text>
          <Select.Root value={value.axlePosition} onValueChange={(v) => set('axlePosition', v)}>
            <Select.Trigger />
            <Select.Content>
              {AXLE_POSITIONS.map((pos) => (
                <Select.Item key={pos.value} value={pos.value}>
                  {pos.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>
    </Card>
  );
}
