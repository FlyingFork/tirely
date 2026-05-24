'use client';

import Link from 'next/link';

import { Card, Flex, Heading, Text } from '@radix-ui/themes';
import { ChevronRight, type LucideIcon } from 'lucide-react';

import styles from './AdminCard.module.css';

interface AdminCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
}

export default function AdminCard({ title, description, icon: Icon, href }: AdminCardProps) {
  const content = (
    <div className={styles.inner}>
      <div className={`${styles.iconBox} ${href ? styles.iconBoxActive : styles.iconBoxInactive}`}>
        <Icon size={18} />
      </div>

      <Flex direction="column" gap="1" flexGrow="1">
        <Heading size="3" weight="medium" color={href ? undefined : 'gray'}>
          {title}
        </Heading>
        <Text size="2" color="gray">
          {description}
        </Text>
      </Flex>

      {href && (
        <span className={styles.chevron}>
          <ChevronRight size={16} />
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Card asChild>
        <Link href={href} className={styles.card}>
          {content}
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      {content}
    </Card>
  );
}
