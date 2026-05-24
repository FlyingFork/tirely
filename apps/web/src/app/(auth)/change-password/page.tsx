'use client';

import { Suspense, useEffect, useState } from 'react';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, Flex, Heading, IconButton, Text, TextField } from '@radix-ui/themes';
import { Eye, EyeOff } from 'lucide-react';
import type { ApiMe } from '@tirely/types';
import { passwordResetSchema, type PasswordResetInput } from '@tirely/validators';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { authClient, type SessionUser } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';

const DEFAULT_VALUES: PasswordResetInput = {
  password: '',
  confirmPassword: '',
};

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/';
  const { data: session, isPending, refetch } = authClient.useSession();

  const [showPassword, setShowPassword] = useState(false);

  const user = session?.user as SessionUser | undefined;

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace('/sign-in');
      return;
    }

    if (!user?.firstLogin) {
      router.replace(redirectTo);
    }
  }, [isPending, session, user, router, redirectTo]);

  if (isPending || !session || !user?.firstLogin) {
    return null;
  }

  return (
    <Flex direction="column" align="center" gap="4" style={{ width: 'min(100%, 440px)' }}>
      <Flex direction="column" align="center" gap="2">
        <Image src="/logo-dark.svg" alt="Tirely" width={110} height={38} priority />
        <Text size="1" color="gray" align="center">Fleet tire intelligence</Text>
      </Flex>

      <Card style={{ width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)' }}>
        <Flex direction="column" gap="5" p={{ initial: '5', sm: '6' }}>
          <Flex direction="column" gap="1">
            <Heading size="5">Change Your Password</Heading>
            <Text size="2" color="gray">
              Please set a new password to continue. This is required for your first login.
            </Text>
          </Flex>

          <Form
            schema={passwordResetSchema}
            defaultValues={DEFAULT_VALUES}
            onSubmit={async (values, { setError }) => {
              const response = await authRequest<{ success: boolean }>(
                '/v1/me/first-login-password',
                {
                  method: 'PATCH',
                  body: { password: values.password },
                },
              );

              if ('code' in response) {
                setError('root.serverError', { message: response.message });
                return;
              }

              await refetch();

              const me = await authRequest<ApiMe>('/v1/me');
              if ('code' in me) {
                router.push(redirectTo);
                return;
              }

              const { role, company } = me.data;

              if (role !== 'admin' && company) {
                router.push(`/company/${company.slug}`);
                return;
              }

              const explicitRedirect = searchParams.get('redirectTo');
              if (role === 'admin' && !explicitRedirect) {
                router.push('/admin');
                return;
              }

              router.push(redirectTo);
            }}
          >
            <Flex direction="column" gap="4">
              <FormField name="password" label="New Password" description="Minimum 8 characters" required>
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

              <FormField name="confirmPassword" label="Confirm Password" required>
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
                Change Password
              </SubmitButton>
            </Flex>
          </Form>
        </Flex>
      </Card>
    </Flex>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePasswordForm />
    </Suspense>
  );
}
