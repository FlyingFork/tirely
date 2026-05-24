import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  description?: string;
  breadcrumb?: ReactNode;
  actions?: ReactNode;
  size?: '5' | '6' | '7';
};

export function PageHeader({ title, description, breadcrumb, actions, size = '6' }: PageHeaderProps) {
  return (
    <Flex direction="column" gap="3" mb="4" className="anim-fade-in">
      {breadcrumb}
      <Flex direction={{ initial: 'column', sm: 'row' }} gap="3" justify="between" align={{ sm: 'center' }}>
        <Box>
          <Heading size={size}>{title}</Heading>
          {description && (
            <Text as="p" size="2" color="gray" mt="1">
              {description}
            </Text>
          )}
        </Box>
        {actions && (
          <Flex direction="row" gap="4" wrap="wrap" justify={{ initial: 'start', sm: 'end' }} align="center">
            {actions}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}
