import { Box, Flex, Text } from '@radix-ui/themes';
import { CheckCircle2, Circle } from 'lucide-react';

export type TimelineStep = {
  label: string;
  date: string | null;
  complete: boolean;
  color?: string;
  fillColor?: string;
};

export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <Flex direction="column" gap="0">
      {steps.map((step, i) => (
        <Flex key={step.label} align="start" gap="3">
          <Flex direction="column" align="center" style={{ width: 20, flexShrink: 0 }}>
            <Box
              style={{
                width: 20,
                height: 20,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {step.complete ? (
                <CheckCircle2
                  size={20}
                  color={step.color ?? 'var(--accent-9)'}
                  fill={step.fillColor ?? (step.color ? `${step.color}20` : 'var(--accent-a3)')}
                />
              ) : (
                <Circle size={20} color="var(--gray-6)" />
              )}
            </Box>
            {i < steps.length - 1 && (
              <Box
                style={{
                  width: 2,
                  flexGrow: 1,
                  minHeight: 24,
                  background: step.complete ? 'var(--accent-9)' : 'var(--gray-5)',
                  margin: '2px 0',
                }}
              />
            )}
          </Flex>
          <Flex direction="column" gap="0" pb={i < steps.length - 1 ? '4' : '0'}>
            <Text
              size="2"
              weight={step.complete ? 'medium' : 'regular'}
              color={step.complete ? undefined : 'gray'}
            >
              {step.label}
            </Text>
            {step.date && (
              <Text size="1" color="gray">
                {step.date}
              </Text>
            )}
          </Flex>
        </Flex>
      ))}
    </Flex>
  );
}
