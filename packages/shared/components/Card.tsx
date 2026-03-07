import type { CSSProperties, ReactNode } from 'react';

import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  href?: string;
  className?: string;
  style?: CSSProperties;
}

interface CardGridProps {
  children: ReactNode;
  className?: string;
}

const combineClassNames = (baseClass: string, className?: string) => {
  if (!className) {
    return baseClass;
  }

  return `${baseClass} ${className}`;
};

export function Card({ children, href, className, style }: CardProps) {
  const isClickable = Boolean(href);
  const cardClassName = combineClassNames(
    styles.card,
    isClickable ? styles.cardClickable : undefined
  );

  return (
    <div className={combineClassNames(cardClassName, className)} style={style}>
      {href ? (
        <a href={href} className={styles.cardLink}>
          {children}
        </a>
      ) : (
        children
      )}
    </div>
  );
}

export function CardGrid({ children, className }: CardGridProps) {
  return (
    <div className={combineClassNames(styles.cardGrid, className)}>
      {children}
    </div>
  );
}
