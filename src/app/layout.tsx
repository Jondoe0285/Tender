import { Montserrat, Source_Sans_3 } from 'next/font/google';
import type { Metadata, Viewport } from 'next';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import './globals.css';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-montserrat',
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-source-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Trade Tender | The tender platform for construction supply',
  description:
    'Connect. Compare. Construct. Trade Tender connects construction Clients with Retailers through a clear tender and quotation process.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Trade Tender' },
  icons: {
    apple: '/pwa-192.png',
    icon: [
      { url: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
};

export const viewport: Viewport = { themeColor: '#062f4f' };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${montserrat.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-site-white font-sans text-foundation-navy antialiased">
        <AuthSessionProvider>
          {children}
          <ServiceWorkerRegistration />
        </AuthSessionProvider>
      </body>
    </html>
  );
}