import Link from 'next/link';

export type PageTab = {
  href: string;
  label: string;
  active?: boolean;
};

/**
 * Barra de tabs reutilizable (ancho completo, altura fija, flex-start).
 * Usada por Puerta y reutilizable por Caja.
 */
export function PageTabs({
  label,
  tabs,
}: {
  label: string;
  tabs: PageTab[];
}) {
  return (
    <nav className="page-tabs" aria-label={label}>
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={t.active ? 'active' : undefined}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}