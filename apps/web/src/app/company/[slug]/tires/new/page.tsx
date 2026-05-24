'use client';

import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { FormSection } from '@/components/forms/FormSection';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { CatalogPicker } from '@/components/tire/CatalogPicker';
import { TireSizeSelector, EMPTY_COMPATIBLE_SIZE } from '@/components/TireSizeSelector';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type {
  ApiCatalogBrand,
  ApiCatalogModel,
  ApiCatalogSize,
  ApiDepot,
  ApiTire,
} from '@tirely/types';
import {
  tireBatchCreateSchema,
  type TireBatchCreateInput,
  type TireSizeInput,
} from '@tirely/validators';
import {
  Box,
  Button,
  Callout,
  Card,
  Flex,
  Grid,
  IconButton,
  Select,
  Text,
  TextField,
} from '@radix-ui/themes';
import { AlertTriangle, ArrowLeft, Boxes, Info, Plus, Ruler, Trash2, Warehouse } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';

interface CatalogPickerValue {
  brand: ApiCatalogBrand;
  model: ApiCatalogModel;
  size: ApiCatalogSize | null;
}

function inputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : (undefined as unknown as Date);
}

function optionalText(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const listDepots = (slug: string) =>
  authRequest<ApiDepot[]>(
    `/v1/company/${slug}/depots?${new URLSearchParams({
      page: '1',
      perPage: '100',
      sortBy: 'name',
      sortOrder: 'asc',
    })}`,
  );

function defaultValues(today: Date, depotId?: string): TireBatchCreateInput {
  return {
    brand: '',
    model: '',
    size: {
      width: EMPTY_COMPATIBLE_SIZE.width,
      aspectRatio: EMPTY_COMPATIBLE_SIZE.aspectRatio,
      rimDiameter: EMPTY_COMPATIBLE_SIZE.rimDiameter,
    },
    loadIndex: undefined,
    speedRating: undefined,
    initialTreadDepth: '' as unknown as number,
    expectedMileageLifespan: undefined,
    depotId: depotId ?? '',
    catalogModelId: undefined,
    tires: [
      {
        dotCode: undefined,
        serialNumber: undefined,
        purchaseDate: today,
        purchasePrice: undefined,
        conditionNotes: undefined,
      },
    ],
  };
}

type SharedFieldsProps = {
  depots: ApiDepot[];
  todayLabel: string;
};

function SharedFields({ depots, todayLabel: _todayLabel }: SharedFieldsProps) {
  const { getValues, setValue } = useFormContext<TireBatchCreateInput>();
  const [catalogPick, setCatalogPick] = useState<CatalogPickerValue | null>(null);
  const catalogModelStatus = catalogPick?.model.status ?? null;

  const handleCatalogChange = (pick: CatalogPickerValue) => {
    setCatalogPick(pick);
    setValue('brand', pick.brand.name, { shouldDirty: true });
    setValue('model', pick.model.name, { shouldDirty: true });
    setValue('catalogModelId', pick.model.id, { shouldDirty: true });

    if (pick.size) {
      setValue(
        'size',
        {
          width: pick.size.width,
          aspectRatio: pick.size.aspectRatio,
          rimDiameter: pick.size.rimDiameter,
        },
        { shouldDirty: true },
      );
    }

    if (pick.model.defaultInitialTreadDepth && !getValues('initialTreadDepth')) {
      setValue('initialTreadDepth', pick.model.defaultInitialTreadDepth, { shouldDirty: true });
    }

    if (pick.model.defaultExpectedMileage && !getValues('expectedMileageLifespan')) {
      setValue('expectedMileageLifespan', pick.model.defaultExpectedMileage, { shouldDirty: true });
    }
  };

  return (
    <Flex direction="column" gap="4">
      <FormSection
        title="Brand and model"
        icon={Boxes}
        description="Select from the catalog to auto-fill details, or enter the tire manually."
      >
        <Flex direction="column" gap="3">
          <CatalogPicker value={catalogPick} onChange={handleCatalogChange} />

          {catalogModelStatus === 'PENDING' && (
            <Callout.Root color="yellow" size="1">
              <Callout.Icon>
                <AlertTriangle size={14} />
              </Callout.Icon>
              <Callout.Text>
                This brand/model is pending review. The tire will still save successfully.
              </Callout.Text>
            </Callout.Root>
          )}

          {catalogModelStatus === 'REJECTED' && (
            <Callout.Root color="red" size="1">
              <Callout.Icon>
                <AlertTriangle size={14} />
              </Callout.Icon>
              <Callout.Text>
                This catalog entry was rejected for global use, but your company can still
                reference it safely.
              </Callout.Text>
            </Callout.Root>
          )}

          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            <FormField name="brand" label="Brand" required>
              {(field) => (
                <TextField.Root {...field} size="3" placeholder="e.g. Michelin" maxLength={80} />
              )}
            </FormField>
            <FormField name="model" label="Model" required>
              {(field) => (
                <TextField.Root
                  {...field}
                  size="3"
                  placeholder="e.g. X Multi Energy"
                  maxLength={120}
                />
              )}
            </FormField>
          </Grid>
        </Flex>
      </FormSection>

      <FormSection
        title="Size"
        icon={Ruler}
        description="Pre-filled from the catalog selection. Adjust if needed."
      >
        <FormField name="size" label="Tire size" required>
          {(field) => {
            const value = field.value as unknown as TireSizeInput;
            return (
              <TireSizeSelector
                value={{ ...value, axlePosition: 'ANY' }}
                onChange={(next) =>
                  field.onChange({
                    width: next.width,
                    aspectRatio: next.aspectRatio,
                    rimDiameter: next.rimDiameter,
                  })
                }
                showRemove={false}
              />
            );
          }}
        </FormField>
      </FormSection>

      <FormSection title="Shared specifications" icon={Info}>
        <Grid columns={{ initial: '1', sm: '2', md: '4' }} gap="3">
          <FormField name="loadIndex" label="Load index">
            {(field) => (
              <TextField.Root
                {...field}
                value={field.value ?? ''}
                size="3"
                placeholder="e.g. 148"
                maxLength={8}
              />
            )}
          </FormField>
          <FormField name="speedRating" label="Speed rating">
            {(field) => (
              <TextField.Root
                {...field}
                value={field.value ?? ''}
                size="3"
                placeholder="e.g. L"
                maxLength={4}
              />
            )}
          </FormField>
          <FormField name="initialTreadDepth" label="Initial tread depth (mm)" required>
            {(field) => (
              <TextField.Root
                id={field.id}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={field['aria-invalid']}
                aria-describedby={field['aria-describedby']}
                type="number"
                size="3"
                placeholder="e.g. 18"
                min={1}
                max={50}
                step={0.5}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value ? parseFloat(event.target.value) : undefined)
                }
              />
            )}
          </FormField>
          <FormField name="expectedMileageLifespan" label="Expected mileage (km)">
            {(field) => (
              <TextField.Root
                id={field.id}
                name={field.name}
                onBlur={field.onBlur}
                ref={field.ref}
                aria-invalid={field['aria-invalid']}
                aria-describedby={field['aria-describedby']}
                type="number"
                size="3"
                placeholder="e.g. 150000"
                min={1000}
                max={2000000}
                value={field.value ?? ''}
                onChange={(event) =>
                  field.onChange(event.target.value ? parseInt(event.target.value, 10) : undefined)
                }
              />
            )}
          </FormField>
        </Grid>
      </FormSection>

      <FormSection title="Depot" icon={Warehouse}>
        <FormField name="depotId" label="Depot" required>
          {(field) => (
            <Select.Root
              value={(field.value as string | undefined) ?? ''}
              onValueChange={field.onChange}
            >
              <Select.Trigger id={field.id} placeholder="Select a depot" />
              <Select.Content>
                {depots.map((depot) => (
                  <Select.Item key={depot.id} value={depot.id}>
                    {depot.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          )}
        </FormField>
      </FormSection>
    </Flex>
  );
}

function PerTireRows({ todayLabel }: { todayLabel: string }) {
  const { control } = useFormContext<TireBatchCreateInput>();
  const { fields, append, remove } = useFieldArray({ control, name: 'tires' });

  return (
    <Flex direction="column" gap="3">
      <Flex align="center" justify="between">
        <Text size="2" weight="medium">
          Individual tires{' '}
          <Text size="1" color="gray">
            ({fields.length} {fields.length === 1 ? 'tire' : 'tires'})
          </Text>
        </Text>
        <Button
          type="button"
          variant="ghost"
          size="2"
          onClick={() =>
            append({
              dotCode: undefined,
              serialNumber: undefined,
              purchaseDate: new Date(),
              purchasePrice: undefined,
              conditionNotes: undefined,
            })
          }
          disabled={fields.length >= 50}
        >
          <Plus size={14} />
          Add another tire
        </Button>
      </Flex>

      {fields.map((field, index) => (
        <Card key={field.id}>
          <Flex direction="column" gap="3" p="1">
            <Flex align="center" justify="between">
              <Text size="2" color="gray" weight="medium">
                Tire {index + 1}
              </Text>
              {fields.length > 1 && (
                <IconButton
                  type="button"
                  variant="ghost"
                  color="red"
                  size="1"
                  onClick={() => remove(index)}
                  aria-label="Remove tire"
                >
                  <Trash2 size={14} />
                </IconButton>
              )}
            </Flex>

            <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="3">
              <FormField name={`tires.${index}.dotCode`} label="DOT code">
                {(f) => (
                  <TextField.Root
                    {...f}
                    value={f.value ?? ''}
                    size="2"
                    placeholder="e.g. DOT U2LL LMLR0923"
                    maxLength={20}
                  />
                )}
              </FormField>
              <FormField name={`tires.${index}.serialNumber`} label="Serial number">
                {(f) => (
                  <TextField.Root
                    {...f}
                    value={f.value ?? ''}
                    size="2"
                    placeholder="e.g. SN-12345"
                    maxLength={40}
                  />
                )}
              </FormField>
              <FormField name={`tires.${index}.purchaseDate`} label="Purchase date" required>
                {(f) => (
                  <TextField.Root
                    id={f.id}
                    name={f.name}
                    onBlur={f.onBlur}
                    ref={f.ref}
                    aria-invalid={f['aria-invalid']}
                    aria-describedby={f['aria-describedby']}
                    type="date"
                    size="2"
                    value={
                      (f.value as unknown) instanceof Date
                        ? inputDate(f.value as unknown as Date)
                        : ''
                    }
                    max={todayLabel}
                    onChange={(event) => f.onChange(parseInputDate(event.target.value))}
                  />
                )}
              </FormField>
              <FormField name={`tires.${index}.purchasePrice`} label="Purchase price">
                {(f) => (
                  <TextField.Root
                    id={f.id}
                    name={f.name}
                    onBlur={f.onBlur}
                    ref={f.ref}
                    aria-invalid={f['aria-invalid']}
                    aria-describedby={f['aria-describedby']}
                    type="number"
                    size="2"
                    placeholder="e.g. 450.00"
                    min={0}
                    step={0.01}
                    value={f.value ?? ''}
                    onChange={(event) =>
                      f.onChange(
                        event.target.value ? parseFloat(event.target.value) : undefined,
                      )
                    }
                  />
                )}
              </FormField>
              <FormField
                name={`tires.${index}.conditionNotes`}
                label="Condition notes"
              >
                {(f) => (
                  <TextField.Root
                    {...f}
                    value={f.value ?? ''}
                    size="2"
                    placeholder="e.g. Minor sidewall scuff"
                    maxLength={500}
                  />
                )}
              </FormField>
            </Grid>
          </Flex>
        </Card>
      ))}
    </Flex>
  );
}

function NewTirePageInner() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const role = session?.user.role;
  const canManage = role === 'admin' || role === 'fleet_manager' || role === 'maintenance';
  const [today] = useState(() => new Date());
  const todayLabel = inputDate(today);
  const [depots, setDepots] = useState<ApiDepot[]>([]);
  const requestedDepotId = searchParams.get('depotId') ?? '';

  const loadDepots = useCallback(async () => {
    if (!canManage) return;
    const res = await listDepots(slug);
    if (!('code' in res)) setDepots(res.data);
  }, [canManage, slug]);

  useEffect(() => {
    if (!isPending && canManage) loadDepots();
  }, [canManage, isPending, loadDepots]);

  if (isPending || !session || !canManage) return null;

  return (
    <Flex direction="column" gap="4" className="anim-fade-in">
      <PageHeader
        title="Add tires"
        description="Create one or more tire records. Shared fields (brand, size, depot) are filled once; unique fields are entered per tire."
        breadcrumb={
          <Button variant="ghost" color="gray" asChild>
            <Link href={`/company/${slug}/tires`}>
              <ArrowLeft size={16} />
              Back to tires
            </Link>
          </Button>
        }
      />

      <Form
        schema={tireBatchCreateSchema}
        defaultValues={defaultValues(today, requestedDepotId)}
        onSubmit={async (values, { setError }) => {
          const res = await authRequest<ApiTire[]>(`/v1/company/${slug}/tires/batch`, {
            method: 'POST',
            body: {
              brand: values.brand.trim(),
              model: values.model.trim(),
              size: values.size,
              loadIndex: optionalText(values.loadIndex),
              speedRating: optionalText(values.speedRating),
              initialTreadDepth: values.initialTreadDepth,
              expectedMileageLifespan: values.expectedMileageLifespan || undefined,
              depotId: values.depotId,
              catalogModelId: optionalText(values.catalogModelId),
              tires: values.tires.map((t) => ({
                dotCode: optionalText(t.dotCode),
                serialNumber: optionalText(t.serialNumber),
                purchaseDate: t.purchaseDate,
                purchasePrice: t.purchasePrice || undefined,
                conditionNotes: optionalText(t.conditionNotes),
              })),
            },
          });

          if ('code' in res) {
            setError('root.serverError', { message: res.message });
            return;
          }

          if (res.data.length === 1 && res.data[0]) {
            router.push(`/company/${slug}/tires/${res.data[0].id}`);
          } else {
            router.push(`/company/${slug}/tires`);
          }
        }}
      >
        <Flex direction="column" gap="4" style={{ maxWidth: 800 }}>
          <SharedFields depots={depots} todayLabel={todayLabel} />

          <FormSection title="Individual tires" icon={Boxes}>
            <PerTireRows todayLabel={todayLabel} />
          </FormSection>

          <FormErrorState />
          <Box>
            <SubmitButton size="3">Save tires</SubmitButton>
          </Box>
        </Flex>
      </Form>
    </Flex>
  );
}

export default function NewTirePage() {
  return (
    <Suspense>
      <NewTirePageInner />
    </Suspense>
  );
}
