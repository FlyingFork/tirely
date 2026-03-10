'use client';

import { useRouter } from 'next/navigation';

import { useSession, signOut } from '@/lib/auth-client';

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <p>Loading...</p>;
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Welcome, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
      <p>Role: {session.user.role}</p>
      <button
        onClick={async () => {
          await signOut();
          router.push('/login');
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
