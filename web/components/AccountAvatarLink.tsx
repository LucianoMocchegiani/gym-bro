import Link from 'next/link';

/** Iniciales del nombre (o la primera letra del mail). */
export function accountInitials(name: string | null, email: string): string {
  const src = name?.trim();
  if (!src) {
    return email.slice(0, 1).toUpperCase();
  }
  const parts = src.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/**
 * Avatar junto al tema que lleva a la cuenta (apex, web del gym y panel).
 * Sin `email` muestra el estado de carga.
 */
export function AccountAvatarLink({
  href,
  name = null,
  email,
}: {
  href: string;
  name?: string | null;
  email?: string | null;
}) {
  if (!email) {
    return (
      <Link
        href={href}
        className="account-avatar-btn"
        aria-label="Cuenta"
        aria-busy="true"
      >
        …
      </Link>
    );
  }
  return (
    <Link
      href={href}
      className="account-avatar-btn"
      title={email}
      aria-label="Mi cuenta"
    >
      {accountInitials(name, email)}
    </Link>
  );
}
