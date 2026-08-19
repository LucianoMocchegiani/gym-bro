'use client';

import {
  NavIconMoon,
  NavIconSun,
} from '@/components/AdminNavIcons';
import { useTheme } from '@/lib/theme/ThemeProvider';

/**
 * Alterna tema claro / oscuro en el topbar (icono del estado objetivo).
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
      {theme === 'dark' ? <NavIconSun /> : <NavIconMoon />}
    </button>
  );
}
