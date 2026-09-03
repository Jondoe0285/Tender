import { Montserrat, Source_Sans_3 } from 'next/font/google';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
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

export const metadata = {
  title: 'Trade Tender | The tender platform for construction supply',
  description:
    'Connect. Compare. Construct. Trade Tender connects construction Contractors with Providers through a clear tender and quotation process.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${montserrat.variable} ${sourceSans.variable}`}>
      <body className="min-h-screen bg-site-white font-sans text-foundation-navy antialiased">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}