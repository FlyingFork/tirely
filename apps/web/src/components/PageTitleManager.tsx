'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const STATIC_TITLES: Record<string, string> = {
  '/': 'Tirely - Fleet Tire Intelligence',
  '/admin': 'Admin Dashboard - Tirely',
  '/admin/audit-logs': 'Admin Audit Logs - Tirely',
  '/admin/catalog': 'Catalog Moderation - Tirely',
  '/admin/companies': 'Companies - Tirely',
  '/admin/profile': 'Admin Profile - Tirely',
  '/admin/requests': 'Company Requests - Tirely',
  '/admin/statistics': 'Admin Statistics - Tirely',
  '/admin/users': 'Users - Tirely',
  '/change-password': 'Change Password - Tirely',
  '/forgot-password': 'Forgot Password - Tirely',
  '/request': 'Register Company - Tirely',
  '/reset-password': 'Reset Password - Tirely',
  '/sign-in': 'Sign In - Tirely',
};

const titleCase = (value: string) =>
  value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const companySectionTitle = (section: string | undefined) => {
  if (!section) return 'Company Overview - Tirely';
  if (section === 'audit-logs') return 'Company Audit Logs - Tirely';
  if (section === 'tire-sets') return 'Tire Sets - Tirely';
  return `${titleCase(section)} - Tirely`;
};

const adminDynamicTitle = (segments: string[]) => {
  if (segments[1] === 'companies' && segments[2]) return 'Company Details - Tirely';
  if (segments[1] === 'requests' && segments[2]) return 'Request Details - Tirely';
  if (segments[1] === 'users' && segments[2]) return 'User Details - Tirely';
  return STATIC_TITLES[`/${segments.join('/')}`] ?? 'Admin - Tirely';
};

const resolveTitle = (pathname: string) => {
  if (STATIC_TITLES[pathname]) return STATIC_TITLES[pathname];

  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === 'admin') return adminDynamicTitle(segments);
  if (segments[0] === 'company') return companySectionTitle(segments[2]);

  return 'Tirely - Fleet Tire Intelligence';
};

export function PageTitleManager() {
  const pathname = usePathname();

  useEffect(() => {
    document.title = resolveTitle(pathname);
  }, [pathname]);

  return null;
}
