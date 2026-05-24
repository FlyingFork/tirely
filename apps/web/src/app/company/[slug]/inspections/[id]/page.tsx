'use client';

import { ErrorState } from '@/components/feedback/ErrorState';
import { InfoField } from '@/components/InfoField';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { formatDate, formatDateTime } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { ApiInspection } from '@tirely/types';
import { Badge, Box, Button, Flex, Separator, Table, Text } from '@radix-ui/themes';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const TYPE_LABELS: Record<string, string> = {
  DAILY_CHECK: 'Daily check',
  DETAILED: 'Detailed inspection',
};

const VISUAL_LABELS: Record<string, string> = {
  GOOD: 'Good',
  MINOR_WEAR: 'Minor wear',
  CONCERN: 'Concern',
};

const CONDITION_LABELS: Record<string, string> = {
  GOOD: 'Good',
  NEEDS_MONITORING: 'Needs monitoring',
  NEEDS_REPLACEMENT: 'Needs replacement',
};

const VISUAL_COLORS: Record<string, 'green' | 'yellow' | 'red'> = {
  GOOD: 'green',
  MINOR_WEAR: 'yellow',
  CONCERN: 'red',
};

const CONDITION_COLORS: Record<string, 'green' | 'yellow' | 'red'> = {
  GOOD: 'green',
  NEEDS_MONITORING: 'yellow',
  NEEDS_REPLACEMENT: 'red',
};

export default function InspectionDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const id = params.id as string;

  const [inspection, setInspection] = useState<ApiInspection | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    authRequest<ApiInspection>(`/v1/company/${slug}/inspections/${id}`, {
      signal: controller.signal,
    }).then((res) => {
      if ('code' in res) {
        if (res.statusCode === 404) setNotFound(true);
        return;
      }
      setInspection(res.data);
    });
    return () => controller.abort();
  }, [slug, id]);

  if (notFound) {
    return <ErrorState message="Inspection not found." />;
  }

  if (!inspection) {
    return (
      <Flex direction="column" gap="4">
        <Text color="gray">Loading...</Text>
      </Flex>
    );
  }

  const isDetailed = inspection.type === 'DETAILED';
  const typeLabel = TYPE_LABELS[inspection.type] ?? inspection.type;

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title={typeLabel}
        description={`${formatDate(inspection.date)} - ${inspection.vehicle.licensePlate} ${inspection.vehicle.make} ${inspection.vehicle.model}`}
        breadcrumb={
          <Button variant="ghost" color="gray" asChild>
            <Link href={`/company/${slug}/inspections`}>
              <ArrowLeft size={16} />
              Back to inspections
            </Link>
          </Button>
        }
        actions={
          <Badge color={isDetailed ? 'blue' : 'gray'} size="2">
            {typeLabel}
          </Badge>
        }
      />

      <SectionCard title="Inspection Details" icon={ClipboardList}>
        <Flex gap="6" wrap="wrap">
          <InfoField label="Inspector" value={inspection.inspector.name} />
          <InfoField label="Date" value={formatDate(inspection.date)} />
          <InfoField label="Recorded at" value={formatDateTime(inspection.createdAt)} />
        </Flex>

        {inspection.overallNotes && (
          <>
            <Separator size="4" mt="3" />
            <InfoField label="Overall notes" value={inspection.overallNotes} />
          </>
        )}

        <Separator size="4" mt="3" />

        <Text size="2" weight="medium" mb="2" style={{ display: 'block' }}>
          Tire results ({inspection.results.length})
        </Text>

        <Box style={{ overflowX: 'auto' }}>
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>Position</Table.ColumnHeaderCell>
                {isDetailed ? (
                  <>
                    <Table.ColumnHeaderCell>Condition</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Tread depth</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Pressure</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Damage notes</Table.ColumnHeaderCell>
                  </>
                ) : (
                  <>
                    <Table.ColumnHeaderCell>Visual condition</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Notes</Table.ColumnHeaderCell>
                  </>
                )}
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {inspection.results.map((result) => (
                <Table.Row key={result.id}>
                  <Table.Cell>
                    <Text size="2" weight="medium">
                      {result.position}
                    </Text>
                  </Table.Cell>
                  {isDetailed ? (
                    <>
                      <Table.Cell>
                        {result.condition ? (
                          <Badge color={CONDITION_COLORS[result.condition] ?? 'gray'} size="1">
                            {CONDITION_LABELS[result.condition] ?? result.condition}
                          </Badge>
                        ) : (
                          <Text size="2" color="gray">
                            -
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {result.treadDepth != null ? `${result.treadDepth} mm` : '-'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {result.tirePressure != null ? `${result.tirePressure} bar` : '-'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {result.damageNotes ?? '-'}
                        </Text>
                      </Table.Cell>
                    </>
                  ) : (
                    <>
                      <Table.Cell>
                        {result.visualCondition ? (
                          <Badge
                            color={VISUAL_COLORS[result.visualCondition] ?? 'gray'}
                            size="1"
                          >
                            {VISUAL_LABELS[result.visualCondition] ?? result.visualCondition}
                          </Badge>
                        ) : (
                          <Text size="2" color="gray">
                            -
                          </Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {result.anomalyNotes ?? '-'}
                        </Text>
                      </Table.Cell>
                    </>
                  )}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </Box>
      </SectionCard>
    </Flex>
  );
}
