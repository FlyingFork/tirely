'use client';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiDepot } from '@tirely/types';
import { depotCreateSchema, type DepotCreateInput } from '@tirely/validators';
import { Box, Button, Card, Flex, TextArea, TextField } from '@radix-ui/themes';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const EMPTY_FORM: DepotCreateInput = { name: '', address: undefined, contactInfo: undefined };

export default function NewDepotPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  if (isPending || !session || !canManage) return null;

  return (
    <Flex direction="column" gap="4">
      <Flex align="center" gap="2">
        <Button variant="ghost" color="gray" asChild>
          <Link href={`/company/${slug}/depots`}>
            <ArrowLeft size={16} />
            Back to depots
          </Link>
        </Button>
      </Flex>

      <PageHeader title="Add depot" description="Create a physical fleet location" />

      <Card style={{ maxWidth: 560 }}>
        <Box p="2">
          <Form
            schema={depotCreateSchema}
            defaultValues={EMPTY_FORM}
            onSubmit={async (values, { setError }) => {
              const res = await authRequest<ApiDepot>(`/v1/company/${slug}/depots`, {
                method: 'POST',
                body: {
                  name: values.name.trim(),
                  ...(values.address?.trim() ? { address: values.address.trim() } : {}),
                  ...(values.contactInfo?.trim() ? { contactInfo: values.contactInfo.trim() } : {}),
                },
              });
              if ('code' in res) {
                setError('root.serverError', { message: res.message });
                return;
              }
              router.push(`/company/${slug}/depots/${res.data.id}`);
            }}
          >
            <Flex direction="column" gap="4">
              <FormField name="name" label="Name" required>
                {(field) => (
                  <TextField.Root {...field} placeholder="e.g. Bucharest North" size="3" />
                )}
              </FormField>

              <FormField name="address" label="Address">
                {(field) => (
                  <TextArea
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                    placeholder="Street, city, postal code"
                    rows={3}
                    size="3"
                  />
                )}
              </FormField>

              <FormField name="contactInfo" label="Contact info">
                {(field) => (
                  <TextArea
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                    placeholder="Phone number, email, or other contact details"
                    rows={3}
                    size="3"
                  />
                )}
              </FormField>

              <FormErrorState />

              <Box>
                <SubmitButton>Save depot</SubmitButton>
              </Box>
            </Flex>
          </Form>
        </Box>
      </Card>
    </Flex>
  );
}
