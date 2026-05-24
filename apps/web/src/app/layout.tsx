import type { Metadata } from 'next';
import '@radix-ui/themes/styles.css';
import './globals.css';

import { Theme } from '@radix-ui/themes';

import { PageTitleManager } from '@/components/PageTitleManager';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Tirely — Fleet Tire Intelligence',
  description: 'Precision tire lifecycle management for commercial fleets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, overflowX: 'hidden' }}>
        <Theme
          appearance="light"
          accentColor="cyan"
          grayColor="slate"
          radius="medium"
          panelBackground="translucent"
        >
          <ToastProvider>
            <PageTitleManager />
            {children}
          </ToastProvider>
        </Theme>
      </body>
    </html>
  );
}
