'use client';

import { Avatar, Box, Flex, Separator, Text, Tooltip } from '@radix-ui/themes';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';

import styles from './DashboardLayout.module.css';
import type { DashboardLayoutProps } from './types';

const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';
const BOTTOM_SHEET_ID = 'dashboard-mobile-nav';

function isNavItemActive(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getMostSpecificActiveHref(
  pathname: string,
  navGroups: DashboardLayoutProps['navGroups'],
): string | null {
  let activeHref: string | null = null;

  for (const group of navGroups) {
    for (const item of group.items) {
      if (!isNavItemActive(pathname, item.href)) {
        continue;
      }
      if (!activeHref || item.href.length > activeHref.length) {
        activeHref = item.href;
      }
    }
  }

  return activeHref;
}

function joinClassNames(...classNames: Array<string | false | null | undefined>): string {
  return classNames.filter(Boolean).join(' ');
}

export function DashboardLayout({
  logo,
  title,
  navGroups,
  children,
  sidebarBottomContent,
  userProfile,
  defaultDesktopSidebarCollapsed = false,
  className,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const bottomSheetRef = useRef<HTMLDivElement | null>(null);

  const [isDesktop, setIsDesktop] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(
    defaultDesktopSidebarCollapsed,
  );
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);

    const syncDesktop = (matches: boolean) => {
      setIsDesktop(matches);
      if (matches) {
        setIsMobileSheetOpen(false);
      }
    };

    syncDesktop(mediaQuery.matches);

    const onMediaQueryChange = (event: MediaQueryListEvent) => syncDesktop(event.matches);
    mediaQuery.addEventListener('change', onMediaQueryChange);
    return () => mediaQuery.removeEventListener('change', onMediaQueryChange);
  }, []);

  useEffect(() => {
    setIsMobileSheetOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileSheetOpen]);

  useEffect(() => {
    if (!isMobileSheetOpen || isDesktop) return;

    bottomSheetRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileSheetOpen(false);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobileSheetOpen, isDesktop]);

  const sidebarFooterContent = sidebarBottomContent ?? [];
  const activeHref = useMemo(
    () => getMostSpecificActiveHref(pathname, navGroups),
    [pathname, navGroups],
  );
  const hasFooter = sidebarFooterContent.length > 0 || Boolean(userProfile);

  const renderNavItems = (collapsed: boolean) =>
    navGroups.map((group, groupIndex) => (
      <Box key={`nav-group-${groupIndex}`} className={styles.navGroup}>
        {!collapsed && group.label ? (
          <Text as="p" size="1" weight="bold" className={styles.navGroupLabel}>
            {group.label}
          </Text>
        ) : null}

        <Flex direction="column" gap="1">
          {group.items.map((item) => {
            const isActive = activeHref === item.href;
            const Icon = item.icon;

            const link = (
              <Link
                href={item.href}
                className={joinClassNames(
                  styles.navLink,
                  isActive && styles.navLinkActive,
                  collapsed && styles.navLinkCollapsed,
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Flex
                  align="center"
                  gap="2"
                  justify={collapsed ? 'center' : undefined}
                  className={styles.navLinkInner}
                >
                  {Icon ? <Icon className={styles.navIcon} /> : null}
                  {!collapsed ? (
                    <Text as="span" size="2" weight={isActive ? 'medium' : 'regular'}>
                      {item.label}
                    </Text>
                  ) : null}
                </Flex>
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.href} content={item.label} side="right">
                  {link}
                </Tooltip>
              );
            }

            return <span key={item.href}>{link}</span>;
          })}
        </Flex>
      </Box>
    ));

  const renderUserProfile = (collapsed: boolean) => {
    if (!userProfile) return null;

    return (
      <div className={joinClassNames(styles.userProfile, collapsed && styles.userProfileCollapsed)}>
        <Avatar
          size="2"
          fallback={(userProfile.avatarFallback ?? userProfile.name[0] ?? '?').toUpperCase()}
          radius="full"
          className={styles.userAvatar}
        />
        {!collapsed ? (
          <>
            <div className={styles.userInfo}>
              <Text as="p" size="2" weight="medium" className={styles.userName}>
                {userProfile.name}
              </Text>
              {userProfile.subtitle ? (
                <Text as="p" size="1" color="gray" className={styles.userSubtitle}>
                  {userProfile.subtitle}
                </Text>
              ) : null}
            </div>
            {userProfile.menu ? <div className={styles.userMenu}>{userProfile.menu}</div> : null}
          </>
        ) : null}
      </div>
    );
  };

  return (
    <Box className={joinClassNames(styles.layoutRoot, className)}>
      <aside
        className={joinClassNames(
          styles.sidebar,
          isDesktopSidebarCollapsed && styles.sidebarCollapsed,
        )}
        aria-hidden={!isDesktop}
      >
        <div className={styles.sidebarPanel}>
          <div className={styles.sidebarHeader}>
            {!isDesktopSidebarCollapsed ? (
              <div className={styles.brandWrap}>
                <div className={styles.logo}>{logo}</div>
                {title ? (
                  <Text size="3" weight="medium" className={styles.titleText}>
                    {title}
                  </Text>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className={styles.collapseToggle}
              onClick={() => setIsDesktopSidebarCollapsed((v) => !v)}
              aria-label={isDesktopSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isDesktopSidebarCollapsed ? (
                <ChevronRight className={styles.collapseIcon} />
              ) : (
                <ChevronLeft className={styles.collapseIcon} />
              )}
            </button>
          </div>

          <nav className={styles.sidebarNav} aria-label="Primary">
            {renderNavItems(isDesktopSidebarCollapsed)}
          </nav>

          {hasFooter ? (
            <>
              <Separator size="4" />
              <div className={styles.sidebarFooter}>
                {sidebarFooterContent.map((content, i) => (
                  <Box key={`footer-${i}`}>{content}</Box>
                ))}
                {renderUserProfile(isDesktopSidebarCollapsed)}
              </div>
            </>
          ) : null}
        </div>
      </aside>

      <div className={styles.mobileTopBar}>
        <button
          type="button"
          className={styles.mobileTrigger}
          onClick={() => setIsMobileSheetOpen(true)}
          aria-label="Open navigation"
          aria-expanded={isMobileSheetOpen}
          aria-controls={BOTTOM_SHEET_ID}
        >
          <Menu className={styles.mobileTriggerIcon} />
        </button>

        <div className={styles.mobileTopBarBrand}>
          <div className={styles.logo}>{logo}</div>
          {title ? (
            <Text size="3" weight="medium" className={styles.titleText}>
              {title}
            </Text>
          ) : null}
        </div>
      </div>

      {isMobileSheetOpen ? (
        <button
          type="button"
          className={styles.mobileBackdrop}
          onClick={() => setIsMobileSheetOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}

      <div
        id={BOTTOM_SHEET_ID}
        ref={bottomSheetRef}
        className={joinClassNames(styles.bottomSheet, isMobileSheetOpen && styles.bottomSheetOpen)}
        aria-hidden={!isMobileSheetOpen}
        tabIndex={isMobileSheetOpen ? -1 : undefined}
      >
        <div className={styles.bottomSheetHandle} aria-hidden="true" />

        <div className={styles.bottomSheetHeader}>
          <div className={styles.brandWrap}>
            <div className={styles.logo}>{logo}</div>
            {title ? (
              <Text size="3" weight="medium" className={styles.titleText}>
                {title}
              </Text>
            ) : null}
          </div>
          <button
            type="button"
            className={styles.bottomSheetClose}
            aria-label="Close navigation"
            onClick={() => setIsMobileSheetOpen(false)}
          >
            <X className={styles.bottomSheetCloseIcon} />
          </button>
        </div>

        <nav className={styles.bottomSheetNav} aria-label="Primary">
          {renderNavItems(false)}
        </nav>

        {hasFooter ? (
          <>
            <Separator size="4" />
            <div className={styles.bottomSheetFooter}>
              {sidebarFooterContent.map((content, i) => (
                <Box key={`sheet-footer-${i}`}>{content}</Box>
              ))}
              {renderUserProfile(false)}
            </div>
          </>
        ) : null}
      </div>

      <main
        className={joinClassNames(
          styles.mainRegion,
          isDesktop &&
            (isDesktopSidebarCollapsed ? styles.mainRegionCollapsed : styles.mainRegionExpanded),
        )}
      >
        <Box className={styles.mainScrollArea}>
          <Box className={styles.mainContent}>{children}</Box>
        </Box>
      </main>
    </Box>
  );
}
