import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthProvider';
import { NavigationProgress } from '@/components/NavigationProgress';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import './globals.css';

const display = Barlow_Condensed({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['600', '700'],
});

const body = IBM_Plex_Sans({
  variable: '--font-body',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'GymBro Admin',
  description: 'Panel staff — acceso puerta y gestión del gym',
};

/** Evita flash de tema incorrecto antes de hidratar. */
const themeBootScript = `(function(){try{var t=localStorage.getItem('gymbro.theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${display.variable} ${body.variable}`}>
        <ThemeProvider>
          <NavigationProgress />
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
