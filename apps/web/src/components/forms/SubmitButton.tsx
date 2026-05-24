'use client';

import { Button, type ButtonProps } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';

export function SubmitButton(props: ButtonProps) {
  const { formState } = useFormContext();
  return <Button type="submit" loading={formState.isSubmitting} {...props} />;
}
