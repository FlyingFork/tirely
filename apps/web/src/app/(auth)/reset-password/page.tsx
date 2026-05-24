'use client';

import { Suspense, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Button, Callout, Card, Flex, Heading, IconButton, Text, TextField } from '@radix-ui/themes';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import { passwordResetSchema, type PasswordResetInput } from '@tirely/validators';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { authClient } from '@/lib/auth-client';

const DEFAULT_VALUES: PasswordResetInput = {
  password: '',
  confirmPassword: '',
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const errorParam = searchParams.get('error');

  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);

  const isInvalidLink = !token || !!errorParam;

  return (
    <Flex direction="column" align="center" gap="4" style={{ width: 'min(100%, 440px)' }}>
      <Flex direction="column" align="center" gap="2">
        <Image src="/logo-dark.svg" alt="Tirely" width={110} height={38} priority />
        <Text size="1" color="gray" align="center">Fleet tire intelligence</Text>
      </Flex>

      <Card style={{ width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)' }}>
        <Flex direction="column" gap="5" p={{ initial: '5', sm: '6' }}>
          {isInvalidLink ? (
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="1">
                <Heading size="5">Invalid link</Heading>
                <Text size="2" color="gray">
                  This password reset link is invalid or has expired.
                </Text>
              </Flex>
              <ErrorState
                message={
                  errorParam === 'INVALID_TOKEN'
                    ? 'This link has expired or has already been used.'
                    : 'No reset token was found in this link.'
                }
              />
              <Button asChild size="3" style={{ width: '100%' }}>
                <Link href="/forgot-password">Request a new link</Link>
              </Button>
            </Flex>
          ) : done ? (
            <Flex direction="column" gap="4">
              <Flex direction="column" gap="1">
                <Heading size="5">Password updated</Heading>
                <Text size="2" color="gray">
                  Your password has been reset successfully.
                </Text>
              </Flex>
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={14} />
                </Callout.Icon>
                <Callout.Text>You can now sign in with your new password.</Callout.Text>
              </Callout.Root>
              <Button asChild size="3" style={{ width: '100%' }}>
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </Flex>
          ) : (
            <>
              <Flex direction="column" gap="1">
                <Heading size="5">Reset password</Heading>
                <Text size="2" color="gray">
                  Choose a new password for your account.
                </Text>
              </Flex>

              <Form
                schema={passwordResetSchema}
                defaultValues={DEFAULT_VALUES}
                onSubmit={async (values, { setError }) => {
                  const { error: authError } = await authClient.resetPassword({
                    newPassword: values.password,
                    token: token!,
                  });

                  if (authError) {
                    setError('root.serverError', {
                      message:
                        authError.message ??
                        'Failed to reset password. The link may have expired.',
                    });
                    return;
                  }

                  setDone(true);
                }}
              >
                <Flex direction="column" gap="4">
                  <FormField name="password" label="New password" description="Minimum 8 characters" required>
                    {(field) => (
                      <TextField.Root
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        autoComplete="new-password"
                        size="3"
                      >
                        <TextField.Slot side="right">
                          <IconButton
                            type="button"
                            variant="ghost"
                            size="1"
                            color="gray"
                            onClick={() => setShowPassword((value) => !value)}
                            style={{ cursor: 'pointer' }}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </IconButton>
                        </TextField.Slot>
                      </TextField.Root>
                    )}
                  </FormField>

                  <FormField name="confirmPassword" label="Confirm password" required>
                    {(field) => (
                      <TextField.Root
                        {...field}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        autoComplete="new-password"
                        size="3"
                      />
                    )}
                  </FormField>

                  <FormErrorState />

                  <SubmitButton size="3" style={{ width: '100%', marginTop: 4 }}>
                    Reset password
                  </SubmitButton>
                </Flex>
              </Form>
            </>
          )}
        </Flex>
      </Card>
    </Flex>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
