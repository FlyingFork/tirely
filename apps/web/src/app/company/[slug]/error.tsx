'use client';

import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';

import { reportClientError } from '@/lib/monitoring';

export default function CompanyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return (
    <Flex align="center" justify="center" minHeight="60vh" p="4">
      <Card size="3" style={{ maxWidth: 520, width: '100%' }}>
        <Flex direction="column" gap="4" align="start">
          <Flex align="center" gap="3">
            <AlertCircle size={24} color="var(--cyan-9)" />
            <Heading size="5">Something went wrong</Heading>
          </Flex>
          <Text color="gray" size="2">
            {error.message || 'This page could not be loaded. Try again or return to the dashboard.'}
          </Text>
          <Button onClick={reset}>Try again</Button>
        </Flex>
      </Card>
    </Flex>
  );
}
