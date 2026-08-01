'use client';

import { useTheme } from '@/lib/theme/ThemeProvider';

/**
 * Alterna tema claro / oscuro en el topbar.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextLabel = theme === 'dark' ? 'Claro' : 'Oscuro';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Cambiar a tema ${nextLabel.toLowerCase()}`}
      title={`Tema ${nextLabel.toLowerCase()}`}
    >
      {theme === 'dark' ? 'Claro' : 'Oscuro'}
    </button>
  );
}
