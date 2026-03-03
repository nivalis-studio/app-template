import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const DashboardPage = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <h1 className='font-bold font-sans text-2xl tracking-tight'>
          Welcome back{session?.user.name ? `, ${session.user.name}` : ''}
        </h1>
        <p className='mt-1 text-muted-foreground'>
          Here&apos;s an overview of your workspace.
        </p>
      </div>
    </div>
  );
};

export default DashboardPage;
