import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';
import { auth } from '@/lib/auth';
import type { PropsWithChildren } from 'react';

const DashboardLayout = async ({ children }: PropsWithChildren) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/sign-in');
  }

  const user = {
    name: session.user.name,
    email: session.user.email,
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          <header className='flex h-12 shrink-0 items-center gap-2 border-b px-4'>
            <SidebarTrigger className='-ml-1' />
            <Separator className='!h-4 mr-2' orientation='vertical' />
          </header>
          <main className='flex-1 p-4'>{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};

export default DashboardLayout;
