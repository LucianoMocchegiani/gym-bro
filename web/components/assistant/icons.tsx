import type { ReactNode } from 'react';

function Icon({
  children,
  size = 18,
}: {
  children: ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconSparkle({ size = 18 }: { size?: number }) {
  return (
    <Icon size={size}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1" />
      <circle cx="12" cy="12" r="2.2" />
    </Icon>
  );
}

export function IconExpand() {
  return (
    <Icon>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </Icon>
  );
}

export function IconCollapse() {
  return (
    <Icon>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="10" y1="14" x2="3" y2="21" />
    </Icon>
  );
}

export function IconClose() {
  return (
    <Icon>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  );
}

export function IconNewChat() {
  return (
    <Icon size={20}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Icon>
  );
}

export function IconHistory() {
  return (
    <Icon size={20}>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 16 14" />
    </Icon>
  );
}

export function IconBack() {
  return (
    <Icon>
      <path d="M15 18 9 12l6-6" />
    </Icon>
  );
}

export function IconSearch() {
  return (
    <Icon>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function IconSend() {
  return (
    <Icon size={18}>
      <path d="M12 19V5" />
      <path d="m5 12 7-7 7 7" />
    </Icon>
  );
}

export function IconStop() {
  return (
    <Icon size={16}>
      <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function IconMore() {
  return (
    <Icon>
      <circle cx="12" cy="6" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18" r="1.15" fill="currentColor" stroke="none" />
    </Icon>
  );
}
