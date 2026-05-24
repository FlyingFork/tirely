import { Card, Flex, Heading } from '@radix-ui/themes';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './SectionCard.module.css';

export type SectionCardProps = {
  title: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  children: ReactNode;
  p?: '3' | '4' | '5';
};

export function SectionCard({ title, icon: Icon, actions, children, p = '4' }: SectionCardProps) {
  return (
    <Card>
      <Flex direction="column" p={p}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            {Icon && (
              <div className={styles.iconWrap}>
                <Icon size={16} />
              </div>
            )}
            <Heading size="3">{title}</Heading>
          </div>
          {actions && <div>{actions}</div>}
        </div>
        {children}
      </Flex>
    </Card>
  );
}
