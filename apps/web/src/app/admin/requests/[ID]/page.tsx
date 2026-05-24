'use client';

import { InfoField } from '@/components/InfoField';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionCard } from '@/components/layout/SectionCard';
import { useAdminLoading } from '@/context/admin-loading';
import { formatDate } from '@/lib/format';
import { authRequest } from '@/lib/http';
import { useToast } from '@/components/ui/toast';
import {
  AlertDialog,
  Button,
  Callout,
  Card,
  Dialog,
  Flex,
  Grid,
  Link,
  Separator,
  Text,
  TextArea,
} from '@radix-ui/themes';
import type { CompanyRequest } from '@tirely/database';
import { adminRequestRejectSchema, type AdminRequestRejectInput } from '@tirely/validators';
import { ArrowLeft, Building2, CheckCircle, XCircle } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ApiState {
  data: CompanyRequest | null;
  error: string | null;
}

const fetchAdminRequest = (id: string, signal?: AbortSignal) =>
  authRequest<CompanyRequest>(`/v1/company/request/${id}`, { signal });

const updateAdminRequest = (
  id: string,
  body: { status: CompanyRequest['status']; rejectionReason?: string },
) => authRequest<CompanyRequest>(`/v1/company/request/${id}`, { method: 'PATCH', body });

export default function AdminRequestPage() {
  const params = useParams();
  const id = params.ID as string;

  const { setIsPageLoading } = useAdminLoading();
  const { toast } = useToast();
  const [state, setState] = useState<ApiState>({ data: null, error: null });

  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsPageLoading(true);

    fetchAdminRequest(id, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        if ('code' in response) {
          setState({ data: null, error: response.message });
          return;
        }
        setState({ data: response.data, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        setState({ data: null, error: errorMessage });
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsPageLoading(false);
        }
      });

    return () => controller.abort();
  }, [id, setIsPageLoading]);

  const handleApprove = async () => {
    setIsPageLoading(true);
    try {
      const response = await updateAdminRequest(id, { status: 'APPROVED' });

      if ('code' in response) {
        setState((prev) => ({ ...prev, error: response.message }));
        return;
      }

      toast({ title: 'Request approved', variant: 'success' });
      const refreshed = await fetchAdminRequest(id);
      if (!('code' in refreshed)) setState({ data: refreshed.data, error: null });
    } finally {
      setIsPageLoading(false);
    }
  };

  const handleReject = async (
    values: AdminRequestRejectInput,
    setError: (message: string) => void,
  ) => {
    setIsPageLoading(true);

    try {
      const response = await updateAdminRequest(id, {
        status: 'REJECTED',
        rejectionReason: values.rejectionReason,
      });

      if ('code' in response) {
        setError(response.message);
        return;
      }

      toast({ title: 'Request rejected', variant: 'success' });
      setRejectionDialogOpen(false);
      const refreshed = await fetchAdminRequest(id);
      if (!('code' in refreshed)) setState({ data: refreshed.data, error: null });
    } finally {
      setIsPageLoading(false);
    }
  };

  const { data, error } = state;

  if (error) {
    return (
      <Flex direction="column" gap="4">
        <ErrorState message={error} />
        <Button asChild variant="ghost" color="gray" style={{ alignSelf: 'flex-start' }}>
          <Link underline="none" href="/admin/requests">
            <ArrowLeft size={16} /> Go back
          </Link>
        </Button>
      </Flex>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Flex direction="column" gap="5">
      <PageHeader
        title={data.companyName}
        description="Company onboarding request details"
        actions={
          <>
            <StatusBadge kind="request" status={data.status} />
            <Button asChild variant="ghost" color="gray">
              <Link underline="none" href="/admin/requests">
                <ArrowLeft size={16} /> Back
              </Link>
            </Button>
          </>
        }
      />

      <SectionCard title="Request Details" icon={Building2}>
        <Grid columns={{ initial: '1', sm: '2' }} gap="4">
          <InfoField label="Company Email" value={data.companyEmail} />
          <InfoField label="Contact Person" value={data.contactPersonName} />
          <InfoField label="Phone" value={data.contactPersonPhone} />
          <InfoField label="Fleet Size Estimate" value={data.fleetSizeEstimate} />
          <InfoField label="Depot Count Estimate" value={String(data.depotCountEstimate)} />
          <InfoField label="Submitted" value={formatDate(data.createdAt)} />
        </Grid>
        {data.message && (
          <>
            <Separator size="4" mt="4" />
            <InfoField label="Message" value={data.message} />
          </>
        )}
      </SectionCard>

      {data.reviewedAt && (
        <Card>
          <Grid columns={{ initial: '1', sm: '2' }} gap="4" p="3">
            <InfoField label="Reviewed At" value={formatDate(data.reviewedAt)} />
            {data.reviewedByUserId && (
              <InfoField label="Reviewed By" value={data.reviewedByUserId} />
            )}
          </Grid>
        </Card>
      )}

      {data.status === 'REJECTED' && data.rejectionReason && (
        <Callout.Root color="red" variant="surface">
          <Callout.Icon>
            <XCircle size={16} />
          </Callout.Icon>
          <Callout.Text>
            <Text size="2" weight="medium" mb="1" mr="2">
              Rejection reason
            </Text>
            <Text size="2">{data.rejectionReason}</Text>
          </Callout.Text>
        </Callout.Root>
      )}

      {data.status === 'APPROVED' && (
        <Callout.Root color="green" variant="surface">
          <Callout.Icon>
            <CheckCircle size={16} />
          </Callout.Icon>
          <Callout.Text>This request has been approved.</Callout.Text>
        </Callout.Root>
      )}

      {data.status === 'PENDING' && (
        <Flex direction="row" gap="3" mt="2">
          <AlertDialog.Root>
            <AlertDialog.Trigger>
              <Button color="green">Approve</Button>
            </AlertDialog.Trigger>
            <AlertDialog.Content maxWidth="420px">
              <AlertDialog.Title>Approve this request?</AlertDialog.Title>
              <AlertDialog.Description>
                This will approve <strong>{data.companyName}</strong>&apos;s company request.
              </AlertDialog.Description>
              <Flex justify="end" gap="3" mt="4">
                <AlertDialog.Cancel>
                  <Button variant="soft" color="gray">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action>
                  <Button color="green" onClick={handleApprove}>
                    Confirm Approval
                  </Button>
                </AlertDialog.Action>
              </Flex>
            </AlertDialog.Content>
          </AlertDialog.Root>

          <Dialog.Root open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
            <Dialog.Trigger>
              <Button color="red">Reject</Button>
            </Dialog.Trigger>
            <Dialog.Content maxWidth="480px">
              <Dialog.Title>Reject this request</Dialog.Title>
              <Dialog.Description>
                Provide a reason for rejecting <strong>{data.companyName}</strong>&apos;s company
                request.
              </Dialog.Description>
              <Form
                schema={adminRequestRejectSchema}
                defaultValues={{ rejectionReason: '' }}
                onSubmit={async (values, { setError }) =>
                  handleReject(values, (message) => setError('root.serverError', { message }))
                }
              >
                <Flex direction="column" gap="3" mt="4">
                  <FormField name="rejectionReason" label="Rejection reason" required>
                    {(field) => (
                      <TextArea
                        {...field}
                        value={(field.value as string | undefined) ?? ''}
                        placeholder="Enter rejection reason..."
                        rows={4}
                        maxLength={500}
                      />
                    )}
                  </FormField>
                  <FormErrorState />
                  <Flex justify="end" gap="3">
                    <Dialog.Close>
                      <Button type="button" variant="soft" color="gray">
                        Cancel
                      </Button>
                    </Dialog.Close>
                    <SubmitButton color="red">Confirm Rejection</SubmitButton>
                  </Flex>
                </Flex>
              </Form>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      )}
    </Flex>
  );
}
