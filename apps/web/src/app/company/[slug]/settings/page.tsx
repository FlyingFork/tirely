'use client';

import { Box, Callout, Flex, Grid, Text, TextField, Tooltip } from '@radix-ui/themes';
import { companySettingsUpdateSchema, type CompanySettingsUpdateInput } from '@tirely/validators';
import { InfoIcon } from 'lucide-react';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';

import { ErrorState } from '@/components/feedback/ErrorState';
import { Form } from '@/components/forms/Form';
import { FormErrorState } from '@/components/forms/FormErrorState';
import { FormField } from '@/components/forms/FormField';
import { FormSection } from '@/components/forms/FormSection';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { useCompanyLoading } from '@/context/company-loading';
import { useSession } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiCompanySettings } from '@tirely/types';

type SettingsFields = Omit<ApiCompanySettings, 'id' | 'companyId' | 'createdAt' | 'updatedAt'>;

type SettingSpec = {
  name: keyof SettingsFields;
  label: string;
  tooltip: string;
  step?: string;
  min?: string;
  max?: string;
};

const ALGORITHM_FIELDS: SettingSpec[] = [
  {
    name: 'minimumTreadDepth',
    label: 'Minimum Tread Depth (mm)',
    tooltip: 'Tread depth below which a tire is considered unsafe. Recommended: 3.0 mm.',
    step: '0.1',
    min: '0',
    max: '20',
  },
  {
    name: 'maximumAgeMonths',
    label: 'Maximum Age (months)',
    tooltip: 'Maximum allowed tire age in months. Tires older than this are flagged.',
    min: '1',
    max: '240',
  },
  {
    name: 'defaultExpectedMileage',
    label: 'Default Expected Mileage (km)',
    tooltip: 'Expected lifespan of a tire in kilometres before replacement.',
    min: '1000',
    max: '2000000',
  },
  {
    name: 'staleInspectionThresholdDays',
    label: 'Stale Inspection Threshold (days)',
    tooltip: 'Number of days after which an inspection is considered stale.',
    min: '1',
    max: '365',
  },
  {
    name: 'defaultWearRate',
    label: 'Default Wear Rate (mm/km)',
    tooltip: 'Default tread wear per kilometre. Accepts decimal notation.',
    step: '0.000001',
    min: '0',
    max: '0.001',
  },
  {
    name: 'retreadingLifespanReduction',
    label: 'Retreading Lifespan Reduction',
    tooltip: 'Fractional reduction in remaining lifespan applied each time a tire is retreaded.',
    step: '0.01',
    min: '0',
    max: '1',
  },
  {
    name: 'maxRetreadingCycles',
    label: 'Max Retreading Cycles',
    tooltip: 'Maximum number of times a tire can be retreaded.',
    min: '0',
    max: '10',
  },
];

const WEIGHT_FIELDS: SettingSpec[] = [
  {
    name: 'treadWeight',
    label: 'Tread Weight',
    tooltip: 'Weight of tread depth in the usage score.',
    step: '0.01',
    min: '0',
    max: '1',
  },
  {
    name: 'mileageWeight',
    label: 'Mileage Weight',
    tooltip: 'Weight of accumulated mileage in the usage score.',
    step: '0.01',
    min: '0',
    max: '1',
  },
  {
    name: 'ageWeight',
    label: 'Age Weight',
    tooltip: 'Weight of tire age in the usage score.',
    step: '0.01',
    min: '0',
    max: '1',
  },
  {
    name: 'conditionWeight',
    label: 'Condition Weight',
    tooltip: 'Weight of physical condition in the usage score.',
    step: '0.01',
    min: '0',
    max: '1',
  },
];

const THRESHOLD_FIELDS: SettingSpec[] = [
  {
    name: 'alertInfoThreshold',
    label: 'Info Threshold (%)',
    tooltip: 'Usage percentage at which an informational alert is raised.',
    min: '0',
    max: '100',
  },
  {
    name: 'alertUrgentThreshold',
    label: 'Urgent Threshold (%)',
    tooltip: 'Usage percentage at which an urgent alert is raised.',
    min: '0',
    max: '100',
  },
  {
    name: 'alertCriticalThreshold',
    label: 'Critical Threshold (%)',
    tooltip: 'Usage percentage at which a critical alert is raised.',
    min: '0',
    max: '100',
  },
  {
    name: 'imbalanceThreshold',
    label: 'Imbalance Threshold (%)',
    tooltip: 'Wear difference across a tire set that triggers an imbalance alert.',
    min: '0',
    max: '100',
  },
];

function toDefaults(settings: ApiCompanySettings): CompanySettingsUpdateInput {
  return {
    minimumTreadDepth: settings.minimumTreadDepth,
    maximumAgeMonths: settings.maximumAgeMonths,
    defaultExpectedMileage: settings.defaultExpectedMileage,
    staleInspectionThresholdDays: settings.staleInspectionThresholdDays,
    defaultWearRate: settings.defaultWearRate,
    retreadingLifespanReduction: settings.retreadingLifespanReduction,
    maxRetreadingCycles: settings.maxRetreadingCycles,
    treadWeight: settings.treadWeight,
    mileageWeight: settings.mileageWeight,
    ageWeight: settings.ageWeight,
    conditionWeight: settings.conditionWeight,
    alertInfoThreshold: settings.alertInfoThreshold,
    alertUrgentThreshold: settings.alertUrgentThreshold,
    alertCriticalThreshold: settings.alertCriticalThreshold,
    imbalanceThreshold: settings.imbalanceThreshold,
  };
}

function SettingField({ spec }: { spec: SettingSpec }) {
  return (
    <FormField name={spec.name} label={spec.label} required>
      {(field) => (
        <Box>
          <Flex align="center" gap="1" mb="1">
            <Tooltip content={spec.tooltip}>
              <Text size="1" color="gray" style={{ cursor: 'help' }}>
                <InfoIcon size={16} />
              </Text>
            </Tooltip>
          </Flex>
          <TextField.Root
            {...field}
            type="number"
            step={spec.step ?? '1'}
            min={spec.min}
            max={spec.max}
            size="3"
            onChange={(event) => field.onChange(Number(event.target.value))}
          />
        </Box>
      )}
    </FormField>
  );
}

function SettingsGuidance() {
  const values = useWatch<CompanySettingsUpdateInput>();
  const weights = [
    values.treadWeight,
    values.mileageWeight,
    values.ageWeight,
    values.conditionWeight,
  ].filter((value): value is number => typeof value === 'number' && !Number.isNaN(value));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);
  const hasAllWeights = weights.length === 4;
  const weightDiff = Math.abs(weightSum - 1);
  const thresholdsOutOfOrder =
    typeof values.alertInfoThreshold === 'number' &&
    typeof values.alertUrgentThreshold === 'number' &&
    typeof values.alertCriticalThreshold === 'number' &&
    (values.alertInfoThreshold > values.alertUrgentThreshold ||
      values.alertUrgentThreshold > values.alertCriticalThreshold);

  return (
    <Flex direction="column" gap="2">
      {hasAllWeights ? (
        <Callout.Root color={weightDiff < 0.001 ? 'green' : 'orange'} size="1">
          <Callout.Text>
            Algorithm weights total {weightSum.toFixed(2)}. They must total 1.00 before saving.
          </Callout.Text>
        </Callout.Root>
      ) : null}
      {thresholdsOutOfOrder ? (
        <Callout.Root color="orange" size="1">
          <Callout.Text>
            Alert thresholds should be ordered info {'<='} urgent {'<='} critical.
          </Callout.Text>
        </Callout.Root>
      ) : null}
    </Flex>
  );
}

export default function CompanySettingsPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { setIsPageLoading } = useCompanyLoading();
  const { data: session, isPending } = useSession();
  const canManage = session?.user.role === 'admin' || session?.user.role === 'fleet_manager';

  const [settings, setSettings] = useState<ApiCompanySettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!canManage) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsPageLoading(true);
    const res = await authRequest<ApiCompanySettings>(`/v1/company/${slug}/settings`, {
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;
    setIsPageLoading(false);

    if ('code' in res) {
      setLoadError(res.message);
      return;
    }

    setSettings(res.data);
  }, [canManage, slug, setIsPageLoading]);

  useEffect(() => {
    if (isPending || !canManage) return;
    load();
    return () => abortRef.current?.abort();
  }, [canManage, isPending, load]);

  if (isPending || !session || !canManage) return null;

  if (loadError) {
    return (
      <Box p="6">
        <ErrorState message={loadError} />
      </Box>
    );
  }

  if (!settings) return null;

  return (
    <Box p={{ initial: '4', sm: '6' }}>
      <PageHeader
        title="Company Settings"
        description="Tune the tire usage algorithm, scoring weights, and alert thresholds"
      />

      <Form
        key={settings.updatedAt}
        schema={companySettingsUpdateSchema}
        defaultValues={toDefaults(settings)}
        onSubmit={async (values, { setError }) => {
          setSaveSuccess(false);
          const res = await authRequest<ApiCompanySettings>(`/v1/company/${slug}/settings`, {
            method: 'PATCH',
            body: values,
          });

          if ('code' in res) {
            const detail =
              res.details && typeof res.details === 'object' && 'fieldErrors' in res.details
                ? Object.values(res.details.fieldErrors as Record<string, string[]>)
                    .flat()
                    .join(', ')
                : res.message;
            setError('root.serverError', { message: detail });
            return;
          }

          setSettings(res.data);
          setSaveSuccess(true);
        }}
      >
        <Flex direction="column" gap="5">
          <FormSection title="Algorithm Parameters">
            <Grid columns={{ initial: '1', sm: '2' }} gap="4">
              {ALGORITHM_FIELDS.map((field) => (
                <SettingField key={field.name} spec={field} />
              ))}
            </Grid>
          </FormSection>

          <FormSection
            title="Algorithm Weights"
            description="All four weights must sum to exactly 1.0."
          >
            <Grid columns={{ initial: '1', sm: '2' }} gap="4">
              {WEIGHT_FIELDS.map((field) => (
                <SettingField key={field.name} spec={field} />
              ))}
            </Grid>
          </FormSection>

          <FormSection
            title="Alert Thresholds (%)"
            description="Usage percentage at which each alert level is triggered."
          >
            <Grid columns={{ initial: '1', sm: '2' }} gap="4">
              {THRESHOLD_FIELDS.map((field) => (
                <SettingField key={field.name} spec={field} />
              ))}
            </Grid>
          </FormSection>

          <SettingsGuidance />

          <FormErrorState />

          {saveSuccess && (
            <Callout.Root color="green">
              <Callout.Text>Settings updated successfully.</Callout.Text>
            </Callout.Root>
          )}

          <Flex justify="end">
            <SubmitButton size="3">Save changes</SubmitButton>
          </Flex>
        </Flex>
      </Form>
    </Box>
  );
}
