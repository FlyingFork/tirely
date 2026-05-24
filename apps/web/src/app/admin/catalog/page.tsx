'use client';

import { DataTable } from '@/components/data-table';
import type { ColumnDef, DataTableProps } from '@/components/data-table';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TableSkeleton } from '@/components/feedback/Skeletons';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { StatusBadge } from '@/components/feedback/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { formatDateTime } from '@/lib/format';
import { authRequest } from '@/lib/http';
import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Flex,
  Select,
  Table,
  Tabs,
  Text,
  TextField,
  TextArea,
} from '@radix-ui/themes';
import type { ApiAdminCatalogBrand, ApiAdminCatalogModel } from '@tirely/types';
import {
  catalogBrandRenameSchema,
  catalogModelEditSchema,
  catalogModerationSchema,
  type CatalogBrandRenameInput,
  type CatalogModelEditInput,
  type CatalogModerationInput,
} from '@tirely/validators';
import { Check, Pencil, Search, XCircle } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { useToast } from '@/components/ui/toast';

const formatCategory = (category: ApiAdminCatalogModel['category']) =>
  category
    ? category
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^\w/, (c) => c.toUpperCase())
    : '—';

const formatSize = (width: number, aspectRatio: number, rimDiameter: number) =>
  `${width}/${aspectRatio}R${rimDiameter}`;

const CATEGORY_OPTIONS = [
  { value: 'STEER', label: 'Steer' },
  { value: 'DRIVE', label: 'Drive' },
  { value: 'TRAILER', label: 'Trailer' },
  { value: 'ALL_POSITION', label: 'All Position' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'OTHER', label: 'Other' },
] as const;

interface RejectionTarget {
  kind: 'model' | 'brand';
  id: string;
  label: string;
}

const BRAND_STATUS_FILTERS = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
] as const;

type AdminCatalogQuery = {
  page: number;
  perPage: number;
  status?: string;
  search?: string;
  signal?: AbortSignal;
};

const buildAdminCatalogParams = ({ page, perPage, status, search }: AdminCatalogQuery) => {
  const params = new URLSearchParams({
    page: String(page),
    perPage: String(perPage),
  });
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  return params;
};

const listAdminCatalogModels = (query: AdminCatalogQuery) =>
  authRequest<ApiAdminCatalogModel[]>(`/v1/admin/catalog/models?${buildAdminCatalogParams(query)}`, {
    signal: query.signal,
  });

const listAdminCatalogBrands = (query: AdminCatalogQuery) =>
  authRequest<ApiAdminCatalogBrand[]>(`/v1/admin/catalog/brands?${buildAdminCatalogParams(query)}`, {
    signal: query.signal,
  });

const moderateCatalogModel = (id: string, body: CatalogModerationInput) =>
  authRequest<ApiAdminCatalogModel>(`/v1/admin/catalog/models/${id}`, {
    method: 'PATCH',
    body,
  });

const moderateCatalogBrand = (id: string, body: CatalogModerationInput) =>
  authRequest<ApiAdminCatalogBrand>(`/v1/admin/catalog/brands/${id}`, {
    method: 'PATCH',
    body,
  });

const editCatalogModel = (id: string, body: CatalogModelEditInput) =>
  authRequest<ApiAdminCatalogModel>(`/v1/admin/catalog/models/${id}`, {
    method: 'PATCH',
    body,
  });

const renameCatalogBrand = (id: string, body: CatalogBrandRenameInput) =>
  authRequest<ApiAdminCatalogBrand>(`/v1/admin/catalog/brands/${id}`, {
    method: 'PATCH',
    body,
  });

export default function AdminCatalogPage() {
  const { toast } = useToast();

  const [pendingTableKey, setPendingTableKey] = useState(0);
  const [approvedTableKey, setApprovedTableKey] = useState(0);
  const [brandsRefreshKey, setBrandsRefreshKey] = useState(0);

  const [pageError, setPageError] = useState<string | null>(null);

  const [rejectionTarget, setRejectionTarget] = useState<RejectionTarget | null>(null);
  const [rejectionSaving, setRejectionSaving] = useState(false);
  const [rejectionError, setRejectionError] = useState<string | null>(null);

  const [editingModel, setEditingModel] = useState<ApiAdminCatalogModel | null>(null);
  const [editModelSaving, setEditModelSaving] = useState(false);
  const [editModelError, setEditModelError] = useState<string | null>(null);

  const [renamingBrand, setRenamingBrand] = useState<ApiAdminCatalogBrand | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [brandSearch, setBrandSearch] = useState('');
  const [brandStatusFilter, setBrandStatusFilter] =
    useState<(typeof BRAND_STATUS_FILTERS)[number]['value']>('ALL');
  const [brands, setBrands] = useState<ApiAdminCatalogBrand[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [brandsError, setBrandsError] = useState<string | null>(null);

  const refreshPendingModels = () => setPendingTableKey((value) => value + 1);
  const refreshApprovedModels = () => setApprovedTableKey((value) => value + 1);
  const refreshBrands = () => setBrandsRefreshKey((value) => value + 1);

  const refreshAll = () => {
    refreshPendingModels();
    refreshApprovedModels();
    refreshBrands();
  };

  const fetchPendingModels: DataTableProps<ApiAdminCatalogModel>['fetchData'] = useCallback(
    async (query) => {
      const response = await listAdminCatalogModels({
        page: query.page,
        perPage: query.perPage,
        status: 'PENDING',
        search: query.search,
      });

      if ('code' in response) {
        throw new Error(response.message);
      }

      return {
        data: response.data,
        total: response.meta?.total ?? 0,
      };
    },
    [],
  );

  const fetchApprovedModels: DataTableProps<ApiAdminCatalogModel>['fetchData'] = useCallback(
    async (query) => {
      const response = await listAdminCatalogModels({
        page: query.page,
        perPage: query.perPage,
        status: 'APPROVED',
        search: query.search,
      });

      if ('code' in response) {
        throw new Error(response.message);
      }

      return {
        data: response.data,
        total: response.meta?.total ?? 0,
      };
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setBrandsLoading(true);
      setBrandsError(null);

      const response = await listAdminCatalogBrands({
        page: 1,
        perPage: 200,
        status: brandStatusFilter === 'ALL' ? undefined : brandStatusFilter,
        search: brandSearch.trim() || undefined,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if ('code' in response) {
        setBrandsError(response.message);
        setBrands([]);
      } else {
        setBrands(response.data);
      }

      setBrandsLoading(false);
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [brandSearch, brandStatusFilter, brandsRefreshKey]);

  const handleApproveModel = async (model: ApiAdminCatalogModel) => {
    setPageError(null);

    const response = await moderateCatalogModel(model.id, { status: 'APPROVED' });
    if ('code' in response) {
      setPageError(response.message);
      return;
    }

    toast({ title: 'Model approved', variant: 'success' });
    refreshAll();
  };

  const handleApproveBrand = async (brand: ApiAdminCatalogBrand) => {
    setPageError(null);

    const response = await moderateCatalogBrand(brand.id, { status: 'APPROVED' });
    if ('code' in response) {
      setPageError(response.message);
      return;
    }

    toast({ title: 'Brand approved', variant: 'success' });
    refreshBrands();
  };

  const handleOpenEditModel = (model: ApiAdminCatalogModel) => {
    setEditingModel(model);
    setEditModelError(null);
  };

  const handleOpenRenameBrand = (brand: ApiAdminCatalogBrand) => {
    setRenamingBrand(brand);
    setRenameError(null);
  };

  const pendingColumns: ColumnDef<ApiAdminCatalogModel>[] = [
    {
      key: 'brand',
      label: 'Brand',
      render: (model) => (
        <Flex direction="column" gap="1">
          <Text size="2" weight="medium">
            {model.brand.name}
          </Text>
          <StatusBadge kind="catalog" status={model.brand.status} />
        </Flex>
      ),
    },
    {
      key: 'name',
      label: 'Model',
      render: (model) => <Text size="2">{model.name}</Text>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (model) => (
        <Text size="2" color="gray">
          {formatCategory(model.category)}
        </Text>
      ),
    },
    {
      key: 'sizes',
      label: 'Sizes',
      render: (model) => (
        <Flex gap="1" wrap="wrap">
          {model.sizes.map((size) => (
            <Badge key={size.id} color="gray" size="1">
              {formatSize(size.width, size.aspectRatio, size.rimDiameter)}
            </Badge>
          ))}
        </Flex>
      ),
    },
    {
      key: 'submittedByCompany',
      label: 'Submitted by',
      render: (model) => (
        <Text size="2">{model.submittedByCompany?.name ?? 'Unknown company'}</Text>
      ),
    },
    {
      key: 'createdAt',
      label: 'Submitted at',
      render: (model) => (
        <Text size="2" color="gray">
          {formatDateTime(model.createdAt)}
        </Text>
      ),
    },
    {
      key: 'tiresUsingCount',
      label: 'Tires using it',
      render: (model) => (
        <Flex direction="column" gap="1">
          <Text size="2">{model.tiresUsingCount}</Text>
          {model.tiresUsingCount === 0 && (
            <Text size="1" color="gray">
              0 tires reference this entry - safe to reject.
            </Text>
          )}
        </Flex>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (model) => (
        <Flex gap="2">
          <Button size="1" color="green" onClick={() => void handleApproveModel(model)}>
            Approve
          </Button>
          <Button
            size="1"
            color="red"
            variant="soft"
            onClick={() => {
              setRejectionTarget({
                kind: 'model',
                id: model.id,
                label: `${model.brand.name} ${model.name}`,
              });
              setRejectionError(null);
            }}
          >
            Reject
          </Button>
        </Flex>
      ),
    },
  ];

  const approvedColumns: ColumnDef<ApiAdminCatalogModel>[] = [
    {
      key: 'brand',
      label: 'Brand',
      render: (model) => <Text size="2">{model.brand.name}</Text>,
    },
    {
      key: 'name',
      label: 'Model',
      render: (model) => <Text size="2">{model.name}</Text>,
    },
    {
      key: 'category',
      label: 'Category',
      render: (model) => (
        <Text size="2" color="gray">
          {formatCategory(model.category)}
        </Text>
      ),
    },
    {
      key: 'sizes',
      label: 'Sizes',
      render: (model) => (
        <Flex gap="1" wrap="wrap">
          {model.sizes.map((size) => (
            <Badge key={size.id} color="gray" size="1">
              {formatSize(size.width, size.aspectRatio, size.rimDiameter)}
            </Badge>
          ))}
        </Flex>
      ),
    },
    {
      key: 'submittedByCompany',
      label: 'Submitted by',
      render: (model) => (
        <Text size="2">{model.submittedByCompany?.name ?? 'Unknown company'}</Text>
      ),
    },
    {
      key: 'tiresUsingCount',
      label: 'Tires using it',
      render: (model) => <Text size="2">{model.tiresUsingCount}</Text>,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (model) => (
        <Button size="1" variant="soft" onClick={() => handleOpenEditModel(model)}>
          <Pencil size={12} /> Edit
        </Button>
      ),
    },
  ];

  return (
    <Flex direction="column" gap="4">
      <PageHeader
        title="Catalog moderation"
        description="Review pending catalog submissions, edit approved entries, and keep the shared tire catalog clean."
      />

      {pageError && <ErrorState message={pageError} />}

      <Tabs.Root defaultValue="pending-models">
        <Tabs.List>
          <Tabs.Trigger value="pending-models">Pending models</Tabs.Trigger>
          <Tabs.Trigger value="approved-models">All approved</Tabs.Trigger>
          <Tabs.Trigger value="brands">Brands</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="pending-models">
          <Box pt="4">
            <DataTable
              key={`pending-${pendingTableKey}`}
              columns={pendingColumns}
              searchPlaceholder="Search pending models or brands..."
              fetchData={fetchPendingModels}
              perPage={20}
              urlPrefix="catalogPending"
              getRowKey={(row) => row.id}
            />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="approved-models">
          <Box pt="4">
            <DataTable
              key={`approved-${approvedTableKey}`}
              columns={approvedColumns}
              searchPlaceholder="Search approved models or brands..."
              fetchData={fetchApprovedModels}
              perPage={20}
              urlPrefix="catalogApproved"
              getRowKey={(row) => row.id}
            />
          </Box>
        </Tabs.Content>

        <Tabs.Content value="brands">
          <Box pt="4">
          <Flex direction="column" gap="3">
            <Card style={{ background: 'var(--surface-subtle)' }}>
              <Flex gap="3" wrap="wrap" align="center" p="3">
                <TextField.Root
                  size="2"
                  placeholder="Search brands..."
                  value={brandSearch}
                  onChange={(event) => setBrandSearch(event.target.value)}
                  style={{ flex: 1, minWidth: 160, maxWidth: 320 }}
                >
                  <TextField.Slot>
                    <Search size={14} />
                  </TextField.Slot>
                </TextField.Root>

                <Flex align="center" gap="2">
                  <Text size="2" color="gray">Status</Text>
                  <Select.Root
                    size="2"
                    value={brandStatusFilter}
                    onValueChange={(value) => setBrandStatusFilter(value as typeof brandStatusFilter)}
                  >
                    <Select.Trigger />
                    <Select.Content>
                      {BRAND_STATUS_FILTERS.map((option) => (
                        <Select.Item key={option.value} value={option.value}>
                          {option.label}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>
              </Flex>
            </Card>

            {brandsLoading ? (
              <TableSkeleton columns={['Brand', 'Status', 'Models', 'Actions'].map((label, i) => ({ key: String(i), label }))} rows={8} />
            ) : brandsError ? (
              <ErrorState message={brandsError} />
            ) : brands.length === 0 ? (
              <EmptyState icon={Search} title="No brands found" variant="plain" />
            ) : (
              <Table.Root variant="surface" size="2">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeaderCell>Brand</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Models</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {brands.map((brand) => (
                    <Table.Row key={brand.id} align="center">
                      <Table.RowHeaderCell>
                        <Text size="2" weight="medium">{brand.name}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <StatusBadge kind="catalog" status={brand.status} />
                      </Table.Cell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {brand.modelCount} model{brand.modelCount === 1 ? '' : 's'}
                        </Text>
                      </Table.Cell>
                      <Table.Cell>
                        <Flex gap="2">
                          {brand.status === 'PENDING' && (
                            <>
                              <Button
                                size="1"
                                color="green"
                                onClick={() => void handleApproveBrand(brand)}
                              >
                                <Check size={12} /> Approve
                              </Button>
                              <Button
                                size="1"
                                color="red"
                                variant="soft"
                                onClick={() => {
                                  setRejectionTarget({
                                    kind: 'brand',
                                    id: brand.id,
                                    label: brand.name,
                                  });
                                  setRejectionError(null);
                                }}
                              >
                                <XCircle size={12} /> Reject
                              </Button>
                            </>
                          )}
                          {brand.status === 'APPROVED' && (
                            <Button
                              size="1"
                              variant="soft"
                              onClick={() => handleOpenRenameBrand(brand)}
                            >
                              <Pencil size={12} /> Rename
                            </Button>
                          )}
                        </Flex>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Flex>
          </Box>
        </Tabs.Content>
      </Tabs.Root>

      <Dialog.Root
        open={rejectionTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectionTarget(null);
            setRejectionError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="480px">
          <Dialog.Title>Reject catalog entry</Dialog.Title>
          <Dialog.Description>
            Add an optional reason for rejecting <strong>{rejectionTarget?.label}</strong>.
          </Dialog.Description>

          <Form
            schema={catalogModerationSchema}
            defaultValues={{ status: 'REJECTED', rejectionReason: undefined }}
            onSubmit={async (values: CatalogModerationInput, { setError }) => {
              if (!rejectionTarget) return;

              setRejectionSaving(true);
              const body = {
                status: 'REJECTED' as const,
                ...(values.rejectionReason?.trim()
                  ? { rejectionReason: values.rejectionReason.trim() }
                  : {}),
              };

              const response =
                rejectionTarget.kind === 'model'
                  ? await moderateCatalogModel(rejectionTarget.id, body)
                  : await moderateCatalogBrand(rejectionTarget.id, body);

              setRejectionSaving(false);

              if ('code' in response) {
                setError('root.serverError', { message: response.message });
                return;
              }

              toast({ title: 'Entry rejected', variant: 'success' });
              setRejectionTarget(null);
              setPageError(null);
              if (rejectionTarget.kind === 'model') refreshPendingModels();
              else refreshBrands();
            }}
          >
            <Flex direction="column" gap="3" mt="4">
              <FormField name="rejectionReason" label="Rejection reason">
                {(field) => (
                  <TextArea
                    {...field}
                    value={(field.value as string | undefined) ?? ''}
                    placeholder="Optional rejection reason"
                    rows={4}
                    maxLength={500}
                  />
                )}
              </FormField>
              {rejectionError && <ErrorState message={rejectionError} />}
              <FormErrorState />
              <Flex justify="end" gap="3">
                <Dialog.Close>
                  <Button type="button" variant="soft" color="gray">
                    Cancel
                  </Button>
                </Dialog.Close>
                <SubmitButton color="red" disabled={rejectionSaving}>
                  <XCircle size={14} />
                  Reject
                </SubmitButton>
              </Flex>
            </Flex>
          </Form>
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={editingModel !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingModel(null);
            setEditModelError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="520px">
          <Dialog.Title>Edit approved model</Dialog.Title>
          <Dialog.Description>
            Update the visible metadata for{' '}
            <strong>
              {editingModel?.brand.name} {editingModel?.name}
            </strong>
            .
          </Dialog.Description>

          {editingModel && (
            <Form
              key={editingModel.id}
              schema={catalogModelEditSchema}
              defaultValues={{
                name: editingModel.name,
                category: editingModel.category ?? null,
                defaultInitialTreadDepth: editingModel.defaultInitialTreadDepth,
                defaultExpectedMileage: editingModel.defaultExpectedMileage,
              }}
              onSubmit={async (values: CatalogModelEditInput, { setError }) => {
                setEditModelSaving(true);
                const response = await editCatalogModel(editingModel.id, values);
                setEditModelSaving(false);

                if ('code' in response) {
                  setError('root.serverError', { message: response.message });
                  return;
                }

                toast({ title: 'Model updated', variant: 'success' });
                setEditingModel(null);
                setPageError(null);
                refreshApprovedModels();
              }}
            >
              <Flex direction="column" gap="3" mt="4">
                <FormField name="name" label="Model name" required>
                  {(field) => <TextField.Root {...field} value={field.value ?? ''} />}
                </FormField>

                <FormField name="category" label="Category">
                  {(field) => (
                    <Select.Root
                      value={(field.value as string | undefined) ?? 'NONE'}
                      onValueChange={(value) => field.onChange(value === 'NONE' ? null : value)}
                    >
                      <Select.Trigger placeholder="Category" />
                      <Select.Content>
                        <Select.Item value="NONE">No category</Select.Item>
                        {CATEGORY_OPTIONS.map((option) => (
                          <Select.Item key={option.value} value={option.value}>
                            {option.label}
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Root>
                  )}
                </FormField>

                <Flex gap="3">
                  <FormField name="defaultInitialTreadDepth" label="Default tread depth (mm)">
                    {(field) => (
                      <TextField.Root
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.value ? Number(event.target.value) : null)
                        }
                      />
                    )}
                  </FormField>
                  <FormField name="defaultExpectedMileage" label="Expected mileage (km)">
                    {(field) => (
                      <TextField.Root
                        type="number"
                        min={1000}
                        max={2000000}
                        step={1}
                        value={field.value ?? ''}
                        onChange={(event) =>
                          field.onChange(event.target.value ? Number(event.target.value) : null)
                        }
                      />
                    )}
                  </FormField>
                </Flex>

                {editModelError && <ErrorState message={editModelError} />}
                <FormErrorState />
                <Flex justify="end" gap="3">
                  <Dialog.Close>
                    <Button type="button" variant="soft" color="gray">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <SubmitButton disabled={editModelSaving}>
                    <Check size={14} />
                    Save changes
                  </SubmitButton>
                </Flex>
              </Flex>
            </Form>
          )}
        </Dialog.Content>
      </Dialog.Root>

      <Dialog.Root
        open={renamingBrand !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenamingBrand(null);
            setRenameError(null);
          }
        }}
      >
        <Dialog.Content maxWidth="420px">
          <Dialog.Title>Rename brand</Dialog.Title>
          <Dialog.Description>
            Change the global catalog name for <strong>{renamingBrand?.name}</strong>.
          </Dialog.Description>

          {renamingBrand && (
            <Form
              key={renamingBrand.id}
              schema={catalogBrandRenameSchema}
              defaultValues={{ name: renamingBrand.name }}
              onSubmit={async (values: CatalogBrandRenameInput, { setError }) => {
                setRenameSaving(true);
                const response = await renameCatalogBrand(renamingBrand.id, values);
                setRenameSaving(false);

                if ('code' in response) {
                  setError('root.serverError', { message: response.message });
                  return;
                }

                toast({ title: 'Brand renamed', variant: 'success' });
                setRenamingBrand(null);
                setPageError(null);
                refreshAll();
              }}
            >
              <Flex direction="column" gap="3" mt="4">
                <FormField name="name" label="Brand name" required>
                  {(field) => <TextField.Root {...field} placeholder="Brand name" />}
                </FormField>

                {renameError && <ErrorState message={renameError} />}
                <FormErrorState />

                <Flex justify="end" gap="3">
                  <Dialog.Close>
                    <Button type="button" variant="soft" color="gray">
                      Cancel
                    </Button>
                  </Dialog.Close>
                  <SubmitButton disabled={renameSaving}>
                    <Check size={14} />
                    Save name
                  </SubmitButton>
                </Flex>
              </Flex>
            </Form>
          )}
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  );
}
