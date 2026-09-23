import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { RegisterForm, type WorkspaceIntent } from './RegisterForm';

function parseIntent(value: string | undefined): WorkspaceIntent {
  if (value === 'supplying') return 'supplying';
  if (value === 'buying') return 'buying';
  return 'buying';
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ intent?: string }> }) {
  const intent = parseIntent((await searchParams).intent);

  return (
    <div className="flex min-h-screen flex-col bg-light-grey">
      <SiteHeader />
      <main id="main-content" className="flex-1 px-6 sm:px-10">
        <RegisterForm initialIntent={intent} />
      </main>
      <SiteFooter />
    </div>
  );
}
