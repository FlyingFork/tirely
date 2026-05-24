'use client';

import { DashboardLayout } from '@/components/layout/dashboard/DashboardLayout';
import type { DashboardNavGroup } from '@/components/layout/dashboard/types';
import { LoadingPage } from '@/components/layout/LoadingPage';
import { CompanyLoadingProvider, useCompanyLoading } from '@/context/company-loading';
import { signOut, authClient, type SessionUser } from '@/lib/auth-client';
import { authRequest } from '@/lib/http';
import type { ApiCompany } from '@tirely/types';
import { DropdownMenu, IconButton } from '@radix-ui/themes';
import {
  ClipboardList,
  BarChart3,
  Gauge,
  Layers,
  LayoutDashboard,
  MoreHorizontal,
  ScrollText,
  Settings,
  Truck,
  UserRound,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

function getCompanyNavGroups(slug: string, role: string | null | undefined): DashboardNavGroup[] {
  const groups: DashboardNavGroup[] = [
    {
      label: 'Company',
      items: [
        { label: 'Overview', href: `/company/${slug}`, icon: LayoutDashboard },
        ...(role === 'admin' || role === 'fleet_manager'
          ? [
              { label: 'Users', href: `/company/${slug}/users`, icon: Users },
              { label: 'Drivers', href: `/company/${slug}/drivers`, icon: UserRound },
            ]
          : []),
      ],
    },
    {
      label: 'Fleet',
      items: [
        { label: 'Depots', href: `/company/${slug}/depots`, icon: Warehouse },
        { label: 'Vehicles', href: `/company/${slug}/vehicles`, icon: Truck },
        { label: 'Tires', href: `/company/${slug}/tires`, icon: Gauge },
        ...(role === 'admin' || role === 'fleet_manager' || role === 'maintenance'
          ? [{ label: 'Tire sets', href: `/company/${slug}/tire-sets`, icon: Layers }]
          : []),
      ],
    },
    {
      label: 'Operations',
      items: [
        { label: 'Mileage', href: `/company/${slug}/mileage`, icon: Gauge },
        { label: 'Inspections', href: `/company/${slug}/inspections`, icon: ClipboardList },
        { label: 'Maintenance', href: `/company/${slug}/maintenance`, icon: Wrench },
      ],
    },
  ];

  if (role === 'admin' || role === 'fleet_manager') {
    groups.push({
      label: 'Insights',
      items: [
        { label: 'Reports', href: `/company/${slug}/reports`, icon: BarChart3 },
        { label: 'Audit logs', href: `/company/${slug}/audit-logs`, icon: ScrollText },
        { label: 'Settings', href: `/company/${slug}/settings`, icon: Settings },
      ],
    });
  }

  return groups;
}

interface CompanyLayoutProps {
  children: React.ReactNode;
}

export default function CompanyLayout({ children }: CompanyLayoutProps) {
  return (
    <CompanyLoadingProvider>
      <CompanyLayoutContent>{children}</CompanyLayoutContent>
    </CompanyLoadingProvider>
  );
}

function CompanyLayoutContent({ children }: CompanyLayoutProps) {
  const params = useParams();
  const slug = params.slug as string;
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { isPageLoading } = useCompanyLoading();

  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const fetchCompany = useCallback(async () => {
    const response = await authRequest<ApiCompany>(`/v1/company/${slug}`);
    if ('code' in response) {
      if (response.statusCode === 403) {
        setAccessDenied(true);
      }
      return;
    }
    setCompany(response.data);
  }, [slug]);

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      router.replace(`/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    // Hard redirect for first-login users
    if ((session.user as SessionUser)?.firstLogin) {
      router.replace('/change-password');
      return;
    }

    fetchCompany();
  }, [isPending, session, pathname, router, fetchCompany]);

  useEffect(() => {
    if (accessDenied) {
      router.replace('/');
    }
  }, [accessDenied, router]);

  if (isPending) {
    return <LoadingPage message="Loading company dashboard" />;
  }

  if (!session || accessDenied || !company) {
    return null;
  }

  const navGroups = getCompanyNavGroups(slug, session.user.role);

  return (
    <DashboardLayout
      logo={
        <Link href={`/company/${slug}`} aria-label="Go to company home">
          <Image src="/logo-dark.svg" alt="Tirely" width={120} height={42} priority />
        </Link>
      }
      navGroups={navGroups}
      userProfile={{
        name: session.user.email ?? '',
        subtitle: company.name,
        avatarFallback: (session.user.email?.[0] ?? 'U').toUpperCase(),
        menu: (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <IconButton variant="ghost" color="gray" aria-label="User menu" size="1">
                <MoreHorizontal size={16} />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content side="top" align="end">
              <DropdownMenu.Item onSelect={() => router.push(`/company/${slug}/profile`)}>
                <UserRound size={14} />
                Profile Settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item
                color="red"
                onSelect={async () => {
                  await signOut();
                  router.replace('/sign-in');
                }}
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        ),
      }}
    >
      {isPageLoading && <LoadingPage message="Loading company dashboard" />}
      {children}
    </DashboardLayout>
  );
}
