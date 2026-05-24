import Link from 'next/link';
import Image from 'next/image';

import { Box, Button, Flex, Text } from '@radix-ui/themes';

export default function PublicNavbar() {
  return (
    <Box
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'color-mix(in srgb, var(--surface-panel) 90%, transparent)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--gray-5)',
      }}
    >
      <Flex
        align="center"
        justify="between"
        gap="4"
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          minHeight: 60,
        }}
      >
        <Link href="/" style={{ textDecoration: 'none', lineHeight: 0 }}>
          <Image src="/logo-dark.svg" alt="Tirely" width={120} height={42} priority />
        </Link>

        <Flex align="center" gap="5">
          <Text size="2" asChild>
            <Link href="#how-it-works" style={{ color: 'var(--gray-11)', textDecoration: 'none' }}>
              How it works
            </Link>
          </Text>
          <Button asChild size="2">
            <Link href="/sign-in">Sign in</Link>
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
}
