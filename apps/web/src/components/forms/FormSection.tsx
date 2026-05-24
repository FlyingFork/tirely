import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type FormSectionProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
};

export function FormSection({ title, description, icon: Icon, children }: FormSectionProps) {
  return (
    <Card>
      <Flex direction="column" gap="3" p={{ initial: '3', sm: '4' }}>
        <Flex direction="row" gap="2" align="start">
          {Icon && <Icon size={18} color="var(--accent-9)" aria-hidden />}
          <Flex direction="column" gap="1">
            <Heading size="3">{title}</Heading>
            {description && (
              <Text size="2" color="gray">
                {description}
              </Text>
            )}
          </Flex>
        </Flex>
        {children}
      </Flex>
    </Card>
  );
}
