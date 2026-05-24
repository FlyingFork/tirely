'use client';

import { InfoField } from '@/components/InfoField';
import { SectionCard } from '@/components/layout/SectionCard';
import {
  Badge,
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  Heading,
  Separator,
  Text,
} from '@radix-ui/themes';
import type { ApiCompanyRequestStatus } from '@tirely/types';
import { CheckCircle, Clock, Copy, CopyCheck, ListChecks, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { StatusTimeline, type TimelineStep } from './StatusTimeline';
import { FLEET_SIZE_OPTIONS, formatRequestDate, type StatusKey } from './shared';

type StatusConfig = {
  color: 'orange' | 'green' | 'red';
  Icon: LucideIcon;
  label: string;
};

const STATUS_CONFIG: Record<StatusKey, StatusConfig> = {
  PENDING: { color: 'orange', Icon: Clock, label: 'Pending review' },
  APPROVED: { color: 'green', Icon: CheckCircle, label: 'Approved' },
  REJECTED: { color: 'red', Icon: XCircle, label: 'Rejected' },
};

export function StatusDetailCard({
  result,
  email,
}: {
  result: ApiCompanyRequestStatus;
  email: string;
}) {
  const [copied, setCopied] = useState(false);
  const config = STATUS_CONFIG[result.status as StatusKey];
  const StatusIcon = config.Icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fleetLabel =
    FLEET_SIZE_OPTIONS.find((o) => o.value === result.fleetSizeEstimate)?.label ??
    result.fleetSizeEstimate;

  const timelineSteps: TimelineStep[] = [
    {
      label: 'Request submitted',
      date: formatRequestDate(result.createdAt),
      complete: true,
    },
    {
      label: 'Under review',
      date: result.status !== 'PENDING' ? 'Picked up by our team' : null,
      complete: result.status !== 'PENDING',
    },
    {
      label:
        result.status === 'APPROVED'
          ? 'Approved'
          : result.status === 'REJECTED'
            ? 'Rejected'
            : 'Decision pending',
      date: result.reviewedAt ? formatRequestDate(result.reviewedAt) : null,
      complete: result.reviewedAt !== null,
      color:
        result.status === 'APPROVED'
          ? 'var(--green-9)'
          : result.status === 'REJECTED'
            ? 'var(--red-9)'
            : undefined,
      fillColor:
        result.status === 'APPROVED'
          ? 'var(--green-a3)'
          : result.status === 'REJECTED'
            ? 'var(--red-a3)'
            : undefined,
    },
  ];

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="4" p="4">
          <Flex align="start" justify="between" gap="3" wrap="wrap">
            <Flex align="center" gap="3">
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: `var(--${config.color}-a3)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <StatusIcon size={20} color={`var(--${config.color}-9)`} />
              </div>
              <Flex direction="column" gap="1">
                <Heading size="4">{result.companyName}</Heading>
                <Text size="2" color="gray">
                  Submitted {formatRequestDate(result.createdAt)}
                  {result.reviewedAt && ` · Reviewed ${formatRequestDate(result.reviewedAt)}`}
                </Text>
              </Flex>
            </Flex>
            <Badge color={config.color} size="2">
              {config.label}
            </Badge>
          </Flex>

          <Separator size="4" />

          <Grid columns={{ initial: '1', sm: '2' }} gap="4">
            <InfoField label="Company email" value={email} />
            <InfoField label="Contact person" value={result.contactPersonName} />
            <InfoField label="Phone" value={result.contactPersonPhone} />
            <InfoField label="Fleet size" value={fleetLabel} />
            <InfoField label="Number of depots" value={result.depotCountEstimate} />
          </Grid>

          {result.message && (
            <>
              <Separator size="4" />
              <InfoField label="Message" value={result.message} />
            </>
          )}
        </Flex>
      </Card>

      <SectionCard title="Request timeline" icon={ListChecks}>
        <StatusTimeline steps={timelineSteps} />
      </SectionCard>

      {result.status === 'REJECTED' && result.rejectionReason && (
        <Callout.Root color="red" variant="soft">
          <Callout.Icon>
            <XCircle size={16} />
          </Callout.Icon>
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text size="2" weight="medium">
              Rejection reason
            </Text>
            <Text size="2">{result.rejectionReason}</Text>
          </Flex>
        </Callout.Root>
      )}

      {result.status === 'REJECTED' && (
        <Callout.Root color="gray" variant="soft">
          <Flex align="center" justify="between" gap="3" wrap="wrap" style={{ width: '100%' }}>
            <Text size="2">Want to try again? Submit a new request with updated information.</Text>
            <Button asChild variant="soft" size="2">
              <Link href="/request">Submit new request</Link>
            </Button>
          </Flex>
        </Callout.Root>
      )}

      {result.status === 'APPROVED' && (
        <Callout.Root color="green" variant="soft">
          <Callout.Icon>
            <CheckCircle size={16} />
          </Callout.Icon>
          <Flex direction="column" gap="1" style={{ minWidth: 0 }}>
            <Text size="2" weight="medium">
              Your company has been approved!
            </Text>
            <Text size="2">
              Our team will reach out to{' '}
              <Text weight="medium" as="span">
                {email}
              </Text>{' '}
              shortly with next steps to set up your account.
            </Text>
          </Flex>
        </Callout.Root>
      )}

      <Flex align="center" gap="2">
        <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
          Ref: {result.id}
        </Text>
        <Button
          variant="ghost"
          size="1"
          ml="2"
          color="gray"
          onClick={handleCopy}
          style={{ cursor: 'pointer' }}
        >
          {copied ? <CopyCheck size={12} /> : <Copy size={12} />}
        </Button>
      </Flex>
    </Flex>
  );
}
