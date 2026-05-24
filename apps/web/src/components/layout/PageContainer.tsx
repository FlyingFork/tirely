import { Box } from '@radix-ui/themes';
import type { ReactNode } from 'react';

export function PageContainer({ children }: { children: ReactNode }) {
  return (
    <Box style={{ width: '100%', maxWidth: '1280px', marginInline: 'auto' }}>
      {children}
    </Box>
  );
}
