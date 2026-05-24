import { Flex, Text } from '@radix-ui/themes';

interface InfoFieldProps {
  label: string;
  value: React.ReactNode;
}

export function InfoField({ label, value }: InfoFieldProps) {
  return (
    <Flex direction="column" gap="1">
      <Text
        size="1"
        color="gray"
        weight="medium"
        style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
      >
        {label}
      </Text>
      <Text size="2">{value ?? '—'}</Text>
    </Flex>
  );
}
