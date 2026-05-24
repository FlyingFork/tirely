'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface AdminLoadingContextValue {
  isPageLoading: boolean;
  setIsPageLoading: (value: boolean) => void;
}

const AdminLoadingContext = createContext<AdminLoadingContextValue | undefined>(undefined);

interface AdminLoadingProviderProps {
  children: React.ReactNode;
}

export function AdminLoadingProvider({ children }: AdminLoadingProviderProps) {
  const [isPageLoading, setIsPageLoading] = useState(false);

  const value = useMemo(
    () => ({
      isPageLoading,
      setIsPageLoading,
    }),
    [isPageLoading],
  );

  return <AdminLoadingContext.Provider value={value}>{children}</AdminLoadingContext.Provider>;
}

export function useAdminLoading() {
  const context = useContext(AdminLoadingContext);

  if (!context) {
    throw new Error('useAdminLoading must be used within an AdminLoadingProvider');
  }

  return context;
}
