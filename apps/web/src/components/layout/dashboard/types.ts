import type { ComponentType, ReactNode } from 'react';

export interface DashboardNavItem {
  label: string;
  href: string;
  icon?: ComponentType<{ className?: string }>;
}

export interface DashboardNavGroup {
  label?: string;
  items: DashboardNavItem[];
}

export interface SidebarUserProfile {
  name: string;
  subtitle?: string;
  avatarFallback?: string;
  menu?: ReactNode;
}

export interface DashboardLayoutProps {
  logo: ReactNode;
  title?: ReactNode;
  navGroups: DashboardNavGroup[];
  children: ReactNode;
  sidebarBottomContent?: ReactNode[];
  userProfile?: SidebarUserProfile;
  defaultDesktopSidebarCollapsed?: boolean;
  className?: string;
}
