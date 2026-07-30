import type { Metadata } from 'next';
import { Barlow_Condensed, IBM_Plex_Sans } from 'next/font/google';
import { AuthProvider } from '@/lib/auth/AuthProvider';
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
