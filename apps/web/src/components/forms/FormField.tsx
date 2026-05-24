'use client';

import { Flex, Text } from '@radix-ui/themes';
import { useId, type ReactNode } from 'react';
import { useController, useFormContext, type RefCallBack } from 'react-hook-form';

type RenderField = {
  name: string;
  value: string | number | undefined;
  onChange: (...event: unknown[]) => void;
  onBlur: () => void;
  ref: RefCallBack;
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
};

export type FormFieldProps = {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  children: (field: RenderField) => ReactNode;
};

export function FormField({ name, label, description, required, children }: FormFieldProps) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  const errId = fieldState.error ? `${id}-err` : undefined;

  return (
    <Flex direction="column" gap="1">
      <Text as="label" htmlFor={id} size="2" weight="medium">
        {label}
        {required && <Text color="red"> *</Text>}
      </Text>
      {description && (
        <Text id={descId} size="1" color="gray">
          {description}
        </Text>
      )}
      {children({
        name: field.name,
        value: field.value as string | number | undefined,
        onChange: field.onChange,
        onBlur: field.onBlur,
        ref: field.ref,
        id,
        'aria-invalid': fieldState.error ? true : undefined,
        'aria-describedby': [descId, errId].filter(Boolean).join(' ') || undefined,
      })}
      {fieldState.error?.message && (
        <Text id={errId} size="1" color="red">
          {fieldState.error.message}
        </Text>
      )}
    </Flex>
  );
}
