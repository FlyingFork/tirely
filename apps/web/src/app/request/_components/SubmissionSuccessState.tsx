'use client';

import { Badge, Button, Card, Flex, Heading, Text } from '@radix-ui/themes';
import { CheckCircle, Copy, CopyCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import type { SubmissionResult } from './shared';

export function SubmissionSuccessState({ result }: { result: SubmissionResult }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(result.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Flex direction="column" gap="2" className="anim-slide-up">
      <Badge size="2" color="green" variant="soft" style={{ width: 'fit-content' }}>
        Request submitted
      </Badge>
      <Heading size="7">You're on your way.</Heading>
      <Text size="3" color="gray" as="p" mb="5">
        We've received your registration request for{' '}
        <Text weight="medium" color="gray" as="span">
          {result.companyName}
        </Text>
        . Our team will review it and be in touch soon.
      </Text>

      <Card>
        <Flex direction="column" align="center" gap="5" p="5">
          <Flex
            align="center"
            justify="center"
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--green-a3)',
            }}
          >
            <CheckCircle size={32} color="var(--green-9)" />
          </Flex>

          <Flex
            align="center"
            gap="2"
            style={{
              background: 'var(--gray-a3)',
              borderRadius: 8,
              padding: '8px 14px',
              border: '1px solid var(--gray-5)',
            }}
          >
            <Text size="1" color="gray" style={{ fontFamily: 'monospace' }}>
              Ref: {result.id}
            </Text>
            <Button
              variant="ghost"
              size="1"
              color="gray"
              onClick={handleCopy}
              style={{ cursor: 'pointer' }}
            >
              {copied ? <CopyCheck size={13} /> : <Copy size={13} />}
            </Button>
          </Flex>

          <Flex gap="3" wrap="wrap" justify="center" style={{ width: '100%' }}>
            <Button asChild size="3" style={{ flexGrow: 1, maxWidth: 220 }}>
              <Link href={`/request?email=${encodeURIComponent(result.companyEmail)}`}>
                View request status
              </Link>
            </Button>
            <Button asChild variant="soft" color="gray" size="3" style={{ flexGrow: 1, maxWidth: 160 }}>
              <Link href="/">Back to home</Link>
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
