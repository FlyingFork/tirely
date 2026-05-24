import { Card, Flex, Skeleton, Table, Text } from '@radix-ui/themes';
import type { ReactNode } from 'react';

type TableColumn = { key: string; label: ReactNode };

export function PageSkeleton() {
  return (
    <Flex direction="column" gap="4">
      <Skeleton height="32px" width="260px" />
      <CardSkeleton lines={4} />
      <CardSkeleton lines={6} />
    </Flex>
  );
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card>
      <Flex direction="column" gap="3" p="3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index}>
            <Text>placeholder</Text>
          </Skeleton>
        ))}
      </Flex>
    </Card>
  );
}

export function TableSkeleton({
  columns,
  rows = 10,
}: {
  columns: number | TableColumn[];
  rows?: number;
}) {
  const columnList =
    typeof columns === 'number'
      ? Array.from({ length: columns }, (_, index) => ({ key: String(index), label: '' }))
      : columns;

  return (
    <Table.Root variant="surface" size="2">
      <Table.Header>
        <Table.Row>
          {columnList.map((col) => (
            <Table.ColumnHeaderCell key={col.key}>{col.label}</Table.ColumnHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <Table.Row key={rowIndex}>
            {columnList.map((col) => (
              <Table.Cell key={col.key}>
                <Skeleton>
                  <Text>placeholder</Text>
                </Skeleton>
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
