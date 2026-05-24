'use client';

import { Suspense, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { Card, Flex, Heading, IconButton, Text, TextField } from '@radix-ui/themes';
import { Eye, EyeOff, Mail } from 'lucide-react';
import type { ApiMe } from '@tirely/types';
import { signInSchema, type SignInInput } from '@tirely/validators';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { signIn } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';

const DEFAULT_VALUES: SignInInput = {
  email: '',
  password: '',
};

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') ?? '/';

  const [showPassword, setShowPassword] = useState(false);

  return (
    <Flex direction="column" align="center" gap="4" style={{ width: 'min(100%, 440px)' }}>
      <Flex direction="column" align="center" gap="2">
        <Image src="/logo-dark.svg" alt="Tirely" width={110} height={38} priority />
        <Text size="1" color="gray" align="center">Fleet tire intelligence</Text>
      </Flex>

      <Card style={{ width: '100%', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-subtle)' }}>
        <Flex direction="column" gap="5" p={{ initial: '5', sm: '6' }}>
          <Flex direction="column" gap="1">
            <Heading size="5">Welcome back</Heading>
            <Text size="2" color="gray">
              Sign in to your account to continue
            </Text>
          </Flex>

          <Form
            schema={signInSchema}
            defaultValues={DEFAULT_VALUES}
            onSubmit={async (values, { setError }) => {
              const { error: authError } = await signIn.email(values);

              if (authError) {
                setError('root.serverError', {
                  message: authError.message ?? 'Sign in failed. Please check your credentials.',
                });
                return;
              }

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

              <FormField name="password" label="Password" required>
                {(field) => (
                  <TextField.Root
                    {...field}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    autoComplete="current-password"
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

              <FormErrorState />

              <SubmitButton size="3" style={{ width: '100%', marginTop: 4 }}>
                Sign in
              </SubmitButton>

              <Text size="2" align="center">
                <Link href="/forgot-password" style={{ color: 'var(--accent-11)' }}>
                  Forgot password?
                </Link>
              </Text>
            </Flex>
          </Form>
        </Flex>
      </Card>
    </Flex>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
