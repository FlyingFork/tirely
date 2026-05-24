import Link from 'next/link';
import type { Metadata } from 'next';
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';

export const metadata: Metadata = {
  title: 'Page not found - Tirely',
};

export default function NotFound() {
  return (
    <Flex align="center" justify="center" minHeight="100vh" p="4">
      <Card size="3" style={{ maxWidth: 520, width: '100%' }}>
        <Flex direction="column" gap="4" align="start">
          <Heading size="5">Page not found</Heading>
          <Text color="gray" size="2">
            The page you are looking for does not exist or is no longer available.
          </Text>
          <Button asChild>
            <Link href="/">Go home</Link>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
}
