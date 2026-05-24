'use client';

import { Flex, Skeleton } from '@radix-ui/themes';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { PageShell } from './_components/PageShell';
import { RequestForm } from './_components/RequestForm';
import { RequestStatusView } from './_components/RequestStatusView';

function RequestPageInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  if (email) {
    return <RequestStatusView email={email} />;
  }

  return <RequestForm />;
}

export default function RequestPage() {
  return (
    <Suspense
      fallback={
        <PageShell>
          <Flex direction="column" gap="3">
            <Skeleton height="40px" width="200px" />
            <Skeleton height="400px" />
          </Flex>
        </PageShell>
      }
    >
      <RequestPageInner />
    </Suspense>
  );
}
