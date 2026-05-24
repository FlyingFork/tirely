'use client';

import { useState } from 'react';

import { Box, Callout, Card, Flex, Heading, IconButton, Separator, Text, TextField } from '@radix-ui/themes';
import { CheckCircle, Eye, EyeOff } from 'lucide-react';
import {
  profileNameSchema,
  profilePasswordSchema,
  type ProfileNameInput,
  type ProfilePasswordInput,
} from '@tirely/validators';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { authClient } from '@/lib/auth-client';

function ProfileNameForm({ email, name }: { email: string; name: string }) {
  const [success, setSuccess] = useState(false);

  return (
    <Card>
      <Flex direction="column" gap="5" p="2">
        <Flex direction="column" gap="1">
          <Heading size="4">Account Information</Heading>
          <Text size="2" color="gray">
            Update your personal details.
          </Text>
        </Flex>

        <Separator size="4" />

        <Form<ProfileNameInput>
          schema={profileNameSchema}
          defaultValues={{ name }}
          onSubmit={async (values, { setError }) => {
            setSuccess(false);
            const { error } = await authClient.updateUser({ name: values.name.trim() });
            if (error) {
              setError('root.serverError', { message: error.message ?? 'Failed to update name' });
              return;
            }
            setSuccess(true);
          }}
        >
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text size="2" weight="medium">
                Email
              </Text>
              <TextField.Root value={email} disabled size="3" />
              <Text size="1" color="gray">
                Email cannot be changed.
              </Text>
            </Flex>

            <FormField name="name" label="Name" required>
              {(field) => <TextField.Root {...field} placeholder="Your name" size="3" />}
            </FormField>

            <FormErrorState />

            {success && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={14} />
                </Callout.Icon>
                <Callout.Text>Name updated successfully.</Callout.Text>
              </Callout.Root>
            )}

            <Box>
              <SubmitButton>Save Changes</SubmitButton>
            </Box>
          </Flex>
        </Form>
      </Flex>
    </Card>
  );
}

function ProfilePasswordForm() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [success, setSuccess] = useState(false);

  const defaults: ProfilePasswordInput = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  };

  return (
    <Card>
      <Flex direction="column" gap="5" p="2">
        <Flex direction="column" gap="1">
          <Heading size="4">Security</Heading>
          <Text size="2" color="gray">
            Change your password. All other active sessions will be signed out.
          </Text>
        </Flex>

        <Separator size="4" />

        <Form<ProfilePasswordInput>
          schema={profilePasswordSchema}
          defaultValues={defaults}
          onSubmit={async (values, { setError, reset }) => {
            setSuccess(false);
            const { error } = await authClient.changePassword({
              currentPassword: values.currentPassword,
              newPassword: values.newPassword,
              revokeOtherSessions: true,
            });

            if (error) {
              setError('root.serverError', {
                message: error.message ?? 'Failed to change password',
              });
              return;
            }

            reset(defaults);
            setSuccess(true);
          }}
        >
          <Flex direction="column" gap="4">
            <FormField name="currentPassword" label="Current Password" required>
              {(field) => (
                <TextField.Root
                  {...field}
                  type={showCurrent ? 'text' : 'password'}
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
                      onClick={() => setShowCurrent((value) => !value)}
                      style={{ cursor: 'pointer' }}
                      aria-label={showCurrent ? 'Hide password' : 'Show password'}
                    >
                      {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
                    </IconButton>
                  </TextField.Slot>
                </TextField.Root>
              )}
            </FormField>

            <FormField name="newPassword" label="New Password" description="Minimum 8 characters" required>
              {(field) => (
                <TextField.Root
                  {...field}
                  type={showNew ? 'text' : 'password'}
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
                      onClick={() => setShowNew((value) => !value)}
                      style={{ cursor: 'pointer' }}
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
                    </IconButton>
                  </TextField.Slot>
                </TextField.Root>
              )}
            </FormField>

            <FormField name="confirmPassword" label="Confirm New Password" required>
              {(field) => (
                <TextField.Root
                  {...field}
                  type={showNew ? 'text' : 'password'}
                  placeholder="********"
                  autoComplete="new-password"
                  size="3"
                />
              )}
            </FormField>

            <FormErrorState />

            {success && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={14} />
                </Callout.Icon>
                <Callout.Text>Password changed successfully.</Callout.Text>
              </Callout.Root>
            )}

            <Box>
              <SubmitButton>Change Password</SubmitButton>
            </Box>
          </Flex>
        </Form>
      </Flex>
    </Card>
  );
}

export function ProfileSettings() {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  if (!user) return null;

  return (
    <Flex direction="column" gap="6" style={{ maxWidth: 600 }}>
      <PageHeader title="Profile Settings" />
      <ProfileNameForm email={user.email ?? ''} name={user.name ?? ''} />
      <ProfilePasswordForm />
    </Flex>
  );
}
