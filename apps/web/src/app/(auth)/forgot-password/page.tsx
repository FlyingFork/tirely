'use client';

import { Suspense, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { Callout, Card, Flex, Heading, Text, TextField } from '@radix-ui/themes';
import { CheckCircle, Mail } from 'lucide-react';
import { passwordResetRequestSchema, type PasswordResetRequestInput } from '@tirely/validators';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { authClient } from '@/lib/auth-client';

const DEFAULT_VALUES: PasswordResetRequestInput = {
  email: '',
};

function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  return (
    <Flex direction="column" align="center" gap="4" style={{ width: 'min(100%, 440px)' }}>
      <Flex direction="column" align="center" gap="2">
        <Image src="/logo-dark.svg" alt="Tirely" width={110} height={38} priority />
        <Text size="1" color="gray" align="center">Fleet tire intelligence</Text>
      </Flex>

      <Card style={{ width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)' }}>
        <Flex direction="column" gap="5" p={{ initial: '5', sm: '6' }}>
          <Flex direction="column" gap="1">
            <Heading size="5">Forgot password</Heading>
            <Text size="2" color="gray">
              Enter your email and we&apos;ll send you a reset link.
            </Text>
          </Flex>

          {sent ? (
            <Flex direction="column" gap="4">
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={14} />
                </Callout.Icon>
                <Callout.Text>Check your inbox for a password reset link.</Callout.Text>
              </Callout.Root>
            </Flex>
          ) : (
            <Form
              schema={passwordResetRequestSchema}
              defaultValues={DEFAULT_VALUES}
              onSubmit={async (values, { setError }) => {
                const { error: authError } = await authClient.requestPasswordReset({
                  email: values.email,
                  redirectTo: `${window.location.origin}/reset-password`,
                });

                if (authError) {
                  setError('root.serverError', {
                    message: authError.message ?? 'Something went wrong. Please try again.',
                  });
                  return;
                }

                setSent(true);
              }}
            >
              <Flex direction="column" gap="4">
                <FormField name="email" label="Email" required>
                  {(field) => (
                    <TextField.Root
                      {...field}
                      type="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      size="3"
                    >
                      <TextField.Slot>
                        <Mail size={14} color="var(--gray-9)" />
                      </TextField.Slot>
                    </TextField.Root>
                  )}
                </FormField>

                <FormErrorState />

                <SubmitButton size="3" style={{ width: '100%', marginTop: 4 }}>
                  Send reset link
                </SubmitButton>
              </Flex>
            </Form>
          )}

          <Text size="2" align="center">
            <Link href="/sign-in" style={{ color: 'var(--accent-11)' }}>
              Back to sign in
            </Link>
          </Text>
        </Flex>
      </Card>
    </Flex>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
