'use client';

import * as RadixToast from '@radix-ui/react-toast';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

type ToastInput = {
  title: string;
  description?: string;
  variant?: 'success' | 'error' | 'info';
  duration?: number;
};

type ToastContextValue = { toast: (input: ToastInput) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

type ToastItem = ToastInput & { id: number };

function toastClassName(variant: ToastInput['variant']) {
  return `toast toast-${variant ?? 'info'}`;
}

function ToastDescription({ description }: { description?: string }) {
  if (!description) return null;

  return (
    <RadixToast.Description className="toast-description">
      {description}
    </RadixToast.Description>
  );
}

function ToastMessage({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (toastId: number) => void;
}) {
  return (
    <RadixToast.Root
      duration={toast.duration ?? 4000}
      onOpenChange={(open) => {
        if (!open) onDismiss(toast.id);
      }}
      className={toastClassName(toast.variant)}
    >
      <RadixToast.Title className="toast-title">{toast.title}</RadixToast.Title>
      <ToastDescription description={toast.description} />
    </RadixToast.Root>
  );
}

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((input: ToastInput) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev, { ...input, id }]);
  }, []);

  const dismissToast = useCallback((toastId: number) => {
    setToasts((prev) => prev.filter((toastItem) => toastItem.id !== toastId));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right">
        {children}
        {toasts.map((toastItem) => (
          <ToastMessage key={toastItem.id} toast={toastItem} onDismiss={dismissToast} />
        ))}
        <RadixToast.Viewport className="toast-viewport" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
};
