import { Button, Callout, Flex } from '@radix-ui/themes';
import { AlertCircle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export type ErrorStateProps = {
  title?: string;
  message: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
};

export function ErrorState({ title, message, retryLabel = 'Retry', onRetry }: ErrorStateProps) {
  return (
    <Flex direction="column" gap="3" align="start">
      <Callout.Root color="red" size="1">
        <Callout.Icon>
          <AlertCircle size={14} />
        </Callout.Icon>
        <Callout.Text>
          {title ? <strong>{title}: </strong> : null}
          {message}
        </Callout.Text>
      </Callout.Root>
      {onRetry && (
        <Button variant="soft" color="gray" size="2" onClick={onRetry}>
          <RefreshCw size={13} /> {retryLabel}
        </Button>
      )}
    </Flex>
  );
}
