'use client';

import { authRequest } from '@/lib/http';
import { companyUserInviteSchema, type CompanyUserInviteInput } from '@tirely/validators';
import { Button, Dialog, Flex, Select, TextField } from '@radix-ui/themes';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { useToast } from '@/components/ui/toast';

const COMPANY_ROLES = [
  { value: 'fleet_manager', label: 'Fleet Manager' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'driver', label: 'Driver' },
] as const;

type CompanyRole = CompanyUserInviteInput['role'];

interface CompanyUserInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  onSuccess: () => void;
  initialRole?: CompanyRole;
  lockRole?: boolean;
  title?: string;
  description?: string;
  submitLabel?: string;
}

const buildEmptyForm = (role: CompanyRole): CompanyUserInviteInput => ({
  email: '',
  name: '',
  role,
});

export function CompanyUserInviteDialog({
  open,
  onOpenChange,
  slug,
  onSuccess,
  initialRole = 'driver',
  lockRole = false,
  title = 'Invite user',
  description = 'The user will receive a temporary password by email and must set a new one on first login.',
  submitLabel = 'Send invite',
}: CompanyUserInviteDialogProps) {
  const { toast } = useToast();

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content maxWidth="480px">
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Description>{description}</Dialog.Description>
        {open && (
          <Form
            schema={companyUserInviteSchema}
            defaultValues={buildEmptyForm(initialRole)}
            onSubmit={async (values, { setError }) => {
              const res = await authRequest<{ id: string; email: string; role: string }>(
                `/v1/company/${slug}/users`,
                {
                  method: 'POST',
                  body: values,
                },
              );
              if ('code' in res) {
                setError('root.serverError', { message: res.message });
                return;
              }
              toast({ title: 'Invitation sent', variant: 'success' });
              handleOpenChange(false);
              onSuccess();
            }}
          >
            <Flex direction="column" gap="3" mt="4">
              <FormField name="name" label="Full name" required>
                {(field) => <TextField.Root {...field} placeholder="Jane Smith" size="3" />}
              </FormField>

              <FormField name="email" label="Email address" required>
                {(field) => (
                  <TextField.Root
                    {...field}
                    type="email"
                    placeholder="jane@example.com"
                    size="3"
                  />
                )}
              </FormField>

              <FormField name="role" label="Role" required>
                {(field) => (
                  <Select.Root
                    value={field.value as string | undefined}
                    onValueChange={field.onChange}
                    disabled={lockRole}
                  >
                    <Select.Trigger />
                    <Select.Content>
                      {COMPANY_ROLES.map((role) => (
                        <Select.Item key={role.value} value={role.value}>
                          {role.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </FormField>

              <FormErrorState />
            </Flex>
            <Flex justify="end" gap="3" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <SubmitButton>{submitLabel}</SubmitButton>
            </Flex>
          </Form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
