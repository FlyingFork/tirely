'use client';

import { useEffect, useState } from 'react';

import { Badge, Card, Flex, Grid, Heading, Skeleton, Text } from '@radix-ui/themes';
import {
  BarChart3,
  BookOpenText,
  Building2,
  ClipboardList,
  Package,
  Users,
  Wrench,
} from 'lucide-react';
import type { ApiPlatformKpis } from '@tirely/types';

import { PageHeader } from '@/components/layout/PageHeader';
import { authRequest } from '@/lib/http';

import AdminCard from './components/AdminCard';
import styles from './page.module.css';

interface KpiState {
  data: ApiPlatformKpis | null;
  loading: boolean;
}

const statTiles = (kpis: ApiPlatformKpis) => [
  { label: 'Active companies', value: kpis.activeCompanies, icon: Building2 },
  { label: 'Platform users', value: kpis.activeUsers, icon: Users },
  { label: 'Inspections this month', value: kpis.inspectionsThisMonth, icon: ClipboardList },
  { label: 'Maintenance this month', value: kpis.maintenanceThisMonth, icon: Wrench },
];

export default function AdminPage() {
  const [kpis, setKpis] = useState<KpiState>({ data: null, loading: true });

  useEffect(() => {
    const controller = new AbortController();

    authRequest<ApiPlatformKpis>('/v1/admin/statistics/kpis', {
      signal: controller.signal,
    }).then((response) => {
      if (controller.signal.aborted) return;
      if ('code' in response) {
        setKpis({ data: null, loading: false });
        return;
      }
      setKpis({ data: response.data, loading: false });
    });

    return () => controller.abort();
  }, []);

  return (
    <Flex direction="column" gap="4">
      <PageHeader title="Admin Dashboard" description="Platform-wide overview and operations" />

      <Card>
        <Flex className={styles.welcomeCard} p="4">
          <Flex direction="column" gap="1">
            <Heading size="4">Platform overview</Heading>
            <Text size="2" color="gray">
              Monitor companies, users, and platform activity from here.
            </Text>
          </Flex>
          <Badge size="2" color="cyan" variant="soft">
            Platform admin
          </Badge>
        </Flex>
      </Card>

      <div className={styles.statGrid}>
        {kpis.loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <Flex className={styles.statTile} direction="column" gap="2">
                  <Skeleton
                    width="36px"
                    height="36px"
                    style={{ borderRadius: 'var(--radius-md)' }}
                  />
                  <Skeleton width="60px" height="28px" />
                  <Skeleton width="120px" height="16px" />
                </Flex>
              </Card>
            ))
          : kpis.data
            ? statTiles(kpis.data).map(({ label, value, icon: Icon }) => (
                <Card key={label}>
                  <div className={styles.statTile}>
                    <div className={styles.statIconWrap}>
                      <Icon size={16} />
                    </div>
                    <span className={styles.statValue}>{value.toLocaleString()}</span>
                    <span className={styles.statLabel}>{label}</span>
                  </div>
                </Card>
              ))
            : null}
      </div>

      <Grid columns={{ initial: '1', sm: '2', lg: '3' }} gap="3">
        <AdminCard
          icon={BookOpenText}
          title="Requests"
          description="Review new company onboarding requests."
          href="/admin/requests"
        />
        <AdminCard
          icon={Users}
          title="Users"
          description="Manage platform users and role assignments."
          href="/admin/users"
        />
        <AdminCard
          icon={Building2}
          title="Companies"
          description="View company status, growth, and access controls."
          href="/admin/companies"
        />
        <AdminCard
          icon={ClipboardList}
          title="Audit Logs"
          description="Inspect critical events and platform activity."
          href="/admin/audit-logs"
        />
        <AdminCard
          icon={Package}
          title="Catalog"
          description="Moderate shared tire catalog submissions."
          href="/admin/catalog"
        />
        <AdminCard
          icon={BarChart3}
          title="Statistics"
          description="Track adoption, usage, and operational metrics."
          href="/admin/statistics"
        />
      </Grid>
    </Flex>
  );
}
