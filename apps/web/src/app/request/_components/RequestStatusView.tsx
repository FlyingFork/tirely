'use client';

import { publicRequest } from '@/lib/http';
import {
  Badge,
  Button,
  Card,
  Callout,
  Flex,
  Heading,
  Skeleton,
  Text,
} from '@radix-ui/themes';
import type { ApiCompanyRequestStatus } from '@tirely/types';
import { ArrowLeft, RefreshCw, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { PageShell } from './PageShell';
import { StatusDetailCard } from './StatusDetailCard';
import { formatRequestTime } from './shared';

export function RequestStatusView({ email }: { email: string }) {
  const [status, setStatus] = useState<ApiCompanyRequestStatus | 'not-found' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(null);

  const fetchStatus = useCallback(async () => {
    setError(null);
    setLoading(true);

    const response = await publicRequest<ApiCompanyRequestStatus>(
      `/v1/company/request/status?${new URLSearchParams({ email })}`,
    );

    setLoading(false);
    setLastFetchedAt(new Date());

    if ('code' in response) {
      if (response.statusCode === 404) {
        setStatus('not-found');
      } else {
        setError(response.message);
      }
      return;
    }

    setStatus(response.data);
  }, [email]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return (
    <PageShell>
      <Flex direction="column" gap="2" mb="6" className="anim-slide-up">
        <Flex align="center" justify="between" gap="3">
          <Badge size="2" color="gray" variant="soft">
            Company Registration
          </Badge>
          <Button asChild variant="ghost" color="gray" size="2">
            <Link href="/request">
              <ArrowLeft size={14} />
              New request
            </Link>
          </Button>
        </Flex>
        <Heading size="7">Request Status</Heading>
        <Text size="3" color="gray" as="p">
          {email}
        </Text>
      </Flex>

      <Flex align="center" justify="end" mb="4" gap="2">
        {lastFetchedAt && (
          <Text size="1" color="gray">
            Updated {formatRequestTime(lastFetchedAt)}
          </Text>
        )}
        <Button
          variant="soft"
          color="gray"
          size="1"
          onClick={fetchStatus}
          disabled={loading}
          style={{ cursor: 'pointer' }}
        >
          <RefreshCw size={12} />
          Refresh
        </Button>
      </Flex>

      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {loading && status === null && (
        <Flex direction="column" gap="3">
          <Skeleton height="160px" />
          <Skeleton height="120px" />
        </Flex>
      )}

      {status === 'not-found' && (
        <Card>
          <Flex align="center" gap="3" p="4" wrap="wrap">
            <Search size={24} color="var(--gray-9)" style={{ flexShrink: 0 }} />
            <Flex direction="column" gap="1" flexGrow="1">
              <Text size="3" weight="medium">
                No request found
              </Text>
              <Text size="2" color="gray">
                We couldn't find a registration request for{' '}
                <Text weight="medium" as="span">
                  {email}
                </Text>
                .
              </Text>
            </Flex>
            <Button asChild variant="soft" size="2">
              <Link href="/request">Submit a request</Link>
            </Button>
          </Flex>
        </Card>
      )}

      {status !== null && status !== 'not-found' && (
        <StatusDetailCard result={status} email={email} />
      )}
    </PageShell>
  );
}
