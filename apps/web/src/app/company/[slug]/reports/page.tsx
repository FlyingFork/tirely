'use client';

import { useSession } from '@/lib/auth-client';
import { CHART_BUCKET, CHART_COLORS } from '@/lib/chart-colors';
import { formatInteger, formatMonth, formatNumber } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type {
  ApiBrandBenchmarkingReport,
  ApiCostSummaryReport,
  ApiInspectionComplianceReport,
  ApiReplacementForecastReport,
  ApiTireHealthDistributionReport,
  ApiUsageStatus,
} from '@tirely/types';
import {
  Badge,
  Box,
  Callout,
  Card,
  Heading,
  Link as RadixLink,
  Select,
  Table,
  Text,
  Tooltip,
} from '@radix-ui/themes';
import { AlertCircle, ArrowDown, ArrowUp, Info } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { type DependencyList, type ReactNode, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './ReportsPage.module.css';

const MANAGER_ROLES = new Set(['admin', 'fleet_manager']);
type ReportsCostSummaryRange = 6 | 12 | 24;
const COST_RANGE_OPTIONS: ReportsCostSummaryRange[] = [6, 12, 24];

const BUCKET_ORDER: Array<{
  key: ApiUsageStatus;
  label: string;
  color: string;
}> = [
  { key: 'NEW', label: 'New', color: CHART_BUCKET[0] },
  { key: 'GOOD', label: 'Good', color: CHART_BUCKET[1] },
  { key: 'MODERATE', label: 'Moderate', color: CHART_BUCKET[2] },
  { key: 'HIGH', label: 'High', color: CHART_BUCKET[3] },
  { key: 'CRITICAL', label: 'Critical', color: CHART_BUCKET[4] },
  { key: 'REPLACE_IMMEDIATELY', label: 'Replace now', color: CHART_BUCKET[5] },
];

interface PanelState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

const fetchTireHealthDistribution = (slug: string, signal: AbortSignal) =>
  authRequest<ApiTireHealthDistributionReport>(
    `/v1/company/${slug}/reports/tire-health-distribution`,
    { signal },
  );

const fetchReplacementForecast = (slug: string, signal: AbortSignal) =>
  authRequest<ApiReplacementForecastReport>(`/v1/company/${slug}/reports/replacement-forecast`, {
    signal,
  });

const fetchInspectionCompliance = (slug: string, signal: AbortSignal) =>
  authRequest<ApiInspectionComplianceReport>(
    `/v1/company/${slug}/reports/inspection-compliance`,
    { signal },
  );

const fetchBrandBenchmarking = (slug: string, signal: AbortSignal) =>
  authRequest<ApiBrandBenchmarkingReport>(`/v1/company/${slug}/reports/brand-benchmarking`, {
    signal,
  });

const fetchCostSummary = (
  slug: string,
  months: ReportsCostSummaryRange,
  signal: AbortSignal,
) =>
  authRequest<ApiCostSummaryReport>(
    `/v1/company/${slug}/reports/cost-summary?${new URLSearchParams({
      months: String(months),
    })}`,
    { signal },
  );

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function useReportPanel<T>(
  load: (signal: AbortSignal) => Promise<T>,
  dependencies: DependencyList,
): PanelState<T> {
  const [state, setState] = useState<PanelState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));

    load(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          data: null,
          error: error instanceof Error ? error.message : 'Failed to load report',
          loading: false,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
}

function InfoTooltip({ content }: { content: string }) {
  return (
    <Tooltip content={content}>
      <Info size={14} className={styles.tooltipIcon} />
    </Tooltip>
  );
}

function PanelCard({
  title,
  tooltip,
  children,
  action,
  className,
}: {
  title: string;
  tooltip: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={[styles.panelCard, className].filter(Boolean).join(' ')}>
      <div className={styles.panelBody}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitleWrap}>
            <div className={styles.panelTitle}>
              <Heading size="4">{title}</Heading>
              <InfoTooltip content={tooltip} />
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </Card>
  );
}

function PanelLoading() {
  return (
    <Text size="2" color="gray">
      Loading report...
    </Text>
  );
}

function PanelError({ message }: { message: string }) {
  return (
    <Callout.Root color="red">
      <Callout.Icon>
        <AlertCircle size={16} />
      </Callout.Icon>
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  );
}

function PanelEmpty({ message, color = 'gray' }: { message: string; color?: 'gray' | 'orange' }) {
  return (
    <Callout.Root color={color}>
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  );
}

function TireHealthDistributionPanel({ slug }: { slug: string }) {
  const state = useReportPanel<ApiTireHealthDistributionReport>(
    async (signal) => {
      const response = await fetchTireHealthDistribution(slug, signal);
      if ('code' in response) throw new Error(response.message);
      return response.data;
    },
    [slug],
  );

  const chartData = state.data
    ? BUCKET_ORDER.map((bucket) => ({
        bucket: bucket.label,
        count: state.data?.buckets[bucket.key] ?? 0,
        color: bucket.color,
      }))
    : [];

  const total = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <PanelCard
      title="Tire-Health Distribution"
      tooltip="Counts active tires by the latest usage bucket calculated by the wear algorithm."
    >
      {state.loading && !state.data ? <PanelLoading /> : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && total === 0 ? (
        <PanelEmpty message="No data yet. Tire health appears here once the company has active tires." />
      ) : null}
      {!state.loading && !state.error && total > 0 ? (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="bucket" tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} interval={0} />
              <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
              <ChartTooltip
                formatter={(value: number) => [formatInteger(Number(value)), 'Tires']}
                contentStyle={{ borderRadius: 10, borderColor: CHART_COLORS.grid }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.bucket} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </PanelCard>
  );
}

function ReplacementForecastPanel({ slug }: { slug: string }) {
  const state = useReportPanel<ApiReplacementForecastReport>(
    async (signal) => {
      const response = await fetchReplacementForecast(slug, signal);
      if ('code' in response) throw new Error(response.message);
      return response.data;
    },
    [slug],
  );

  return (
    <PanelCard
      title="Replacement Forecast"
      tooltip="Approximate count of mounted tires expected to cross 95% usage soon, based on the current wear pattern."
    >
      {state.loading && !state.data ? <PanelLoading /> : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && state.data?.trackedTires === 0 ? (
        <PanelEmpty message="No data yet. Forecasting requires mounted tires with enough lifecycle data to project wear." />
      ) : null}
      {!state.loading && !state.error && state.data && state.data.trackedTires > 0 ? (
        <>
          <Text size="2" color="gray">
            Tracking {formatInteger(state.data.trackedTires)} mounted tires with usable wear
            history.
          </Text>
          <div className={styles.kpiGrid}>
            {[
              { label: 'Next 30 days', value: state.data.next30, tone: 'red' as const },
              { label: 'Next 60 days', value: state.data.next60, tone: 'orange' as const },
              { label: 'Next 90 days', value: state.data.next90, tone: 'cyan' as const },
            ].map((item) => (
              <div key={item.label} className={styles.kpiTile}>
                <Badge color={item.tone} size="1">
                  {item.label}
                </Badge>
                <div className={styles.metricValue}>{formatInteger(item.value)}</div>
                <div className={styles.metricLabel}>Projected replacements</div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </PanelCard>
  );
}

function InspectionCompliancePanel({ slug }: { slug: string }) {
  const state = useReportPanel<ApiInspectionComplianceReport>(
    async (signal) => {
      const response = await fetchInspectionCompliance(slug, signal);
      if ('code' in response) throw new Error(response.message);
      return response.data;
    },
    [slug],
  );

  const overdueVehicles = state.data ? state.data.totalVehicles - state.data.compliantVehicles : 0;

  const chartData = state.data
    ? [
        { name: 'Compliant', value: state.data.compliantVehicles, color: CHART_COLORS.accent },
        { name: 'Overdue', value: overdueVehicles, color: CHART_COLORS.neutral },
      ]
    : [];

  return (
    <PanelCard
      title="Inspection Compliance"
      tooltip="Percentage of active vehicles with a detailed inspection newer than the company stale-inspection threshold."
    >
      {state.loading && !state.data ? <PanelLoading /> : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && state.data?.totalVehicles === 0 ? (
        <PanelEmpty message="No data yet. Compliance appears once the company has active vehicles." />
      ) : null}
      {!state.loading && !state.error && state.data && state.data.totalVehicles > 0 ? (
        <>
          <div className={styles.donutWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={94}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {chartData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <ChartTooltip
                  formatter={(value: number, name: string) => [formatInteger(Number(value)), name]}
                  contentStyle={{ borderRadius: 10, borderColor: CHART_COLORS.grid }}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={CHART_COLORS.ink}
                  fontSize="28"
                  fontWeight="700"
                >
                  {formatPercent(state.data.compliancePct)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className={styles.complianceMeta}>
            <Text size="2" color="gray">
              {formatInteger(state.data.compliantVehicles)} of{' '}
              {formatInteger(state.data.totalVehicles)} vehicles are compliant.
            </Text>
            {overdueVehicles > 0 ? (
              <RadixLink asChild>
                <Link href={`/company/${slug}/vehicles`}>
                  View overdue vehicles ({formatInteger(overdueVehicles)})
                </Link>
              </RadixLink>
            ) : (
              <Badge color="green">All vehicles compliant</Badge>
            )}
          </div>
        </>
      ) : null}
    </PanelCard>
  );
}

function BrandBenchmarkingPanel({ slug }: { slug: string }) {
  const [sortDescending, setSortDescending] = useState(true);
  const state = useReportPanel<ApiBrandBenchmarkingReport>(
    async (signal) => {
      const response = await fetchBrandBenchmarking(slug, signal);
      if ('code' in response) throw new Error(response.message);
      return response.data;
    },
    [slug],
  );

  const rows = state.data
    ? [...state.data.rows].sort((left, right) =>
        sortDescending
          ? right.avgLifespanKm - left.avgLifespanKm
          : left.avgLifespanKm - right.avgLifespanKm,
      )
    : [];

  return (
    <PanelCard
      title="Brand/Model Benchmarking"
      tooltip="Compares disposed tire lifespan by brand and model using accumulated mileage versus expected lifespan."
      className={styles.panelWide}
    >
      {state.loading && !state.data ? <PanelLoading /> : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && rows.length === 0 ? (
        <PanelEmpty
          color="orange"
          message="Benchmarking requires disposed tires for context. Dispose a tire with lifecycle data to populate this table."
        />
      ) : null}
      {!state.loading && !state.error && rows.length > 0 ? (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Brand</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Model</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>
                <button
                  type="button"
                  className={styles.tableHeaderButton}
                  onClick={() => setSortDescending((current) => !current)}
                  aria-label="Toggle average kilometer sort direction"
                >
                  Avg km {sortDescending ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                </button>
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>% of expected</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Samples</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={`${row.brand}-${row.model}`}>
                <Table.Cell>{row.brand}</Table.Cell>
                <Table.Cell>{row.model}</Table.Cell>
                <Table.Cell>{formatInteger(row.avgLifespanKm)}</Table.Cell>
                <Table.Cell>
                  {row.avgVsExpectedPct === null ? '-' : `${row.avgVsExpectedPct}%`}
                </Table.Cell>
                <Table.Cell>{formatInteger(row.samples)}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      ) : null}
    </PanelCard>
  );
}

function CostSummaryPanel({ slug }: { slug: string }) {
  const [months, setMonths] = useState<ReportsCostSummaryRange>(12);
  const state = useReportPanel<ApiCostSummaryReport>(
    async (signal) => {
      const response = await fetchCostSummary(slug, months, signal);
      if ('code' in response) throw new Error(response.message);
      return response.data;
    },
    [slug, months],
  );

  const chartData = state.data
    ? state.data.months.map((entry) => ({
        month: formatMonth(entry.month),
        total: entry.total,
      }))
    : [];

  const hasData = chartData.some((entry) => entry.total > 0);

  return (
    <PanelCard
      title="Cost Summary"
      tooltip="Aggregates maintenance-event costs by month for the selected time window. Only events with a recorded cost are counted."
      action={
        <Box className={styles.rangeControl}>
          <Select.Root
            value={String(months)}
            onValueChange={(value) => setMonths(Number(value) as ReportsCostSummaryRange)}
          >
            <Select.Trigger />
            <Select.Content>
              {COST_RANGE_OPTIONS.map((option) => (
                <Select.Item key={option} value={String(option)}>
                  Last {option} months
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Box>
      }
      className={styles.panelWide}
    >
      {state.loading && !state.data ? <PanelLoading /> : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && !hasData ? (
        <PanelEmpty message="No data yet. Cost reporting depends on maintenance events having a recorded cost." />
      ) : null}
      {!state.loading && !state.error && hasData ? (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
              <YAxis tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
              <ChartTooltip
                formatter={(value: number) => [formatNumber(Number(value)), 'Cost']}
                contentStyle={{ borderRadius: 10, borderColor: CHART_COLORS.grid }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]} fill={CHART_COLORS.accent} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </PanelCard>
  );
}

export default function ReportsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (isPending || !session) return;
    if (!MANAGER_ROLES.has(session.user.role ?? '')) {
      router.replace(`/company/${slug}`);
    }
  }, [isPending, router, session, slug]);

  if (isPending || !session) {
    return null;
  }

  if (!MANAGER_ROLES.has(session.user.role ?? '')) {
    return null;
  }

  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <div>
          <Heading size="6">Reports & Analytics</Heading>
          <Text size="2" color="gray">
            Focused fleet reporting built around tire health, compliance, lifespan, and maintenance
            cost.
          </Text>
        </div>
      </div>

      <div className={styles.panelGrid}>
        <TireHealthDistributionPanel slug={slug} />
        <ReplacementForecastPanel slug={slug} />
        <InspectionCompliancePanel slug={slug} />
        <BrandBenchmarkingPanel slug={slug} />
        <CostSummaryPanel slug={slug} />
      </div>
    </div>
  );
}
