'use client';

import { ErrorState } from '@/components/feedback/ErrorState';
import { useFormContext } from 'react-hook-form';

export function FormErrorState() {
  const { formState } = useFormContext();
  const message = formState.errors.root?.serverError?.message;

  if (!message) {
    return null;
  }

  return <ErrorState message={message} />;
}
