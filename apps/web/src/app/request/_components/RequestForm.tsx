'use client';

import {
  Badge,
  Box,
  Callout,
  Flex,
  Grid,
  Heading,
  Select,
  Text,
  TextArea,
  TextField,
} from '@radix-ui/themes';
import {
  companyRequestCreationSchema,
  passwordResetRequestSchema,
  type CompanyRequestCreationInput,
  type PasswordResetRequestInput,
} from '@tirely/validators';
import type { CompanyRequest } from '@tirely/database';
import { Building2, Mail, Phone, Search, Truck, User, Warehouse } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { FormSection } from '@/components/forms/FormSection';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { publicRequest } from '@/lib/http';

import { PageShell } from './PageShell';
import { SubmissionSuccessState } from './SubmissionSuccessState';
import { FLEET_SIZE_OPTIONS, type SubmissionResult } from './shared';

const REQUEST_DEFAULTS: CompanyRequestCreationInput = {
  companyName: '',
  companyEmail: '',
  contactPersonName: '',
  contactPersonPhone: '',
  fleetSizeEstimate: '',
  depotCountEstimate: 1,
  message: '',
};

const STATUS_DEFAULTS: PasswordResetRequestInput = {
  email: '',
};

export function RequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submittedResult, setSubmittedResult] = useState<SubmissionResult | null>(null);

  if (submittedResult) {
    return (
      <PageShell>
        <SubmissionSuccessState result={submittedResult} />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Flex direction="column" gap="2" mb="6" className="anim-slide-up">
        <Badge size="2" color="cyan" variant="soft" style={{ width: 'fit-content' }}>
          Company Registration
        </Badge>
        <Heading size="7">Register your company</Heading>
        <Text size="3" color="gray" as="p">
          Fill in the form below and our team will review your request.
        </Text>
      </Flex>

      <Callout.Root variant="surface" mb="5">
        <Callout.Icon>
          <Search size={16} />
        </Callout.Icon>
        <Box style={{ width: '100%' }}>
          <Text size="2" weight="medium" as="p" mb="2">
            Already submitted? Check your request status
          </Text>
          <Form
            schema={passwordResetRequestSchema}
            defaultValues={STATUS_DEFAULTS}
            onSubmit={(values) => {
              router.push(`/request?email=${encodeURIComponent(values.email.trim())}`);
            }}
          >
            <Flex gap="2" align="end" wrap="wrap">
              <Box flexGrow="1" style={{ minWidth: 180 }}>
                <FormField name="email" label="Email" required>
                  {(field) => (
                    <TextField.Root
                      {...field}
                      type="email"
                      placeholder="contact@acmefleet.com"
                      size="2"
                    >
                      <TextField.Slot>
                        <Mail size={13} color="var(--gray-9)" />
                      </TextField.Slot>
                    </TextField.Root>
                  )}
                </FormField>
              </Box>
              <SubmitButton variant="soft" size="2">
                Check status
              </SubmitButton>
            </Flex>
          </Form>
        </Box>
      </Callout.Root>

      <Form
        schema={companyRequestCreationSchema}
        defaultValues={REQUEST_DEFAULTS}
        onSubmit={async (values, { setError }) => {
          const payload: CompanyRequestCreationInput = {
            ...values,
            companyName: values.companyName.trim(),
            companyEmail: values.companyEmail.trim(),
            contactPersonName: values.contactPersonName.trim(),
            contactPersonPhone: values.contactPersonPhone.trim(),
            message: values.message?.trim() || undefined,
          };

          const response = await publicRequest<CompanyRequest>('/v1/company/request', {
            method: 'POST',
            body: payload,
          });

          if ('code' in response) {
            setError('root.serverError', { message: response.message });
            return;
          }

          const params = new URLSearchParams(searchParams.toString());
          params.set('email', payload.companyEmail);
          router.replace(`?${params.toString()}`, { scroll: false });

          setSubmittedResult({
            id: response.data.id,
            companyName: response.data.companyName,
            companyEmail: response.data.companyEmail,
          });
        }}
      >
        <Flex direction="column" gap="4">
          <FormSection title="Company information" icon={Building2}>
            <Grid columns={{ initial: '1', sm: '2' }} gap="3">
              <FormField name="companyName" label="Company name" required>
                {(field) => (
                  <TextField.Root {...field} placeholder="Acme Fleet Ltd." maxLength={100} size="3" />
                )}
              </FormField>

              <FormField name="companyEmail" label="Company email" required>
                {(field) => (
                  <TextField.Root
                    {...field}
                    type="email"
                    placeholder="contact@acmefleet.com"
                    maxLength={255}
                    size="3"
                  >
                    <TextField.Slot>
                      <Mail size={14} color="var(--gray-9)" />
                    </TextField.Slot>
                  </TextField.Root>
                )}
              </FormField>
            </Grid>
          </FormSection>

          <FormSection title="Contact person" icon={User}>
            <Grid columns={{ initial: '1', sm: '2' }} gap="3">
              <FormField name="contactPersonName" label="Full name" required>
                {(field) => (
                  <TextField.Root {...field} placeholder="Jane Smith" maxLength={100} size="3" />
                )}
              </FormField>

              <FormField name="contactPersonPhone" label="Phone number" required>
                {(field) => (
                  <TextField.Root
                    {...field}
                    type="tel"
                    placeholder="+1 555 000 0000"
                    maxLength={30}
                    size="3"
                  >
                    <TextField.Slot>
                      <Phone size={14} color="var(--gray-9)" />
                    </TextField.Slot>
                  </TextField.Root>
                )}
              </FormField>
            </Grid>
          </FormSection>

          <FormSection title="Fleet details" icon={Truck}>
            <Grid columns={{ initial: '1', sm: '2' }} gap="3">
              <FormField name="fleetSizeEstimate" label="Fleet size estimate" required>
                {(field) => (
                  <Select.Root
                    value={field.value as string | undefined}
                    onValueChange={field.onChange}
                  >
                    <Select.Trigger
                      placeholder="Select range..."
                      style={{ width: '100%', height: 40 }}
                    />
                    <Select.Content>
                      {FLEET_SIZE_OPTIONS.map((opt) => (
                        <Select.Item key={opt.value} value={opt.value}>
                          {opt.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                )}
              </FormField>

              <FormField name="depotCountEstimate" label="Number of depots" required>
                {(field) => (
                  <TextField.Root
                    {...field}
                    type="number"
                    min={1}
                    size="3"
                    onChange={(event) => field.onChange(Number(event.target.value))}
                  >
                    <TextField.Slot>
                      <Warehouse size={14} color="var(--gray-9)" />
                    </TextField.Slot>
                  </TextField.Root>
                )}
              </FormField>
            </Grid>
          </FormSection>

          <FormSection
            title="Additional information"
            icon={Mail}
            description="Optional context for the Tirely team."
          >
            <FormField name="message" label="Message">
              {(field) => (
                <TextArea
                  {...field}
                  value={(field.value as string | undefined) ?? ''}
                  placeholder="Tell us more about your fleet, your operations, or any specific requirements..."
                  maxLength={2000}
                  rows={4}
                  size="3"
                />
              )}
            </FormField>
          </FormSection>

          <FormErrorState />

          <SubmitButton size="3" style={{ width: '100%' }}>
            Submit request
          </SubmitButton>
        </Flex>
      </Form>
    </PageShell>
  );
}
