'use client';

import { InfoField } from '@/components/InfoField';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { authClient, useSession } from '@/lib/auth-client';
import { BAN_DURATIONS_SECONDS, ROLE_LABELS } from '@/lib/display';
import { formatDate, formatDateTime } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type { AdminUser } from '@/types/admin';
import type { ApiCompany } from '@tirely/types';
import NextLink from 'next/link';
import {
  AlertDialog,
  Avatar,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Grid,
  Heading,
  Link,
  Select,
  Separator,
  Spinner,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import type { UserRole } from '@tirely/types';
import { adminUserBanSchema, type AdminUserBanInput } from '@tirely/validators';
import { AlertCircle, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

interface AdminSetRoleClient {
  setRole(input: { userId: string; role: UserRole }): Promise<{
    error?: { message?: string } | null;
  }>;
}

const adminRoleClient = authClient.admin as unknown as AdminSetRoleClient;

export default function AdminUserPage() {
  const params = useParams();
  const userId = params.ID as string;
  const { data: session } = useSession();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [company, setCompany] = useState<Pick<ApiCompany, 'id' | 'name' | 'slug'> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [nameValue, setNameValue] = useState('');
  const [nameLoading, setNameLoading] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [selectedRole, setSelectedRole] = useState<UserRole>('user');
  const [roleLoading, setRoleLoading] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);

  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banLoading, setBanLoading] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);
  const [lastBanAction, setLastBanAction] = useState<'ban' | 'unban' | null>(null);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);

  const [passwordValue, setPasswordValue] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Kept because better-auth's admin client methods do not accept an AbortSignal,
  // so unmount-cancellation falls back to the ref-guard pattern.
  const isMounted = useRef(true);

  const fetchUser = useCallback(async () => {
    try {
      const result = await authClient.admin.getUser({ query: { id: userId } });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to load user');
      }

      const fetchedUser = result.data as AdminUser;

      if (isMounted.current) {
        setUser(fetchedUser);
        setNameValue(fetchedUser.name ?? '');
        setSelectedRole((fetchedUser.role as UserRole) ?? 'user');
        setError(null);
      }

      if (fetchedUser.companyId) {
        const companyResult = await authRequest<
          Pick<ApiCompany, 'id' | 'name' | 'slug' | 'status'>
        >(`/v1/admin/company-info/${fetchedUser.companyId}`);
        if (isMounted.current && !('code' in companyResult)) {
          setCompany(companyResult.data);
        }
      } else if (isMounted.current) {
        setCompany(null);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    }
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    fetchUser();

    return () => {
      isMounted.current = false;
    };
  }, [fetchUser]);

  const resetFeedback = () => {
    setNameSuccess(false);
    setNameError(null);
    setRoleSuccess(false);
    setRoleError(null);
    setBanError(null);
    setPasswordSuccess(false);
    setPasswordError(null);
  };

  const handleUpdateName = async () => {
    if (!user) return;

    setNameLoading(true);
    setNameSuccess(false);
    setNameError(null);

    try {
      const result = await authClient.admin.updateUser({
        userId,
        data: { name: nameValue.trim() },
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to update name');
      }

      setNameSuccess(true);
      await fetchUser();
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isMounted.current) {
        setNameLoading(false);
      }
    }
  };

  const handleSetRole = async () => {
    if (!user) return;

    setRoleLoading(true);
    setRoleSuccess(false);
    setRoleError(null);

    try {
      const result = await adminRoleClient.setRole({ userId, role: selectedRole });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to change role');
      }

      setRoleDialogOpen(false);
      setRoleSuccess(true);
      await fetchUser();
    } catch (err) {
      setRoleError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isMounted.current) {
        setRoleLoading(false);
      }
    }
  };

  const handleBanUser = async (
    values: AdminUserBanInput,
    setFormError: (message: string) => void,
  ) => {
    if (!user) return;

    setBanLoading(true);
    setBanError(null);
    setLastBanAction('ban');

    try {
      const result = await authClient.admin.banUser({
        userId,
        banReason: values.banReason,
        banExpiresIn: values.banExpiresIn === 'permanent' ? undefined : Number(values.banExpiresIn),
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to ban user');
      }

      setBanDialogOpen(false);
      await fetchUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setBanError(message);
      setFormError(message);
    } finally {
      if (isMounted.current) {
        setBanLoading(false);
      }
    }
  };

  const handleUnbanUser = async () => {
    if (!user) return;

    setBanLoading(true);
    setBanError(null);
    setLastBanAction('unban');

    try {
      const result = await authClient.admin.unbanUser({ userId });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to unban user');
      }

      setUnbanDialogOpen(false);
      await fetchUser();
    } catch (err) {
      setBanError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isMounted.current) {
        setBanLoading(false);
      }
    }
  };

  const handleSetPassword = async () => {
    if (!user) return;

    setPasswordLoading(true);
    setPasswordSuccess(false);
    setPasswordError(null);

    try {
      const result = await authClient.admin.setUserPassword({
        userId,
        newPassword: passwordValue,
      });

      if (result.error) {
        throw new Error(result.error.message || 'Failed to set password');
      }

      setPasswordSuccess(true);
      setPasswordValue('');
      await fetchUser();
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      if (isMounted.current) {
        setPasswordLoading(false);
      }
    }
  };

  if (error) {
    return (
      <Flex direction="column" gap="4">
        <ErrorState message={error} />
        <Button asChild variant="ghost" color="gray" style={{ alignSelf: 'flex-start' }}>
          <Link underline="none" href="/admin/users">
            <ArrowLeft size={16} /> Go back
          </Link>
        </Button>
      </Flex>
    );
  }

  if (!user) {
    return null;
  }

  const roleKey = user.role ?? 'user';
  const isSelf = user.id === session?.user.id;

  return (
    <Flex direction="column" gap="5">
      <PageHeader
        title={user.name || user.email}
        description={user.email}
        breadcrumb={
          <Flex align="center" gap="3">
            <Avatar
              src={user.image ?? undefined}
              fallback={(user.name?.[0] || 'U').toUpperCase()}
              size="3"
              radius="full"
            />
            <Flex gap="2" align="center" wrap="wrap">
              <StatusBadge kind="role" role={roleKey} />
              <StatusBadge
                kind="active"
                active={!user.banned}
                activeLabel="Active"
                inactiveLabel="Banned"
              />
            </Flex>
          </Flex>
        }
        actions={
          <Button asChild variant="ghost" color="gray">
            <Link underline="none" href="/admin/users">
              <ArrowLeft size={16} /> Back
            </Link>
          </Button>
        }
      />

      <Card>
        <Grid columns={{ initial: '1', sm: '2' }} gap="4" p="3">
          <InfoField label="Name" value={user.name || '—'} />
          <InfoField label="Email" value={user.email} />
          <InfoField label="Email Verified" value={user.emailVerified ? 'Yes' : 'No'} />
          <InfoField label="First Login" value={user.firstLogin ? 'Yes' : 'No'} />
          <InfoField
            label="Company"
            value={
              company ? (
                <Link asChild underline="hover">
                  <NextLink href={`/admin/companies/${company.slug}`}>{company.name}</NextLink>
                </Link>
              ) : user.companyId ? (
                '...'
              ) : undefined
            }
          />
          <InfoField label="Created At" value={formatDate(user.createdAt)} />
          <InfoField label="Updated At" value={formatDate(user.updatedAt)} />
        </Grid>
      </Card>

      {user.banned && (
        <Callout.Root color="red" variant="surface">
          <Callout.Icon>
            <XCircle size={16} />
          </Callout.Icon>
          <Callout.Text>
            <Text size="2" weight="medium" as="p" mb="1">
              This account is banned
            </Text>
            <Flex direction="column" gap="1">
              <Text size="2">
                <Text weight="medium">Reason: </Text>
                {user.banReason || 'No reason provided'}
              </Text>
              <Text size="2">
                <Text weight="medium">Expires: </Text>
                {user.banExpires ? formatDateTime(user.banExpires) : 'Permanent'}
              </Text>
            </Flex>
          </Callout.Text>
        </Callout.Root>
      )}

      <Flex direction="column" gap="1">
        <Text
          size="1"
          weight="medium"
          style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-11)' }}
        >
          Actions
        </Text>
      </Flex>

      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        <Card>
          <Flex direction="column" gap="3" p="3" height="100%">
            <Flex direction="column" gap="1">
              <Heading size="3">Update Name</Heading>
              <Text size="2" color="gray">
                Update this user&apos;s display name.
              </Text>
            </Flex>
            <Separator size="4" />
            <Flex direction={{ initial: 'column', sm: 'row' }} gap="2" align={{ sm: 'center' }}>
              <TextField.Root
                value={nameValue}
                onChange={(e) => {
                  resetFeedback();
                  setNameValue(e.target.value);
                }}
                placeholder="User name"
                style={{ flex: 1 }}
              />
              <Button
                onClick={handleUpdateName}
                disabled={nameLoading || nameValue.trim() === (user.name ?? '')}
              >
                {nameLoading ? <Spinner /> : 'Save'}
              </Button>
            </Flex>
            {nameError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <AlertCircle size={13} />
                </Callout.Icon>
                <Callout.Text>{nameError}</Callout.Text>
              </Callout.Root>
            )}
            {nameSuccess && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={13} />
                </Callout.Icon>
                <Callout.Text>Name updated successfully.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3" p="3" height="100%">
            <Flex direction="column" gap="1">
              <Heading size="3">Set Role</Heading>
              <Text size="2" color="gray">
                Change this user&apos;s role and access permissions.
              </Text>
            </Flex>
            <Separator size="4" />
            <Flex direction={{ initial: 'column', sm: 'row' }} gap="2" align={{ sm: 'center' }}>
              <Select.Root
                value={selectedRole}
                onValueChange={(val) => {
                  resetFeedback();
                  setSelectedRole(val as UserRole);
                }}
              >
                <Select.Trigger />
                <Select.Content>
                  <Select.Group>
                    <Select.Item value="admin">Admin</Select.Item>
                    <Select.Item value="fleet_manager">Fleet Manager</Select.Item>
                    <Select.Item value="maintenance">Maintenance</Select.Item>
                    <Select.Item value="driver">Driver</Select.Item>
                    <Select.Item value="user">User</Select.Item>
                  </Select.Group>
                </Select.Content>
              </Select.Root>

              <AlertDialog.Root open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
                <AlertDialog.Trigger>
                  <Button disabled={roleLoading || selectedRole === roleKey || isSelf}>
                    Apply
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content maxWidth="420px">
                  <AlertDialog.Title>Apply role change?</AlertDialog.Title>
                  <AlertDialog.Description>
                    This will set <strong>{user.name || user.email}</strong> to{' '}
                    <strong>{ROLE_LABELS[selectedRole] ?? selectedRole}</strong>.
                  </AlertDialog.Description>
                  <Flex justify="end" gap="3" mt="4">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button onClick={handleSetRole} disabled={roleLoading}>
                        {roleLoading ? <Spinner /> : 'Confirm'}
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Flex>
            {isSelf && (
              <Text size="1" color="gray">
                You cannot change your own role.
              </Text>
            )}
            {roleError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <AlertCircle size={13} />
                </Callout.Icon>
                <Callout.Text>{roleError}</Callout.Text>
              </Callout.Root>
            )}
            {roleSuccess && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={13} />
                </Callout.Icon>
                <Callout.Text>Role updated successfully.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3" p="3" height="100%">
            <Flex direction="column" gap="1">
              <Heading size="3">Ban / Unban</Heading>
              <Text size="2" color="gray">
                Restrict access for this user account.
              </Text>
            </Flex>
            <Separator size="4" />

            {!user.banned ? (
              <Dialog.Root open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <Dialog.Trigger>
                  <Button color="red" disabled={banLoading}>
                    Ban User
                  </Button>
                </Dialog.Trigger>
                <Dialog.Content maxWidth="520px">
                  <Dialog.Title>Ban user</Dialog.Title>
                  <Dialog.Description>
                    Provide a reason and optional duration for this ban.
                  </Dialog.Description>

                  <Form
                    schema={adminUserBanSchema}
                    defaultValues={{ banReason: '', banExpiresIn: 'permanent' }}
                    onSubmit={async (values, { setError }) =>
                      handleBanUser(values, (message) => setError('root.serverError', { message }))
                    }
                  >
                    <Flex direction="column" gap="3" mt="4">
                      <FormField name="banReason" label="Ban reason" required>
                        {(field) => (
                          <TextArea
                            {...field}
                            value={(field.value as string | undefined) ?? ''}
                            placeholder="Enter ban reason..."
                            rows={4}
                            maxLength={500}
                            onChange={(event) => {
                              setBanError(null);
                              field.onChange(event);
                            }}
                          />
                        )}
                      </FormField>

                      <FormField name="banExpiresIn" label="Duration">
                        {(field) => (
                          <Select.Root
                            value={field.value as string | undefined}
                            onValueChange={field.onChange}
                          >
                            <Select.Trigger />
                            <Select.Content>
                              <Select.Group>
                                <Select.Item value="permanent">Permanent</Select.Item>
                                <Select.Item value={String(BAN_DURATIONS_SECONDS.ONE_DAY)}>
                                  1 day
                                </Select.Item>
                                <Select.Item value={String(BAN_DURATIONS_SECONDS.SEVEN_DAYS)}>
                                  7 days
                                </Select.Item>
                                <Select.Item value={String(BAN_DURATIONS_SECONDS.THIRTY_DAYS)}>
                                  30 days
                                </Select.Item>
                                <Select.Item value={String(BAN_DURATIONS_SECONDS.NINETY_DAYS)}>
                                  90 days
                                </Select.Item>
                              </Select.Group>
                            </Select.Content>
                          </Select.Root>
                        )}
                      </FormField>

                      <FormErrorState />

                      <Flex justify="end" gap="3">
                        <Dialog.Close>
                          <Button type="button" variant="soft" color="gray">
                            Cancel
                          </Button>
                        </Dialog.Close>
                        <SubmitButton color="red" disabled={banLoading}>
                          Confirm Ban
                        </SubmitButton>
                      </Flex>
                    </Flex>
                  </Form>
                </Dialog.Content>
              </Dialog.Root>
            ) : (
              <AlertDialog.Root open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
                <AlertDialog.Trigger>
                  <Button color="green" disabled={banLoading}>
                    Unban User
                  </Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content maxWidth="420px">
                  <AlertDialog.Title>Unban this user?</AlertDialog.Title>
                  <AlertDialog.Description>
                    This will restore access for <strong>{user.name || user.email}</strong>.
                  </AlertDialog.Description>
                  <Flex justify="end" gap="3" mt="4">
                    <AlertDialog.Cancel>
                      <Button variant="soft" color="gray">
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action>
                      <Button color="green" onClick={handleUnbanUser} disabled={banLoading}>
                        {banLoading ? <Spinner /> : 'Confirm Unban'}
                      </Button>
                    </AlertDialog.Action>
                  </Flex>
                </AlertDialog.Content>
              </AlertDialog.Root>
            )}

            {banError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <AlertCircle size={13} />
                </Callout.Icon>
                <Callout.Text>{banError}</Callout.Text>
              </Callout.Root>
            )}
            {!banError && lastBanAction === 'ban' && user.banned && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <CheckCircle size={13} />
                </Callout.Icon>
                <Callout.Text>User was banned successfully.</Callout.Text>
              </Callout.Root>
            )}
            {!banError && lastBanAction === 'unban' && !user.banned && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={13} />
                </Callout.Icon>
                <Callout.Text>User was unbanned successfully.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>

        <Card>
          <Flex direction="column" gap="3" p="3" height="100%">
            <Flex direction="column" gap="1">
              <Heading size="3">Set Password</Heading>
              <Text size="2" color="gray">
                Force-reset this user&apos;s password.
              </Text>
            </Flex>
            <Separator size="4" />
            <Flex direction={{ initial: 'column', sm: 'row' }} gap="2" align={{ sm: 'center' }}>
              <TextField.Root
                type="password"
                value={passwordValue}
                onChange={(e) => {
                  resetFeedback();
                  setPasswordValue(e.target.value);
                }}
                placeholder="New password"
                style={{ flex: 1 }}
              />
              <Button
                onClick={handleSetPassword}
                disabled={passwordLoading || passwordValue.length < 8}
              >
                {passwordLoading ? <Spinner /> : 'Save'}
              </Button>
            </Flex>
            {passwordError && (
              <Callout.Root color="red" size="1">
                <Callout.Icon>
                  <AlertCircle size={13} />
                </Callout.Icon>
                <Callout.Text>{passwordError}</Callout.Text>
              </Callout.Root>
            )}
            {passwordSuccess && (
              <Callout.Root color="green" size="1">
                <Callout.Icon>
                  <CheckCircle size={13} />
                </Callout.Icon>
                <Callout.Text>Password updated successfully.</Callout.Text>
              </Callout.Root>
            )}
          </Flex>
        </Card>
      </Grid>
    </Flex>
  );
}
