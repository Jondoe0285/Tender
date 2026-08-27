import { Archivo, Inter } from 'next/font/google';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-archivo',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Trade Tender | The tender platform for construction supply',
  description:
    'Trade Tender connects construction Clients with registered Retailers, running a competitive tender on every requirement to secure better pricing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${archivo.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-site-white font-sans text-foundation-navy antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}