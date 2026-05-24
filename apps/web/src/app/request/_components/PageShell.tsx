import PublicNavbar from '@/components/layout/PublicNavbar';

import styles from '../page.module.css';

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNavbar />
      <div className={styles.page}>
        <div className={styles.section}>
          <div className={styles.shell}>{children}</div>
        </div>
      </div>
    </>
  );
}
