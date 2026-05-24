'use client';

import { Button, Callout, Dialog, Flex } from '@radix-ui/themes';
import type { ReactNode } from 'react';
import { useState } from 'react';

export type ConfirmActionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  color?: 'red' | 'green' | 'orange';
  onConfirm: () => Promise<void> | void;
};

function ConfirmActionError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <Callout.Root color="red" size="1" mb="3">
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  );
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  color = 'red',
  onConfirm,
}: ConfirmActionDialogProps) {
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const resetConfirmState = () => {
    setConfirmError(null);
    setConfirming(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      resetConfirmState();
    }
    onOpenChange(next);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    setConfirmError(null);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {description}
        </Dialog.Description>
        <ConfirmActionError message={confirmError} />
        <Flex gap="2" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              {cancelLabel}
            </Button>
          </Dialog.Close>
          <Button color={color} onClick={handleConfirm} loading={confirming}>
            {confirmLabel}
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
