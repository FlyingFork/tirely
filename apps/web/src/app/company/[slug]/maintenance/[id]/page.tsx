'use client';

import { StatusBadge } from '@/components/feedback/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { InfoField } from '@/components/InfoField';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDate, formatDateTime, formatNumber } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiMaintenanceEvent } from '@tirely/types';
import { Box, Button, Card, Flex, Separator, Table, Text } from '@radix-ui/themes';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function MaintenanceDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;

  const [event, setEvent] = useState<ApiMaintenanceEvent | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    authRequest<ApiMaintenanceEvent>(`/v1/company/${slug}/maintenance/${id}`, {
      signal: controller.signal,
    }).then((res) => {
      if ('code' in res) {
        if (res.statusCode === 404) setNotFound(true);
        return;
      }
      setEvent(res.data);
    });
    return () => controller.abort();
  }, [slug, id]);

  if (notFound) {
    return <ErrorState message="Maintenance event not found." />;
  }

  if (!event) {
    return (
      <Flex direction="column" gap="4">
        <Text color="gray">Loading...</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title="Maintenance event"
        description={formatDate(event.date)}
        breadcrumb={
          <Button variant="ghost" color="gray" asChild>
            <Link href={`/company/${slug}/maintenance`}>
              <ArrowLeft size={16} />
              Back to maintenance
            </Link>
          </Button>
        }
        actions={<StatusBadge kind="maintenanceType" type={event.type} />}
      />

      <Card style={{ maxWidth: 800 }}>
        <Flex direction="column" gap="3" p="2">
          <Flex gap="6" wrap="wrap">
            <InfoField label="Performed by" value={event.performedBy.name} />
            <InfoField label="Date" value={formatDate(event.date)} />
            <InfoField label="Cost" value={event.cost != null ? formatNumber(event.cost) : '-'} />
            <InfoField label="Recorded at" value={formatDateTime(event.createdAt)} />
          </Flex>

          {event.description && (
            <>
              <Separator size="4" />
              <InfoField label="Description" value={event.description} />
            </>
          )}

          {event.tires.length > 0 && (
            <>
              <Separator size="4" />
              <Text size="2" weight="medium">
                Involved tires ({event.tires.length})
              </Text>
              <Box style={{ overflowX: 'auto' }}>
                <Table.Root variant="surface">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Brand</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {event.tires.map((tire) => (
                      <Table.Row
                        key={tire.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          window.location.href = `/company/${slug}/tires/${tire.id}`;
                        }}
                      >
                        <Table.Cell>
                          <Text size="2" weight="medium">
                            {tire.brand}
                          </Text>
                        </Table.Cell>
                        <Table.Cell>
                          <Text size="2" color="gray">
                            {tire.model}
                          </Text>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </Box>
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}
