import type { Metadata } from 'next';

import styles from './auth.module.css';

export const metadata: Metadata = {
  title: 'Account - Tirely',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${styles.shell} anim-fade-in`}>
      <div className={styles.decoration} aria-hidden="true" />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
