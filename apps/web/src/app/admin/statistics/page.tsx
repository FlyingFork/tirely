'use client';

import { CHART_BUCKET, CHART_COLORS } from '@/lib/chart-colors';
import { formatInteger, formatMonth } from '@/lib/format';
import { authRequest } from '@/lib/http';
import type {
  ApiCatalogGrowthReport,
  ApiCompaniesOverTimeReport,
  ApiPlatformKpis,
  ApiPlatformTireHealthDistributionReport,
  ApiRequestFunnelReport,
  ApiUsageStatus,
} from '@tirely/types';
import { Callout, Card, Heading, Text } from '@radix-ui/themes';
import { AlertCircle } from 'lucide-react';
import { type DependencyList, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import styles from './AdminStatisticsPage.module.css';

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

const fetchPlatformKpis = (signal: AbortSignal) =>
  authRequest<ApiPlatformKpis>('/v1/admin/statistics/kpis', { signal });

const fetchCompaniesOverTime = (months: number, signal: AbortSignal) =>
  authRequest<ApiCompaniesOverTimeReport>(
    `/v1/admin/statistics/companies-over-time?${new URLSearchParams({
      months: String(months),
    })}`,
    { signal },
  );

const fetchRequestFunnel = (signal: AbortSignal) =>
  authRequest<ApiRequestFunnelReport>('/v1/admin/statistics/request-funnel', { signal });

const fetchCatalogGrowth = (months: number, signal: AbortSignal) =>
  authRequest<ApiCatalogGrowthReport>(
    `/v1/admin/statistics/catalog-growth?${new URLSearchParams({
      months: String(months),
    })}`,
    { signal },
  );

const fetchPlatformTireHealthDistribution = (signal: AbortSignal) =>
  authRequest<ApiPlatformTireHealthDistributionReport>(
    '/v1/admin/statistics/tire-health-distribution',
    { signal },
  );


function usePanelData<T>(
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
          error: error instanceof Error ? error.message : 'Failed to load statistics',
          loading: false,
        });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return state;
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

function PanelEmpty({ message }: { message: string }) {
  return (
    <Callout.Root color="gray">
      <Callout.Text>{message}</Callout.Text>
    </Callout.Root>
  );
}

function PanelCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={styles.panelCard}>
      <div className={styles.panelBody}>
        <div>
          <Heading size="4">{title}</Heading>
          <Text size="2" color="gray">
            {description}
          </Text>
        </div>
        {children}
      </div>
    </Card>
  );
}

function KpiSection() {
  const state = usePanelData<ApiPlatformKpis>(async (signal) => {
    const response = await fetchPlatformKpis(signal);
    if ('code' in response) throw new Error(response.message);
    return response.data;
  }, []);

  const cards = [
    ['Active companies', state.data?.activeCompanies ?? null],
    ['Active users', state.data?.activeUsers ?? null],
    ['Vehicles', state.data?.vehicles ?? null],
    ['Tracked tires', state.data?.tires ?? null],
    ['Inspections this month', state.data?.inspectionsThisMonth ?? null],
    ['Maintenance events this month', state.data?.maintenanceThisMonth ?? null],
  ] as const;

  return (
    <>
      {state.error ? <PanelError message={state.error} /> : null}
      <div className={styles.kpiGrid}>
        {cards.map(([label, value]) => (
          <Card key={label} className={styles.kpiCard}>
            <div className={styles.kpiBody}>
              <Text size="2" color="gray">
                {label}
              </Text>
              <div className={styles.metricValue}>
                {state.loading && value === null ? '...' : formatInteger(value ?? 0)}
              </div>
              <div className={styles.metricLabel}>
                {state.loading && value === null ? 'Loading platform metric' : 'Platform-wide'}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

function CompaniesOverTimePanel() {
  const state = usePanelData<ApiCompaniesOverTimeReport>(async (signal) => {
    const response = await fetchCompaniesOverTime(12, signal);
    if ('code' in response) throw new Error(response.message);
    return response.data;
  }, []);

  const chartData =
    state.data?.months.map((entry) => ({
      month: formatMonth(entry.month),
      count: entry.count,
    })) ?? [];
  const hasData = chartData.some((entry) => entry.count > 0);

  return (
    <PanelCard
      title="Companies Over Time"
      description="Cumulative company growth over the last 12 months."
    >
      {state.loading && !state.data ? (
        <Text size="2" color="gray">
          Loading statistics...
        </Text>
      ) : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && !hasData ? <PanelEmpty message="No data yet." /> : null}
      {!state.loading && !state.error && hasData ? (
        <div className={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [formatInteger(Number(value)), 'Companies']}
                contentStyle={{ borderRadius: 10, borderColor: CHART_COLORS.grid }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={CHART_COLORS.accent}
                strokeWidth={3}
                dot={{ r: 4, fill: CHART_COLORS.accent }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </PanelCard>
  );
}

function RequestFunnelPanel() {
  const state = usePanelData<ApiRequestFunnelReport>(async (signal) => {
    const response = await fetchRequestFunnel(signal);
    if ('code' in response) throw new Error(response.message);
    return response.data;
  }, []);

  const totalsData = state.data
    ? [
        { name: 'Pending', value: state.data.totals.pending, color: CHART_COLORS.neutral },
        { name: 'Approved', value: state.data.totals.approved, color: CHART_COLORS.accent },
        { name: 'Rejected', value: state.data.totals.rejected, color: CHART_COLORS.danger },
      ]
    : [];
  const totalRequests = totalsData.reduce((sum, item) => sum + item.value, 0);
  const monthlyData =
    state.data?.monthly.map((entry) => ({
      month: formatMonth(entry.month),
      approved: entry.approved,
      rejected: entry.rejected,
    })) ?? [];
  const hasMonthlyData = monthlyData.some((entry) => entry.approved > 0 || entry.rejected > 0);

  return (
    <PanelCard
      title="Request Approval Funnel"
      description="Request outcomes since launch plus monthly approval and rejection activity."
    >
      {state.loading && !state.data ? (
        <Text size="2" color="gray">
          Loading statistics...
        </Text>
      ) : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && totalRequests === 0 ? (
        <PanelEmpty message="No data yet." />
      ) : null}
      {!state.loading && !state.error && totalRequests > 0 ? (
        <div className={styles.splitGrid}>
          <div className={styles.donutWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={totalsData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {totalsData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
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
                  {formatInteger(totalRequests)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {hasMonthlyData ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatInteger(Number(value)),
                      name,
                    ]}
                    contentStyle={{ borderRadius: 10, borderColor: CHART_COLORS.grid }}
                  />
                  <Bar dataKey="approved" fill={CHART_COLORS.accent} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="rejected" fill={CHART_COLORS.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <PanelEmpty message="No approvals or rejections yet." />
          )}
        </div>
      ) : null}
    </PanelCard>
  );
}

function CatalogGrowthPanel() {
  const state = usePanelData<ApiCatalogGrowthReport>(async (signal) => {
    const response = await fetchCatalogGrowth(12, signal);
    if ('code' in response) throw new Error(response.message);
    return response.data;
  }, []);

  const chartData =
    state.data?.monthly.map((entry) => ({
      month: formatMonth(entry.month),
      approvedModels: entry.approvedModels,
    })) ?? [];
  const hasChartData = chartData.some((entry) => entry.approvedModels > 0);

  return (
    <PanelCard
      title="Catalog Growth"
      description="Catalog totals plus approved-model additions over the last 12 months."
    >
      {state.loading && !state.data ? (
        <Text size="2" color="gray">
          Loading statistics...
        </Text>
      ) : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && state.data ? (
        <>
          <div className={styles.tileGrid}>
            {[
              { label: 'Brands', value: state.data.totals.brands },
              { label: 'Approved models', value: state.data.totals.approvedModels },
              { label: 'Pending submissions', value: state.data.totals.pendingModels },
            ].map((item) => (
              <div key={item.label} className={styles.tile}>
                <Text size="2" color="gray">
                  {item.label}
                </Text>
                <div className={styles.metricValue}>{formatInteger(item.value)}</div>
              </div>
            ))}
          </div>

          {hasChartData ? (
            <div className={styles.chartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -18, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: CHART_COLORS.tick, fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [formatInteger(Number(value)), 'Approved models']}
                    contentStyle={{ borderRadius: 10, borderColor: CHART_COLORS.grid }}
                  />
                  <Bar dataKey="approvedModels" fill={CHART_COLORS.accent} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <PanelEmpty message="No data yet." />
          )}
        </>
      ) : null}
    </PanelCard>
  );
}

function TireHealthDistributionPanel() {
  const state = usePanelData<ApiPlatformTireHealthDistributionReport>(async (signal) => {
    const response = await fetchPlatformTireHealthDistribution(signal);
    if ('code' in response) throw new Error(response.message);
    return response.data;
  }, []);

  const distribution = state.data;
  const chartData = distribution
    ? BUCKET_ORDER.map((bucket) => ({
        label: bucket.label,
        value: distribution.buckets[bucket.key] ?? 0,
        color: bucket.color,
      }))
    : [];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <PanelCard
      title="Anonymized Tire-Health Distribution"
      description="Platform-wide tire-health buckets with no company labels or identifiers."
    >
      {state.loading && !state.data ? (
        <Text size="2" color="gray">
          Loading statistics...
        </Text>
      ) : null}
      {state.error ? <PanelError message={state.error} /> : null}
      {!state.loading && !state.error && total === 0 ? <PanelEmpty message="No data yet." /> : null}
      {!state.loading && !state.error && total > 0 ? (
        <div className={styles.splitGrid}>
          <div className={styles.donutWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={56}
                  outerRadius={88}
                  paddingAngle={2}
                  stroke="transparent"
                >
                  {chartData.map((item) => (
                    <Cell key={item.label} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
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
                  {formatInteger(total)}
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className={styles.legendList}>
            {chartData.map((item) => (
              <div key={item.label} className={styles.legendItem}>
                <span className={styles.legendLabel}>
                  <span className={styles.legendSwatch} style={{ backgroundColor: item.color }} />
                  <Text size="2">{item.label}</Text>
                </span>
                <Text size="2" weight="medium">
                  {formatInteger(item.value)}
                </Text>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </PanelCard>
  );
}

export default function AdminStatisticsPage() {
  return (
    <div className={styles.pageRoot}>
      <div className={styles.pageHeader}>
        <Heading size="6">Platform Statistics</Heading>
        <Text size="2" color="gray">
          Adoption, catalog growth, request outcomes, and anonymized tire-health distribution across
          the platform.
        </Text>
      </div>

      <KpiSection />

      <div className={styles.panelGrid}>
        <CompaniesOverTimePanel />
        <RequestFunnelPanel />
        <CatalogGrowthPanel />
        <TireHealthDistributionPanel />
      </div>
    </div>
  );
}
