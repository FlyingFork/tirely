'use client';

import { createContext, useContext, useMemo, useState } from 'react';

interface CompanyLoadingContextValue {
  isPageLoading: boolean;
  setIsPageLoading: (value: boolean) => void;
}

const CompanyLoadingContext = createContext<CompanyLoadingContextValue | undefined>(undefined);

interface CompanyLoadingProviderProps {
  children: React.ReactNode;
}

export function CompanyLoadingProvider({ children }: CompanyLoadingProviderProps) {
  const [isPageLoading, setIsPageLoading] = useState(false);

  const value = useMemo(
    () => ({
      isPageLoading,
      setIsPageLoading,
    }),
    [isPageLoading],
  );

  return <CompanyLoadingContext.Provider value={value}>{children}</CompanyLoadingContext.Provider>;
}

export function useCompanyLoading() {
  const context = useContext(CompanyLoadingContext);

  if (!context) {
    throw new Error('useCompanyLoading must be used within a CompanyLoadingProvider');
  }

  return context;
}
