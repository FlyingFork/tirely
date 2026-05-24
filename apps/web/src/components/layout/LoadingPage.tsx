import { Flex, Heading, Spinner } from '@radix-ui/themes';

interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = 'Loading' }: LoadingPageProps) {
  return (
    <Flex
      align="center"
      justify="center"
      gap="3"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        background: 'var(--gray-4)',
        zIndex: 1000,
      }}
    >
      <Spinner size="3" />
      <Heading size="4" weight="medium" color="gray">
        {message}
      </Heading>
    </Flex>
  );
}
