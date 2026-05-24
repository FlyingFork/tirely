'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import {
  FormProvider,
  useForm,
  type DefaultValues,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import type { z } from 'zod';

export type FormHelpers<T extends FieldValues> = Pick<UseFormReturn<T>, 'setError' | 'reset'>;

export type FormProps<T extends FieldValues> = {
  schema: z.ZodType<T>;
  defaultValues: DefaultValues<T>;
  onSubmit: (values: T, helpers: FormHelpers<T>) => Promise<void> | void;
  mode?: 'onSubmit' | 'onBlur' | 'onChange';
  id?: string;
  className?: string;
  children: ReactNode;
};

export function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  mode = 'onSubmit',
  id,
  className,
  children,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema) as unknown as Resolver<T>,
    defaultValues,
    mode,
  });

  const handle = (values: T) =>
    onSubmit(values, { setError: methods.setError, reset: methods.reset });

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        className={className}
        onSubmit={methods.handleSubmit((values) => handle(values as T))}
        noValidate
      >
        {children}
      </form>
    </FormProvider>
  );
}
