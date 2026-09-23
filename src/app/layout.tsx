import { Source_Sans_3 } from 'next/font/google';
import { AuthSessionProvider } from '@/components/providers/AuthSessionProvider';
import { SkipLink } from '@/components/layout/SkipLink';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-source-sans',
  display: 'swap',
});

export const metadata = {
  title: 'Trade Tender | Structured tenders for UK construction supply',
  description:
    'Specify a construction requirement, compare formal quotes from matched suppliers, and award on the record. Trade Tender is a UK construction procurement workspace.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={sourceSans.variable}>
      <body className="min-h-screen bg-light-grey font-sans text-foundation-navy antialiased">
        <SkipLink />
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
