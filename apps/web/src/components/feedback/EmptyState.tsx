import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: 'card' | 'plain';
};

export function EmptyState({ icon: Icon, title, description, action, variant = 'card' }: EmptyStateProps) {
  const inner = (
    <Flex direction="column" align="center" gap="3" py="8" px="4" style={{ textAlign: 'center' }}>
      {Icon && <Icon size={32} color="var(--accent-9)" aria-hidden />}
      <Flex direction="column" gap="1" align="center">
        <Heading size="3">{title}</Heading>
        {description && (
          <Text size="2" color="gray" style={{ maxWidth: 480 }}>
            {description}
          </Text>
        )}
      </Flex>
      {action}
    </Flex>
  );

  if (variant === 'plain') {
    return inner;
  }

  return <Card>{inner}</Card>;
}
