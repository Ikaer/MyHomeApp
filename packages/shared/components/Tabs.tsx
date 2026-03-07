import type { MouseEvent } from 'react';

import styles from './Tabs.module.css';

type TabId = string;

export interface TabItem<T extends TabId> {
  id: T;
  label: string;
  disabled?: boolean;
}

interface TabsProps<T extends TabId> {
  items: Array<TabItem<T>>;
  active: T;
  onChange: (id: T) => void;
  className?: string;
  buttonClassName?: string;
  ariaLabel?: string;
}

const combineClassNames = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(' ');
};

export default function Tabs<T extends TabId>({
  items,
  active,
  onChange,
  className,
  buttonClassName,
  ariaLabel = 'Tabs'
}: TabsProps<T>) {
  return (
    <div className={combineClassNames(styles.tabBar, className)} role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const isActive = item.id === active;
        const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
          if (item.disabled) {
            event.preventDefault();
            return;
          }
          onChange(item.id);
        };

        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-disabled={item.disabled ? 'true' : undefined}
            tabIndex={isActive ? 0 : -1}
            className={combineClassNames(
              styles.tabButton,
              isActive ? styles.tabButtonActive : undefined,
              buttonClassName
            )}
            onClick={handleClick}
            disabled={item.disabled}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
