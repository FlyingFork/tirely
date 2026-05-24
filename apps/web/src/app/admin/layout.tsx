'use client';

import { DashboardLayout } from '@/components/layout/dashboard/DashboardLayout';
import type { DashboardNavGroup } from '@/components/layout/dashboard/types';
import { LoadingPage } from '@/components/layout/LoadingPage';
import { signOut, authClient } from '@/lib/auth-client';
import { AdminLoadingProvider, useAdminLoading } from '@/context/admin-loading';
import { DropdownMenu, IconButton } from '@radix-ui/themes';
import {
  BarChart3,
  Building2,
  BookOpenText,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  ScrollText,
  UserRound,
  Users,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const adminNavGroups: DashboardNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      { label: 'Requests', href: '/admin/requests', icon: BookOpenText },
    ],
  },
  {
    label: 'Data',
    items: [
      { label: 'Users', href: '/admin/users', icon: Users },
      { label: 'Companies', href: '/admin/companies', icon: Building2 },
      { label: 'Statistics', href: '/admin/statistics', icon: BarChart3 },
      { label: 'Catalog', href: '/admin/catalog', icon: Package },
      { label: 'Audit logs', href: '/admin/audit-logs', icon: ScrollText },
    ],
  },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

function shouldRedirectFromAdmin(isPending: boolean, session: unknown) {
  return !isPending && !session;
}

function shouldRejectAdminSession(
  session: { user: { role?: string | null } } | null | undefined,
) {
  return Boolean(session && session.user.role !== 'admin');
}

function AdminUserMenu({ onProfile, onSignOut }: { onProfile: () => void; onSignOut: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton variant="ghost" color="gray" aria-label="User menu" size="1">
          <MoreHorizontal size={16} />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content side="top" align="end">
        <DropdownMenu.Item onSelect={onProfile}>
          <UserRound size={14} />
          Profile Settings
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item color="red" onSelect={onSignOut}>
          Sign out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminLoadingProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminLoadingProvider>
  );
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { isPageLoading } = useAdminLoading();

  useEffect(() => {
    if (shouldRedirectFromAdmin(isPending, session)) {
      router.replace(`/sign-in?redirectTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isPending && shouldRejectAdminSession(session)) {
      router.replace('/');
    }
  }, [isPending, pathname, router, session]);

  if (isPending) {
    return <LoadingPage message="Loading admin dashboard" />;
  }

  if (!session || session.user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout
      logo={
        <Link href="/admin" aria-label="Go to admin home">
          <Image src="/logo-dark.svg" alt="Tirely" width={120} height={42} priority />
        </Link>
      }
      navGroups={adminNavGroups}
      userProfile={{
        name: session.user.email ?? '',
        subtitle: 'Admin',
        avatarFallback: (session.user.email?.[0] ?? 'A').toUpperCase(),
        menu: (
          <AdminUserMenu
            onProfile={() => router.push('/admin/profile')}
            onSignOut={async () => {
              await signOut();
              router.replace('/sign-in');
            }}
          />
        ),
      }}
    >
      {isPageLoading && <LoadingPage message="Loading admin dashboard" />}
      {children}
    </DashboardLayout>
  );
}
