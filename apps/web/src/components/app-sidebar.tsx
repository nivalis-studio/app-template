'use client';

import { HomeIcon, LogOutIcon, MessageSquareIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { authClient } from '@/lib/auth-client';

const navItems = [
  { title: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { title: 'Chat', href: '/dashboard/chat', icon: MessageSquareIcon },
] as const;

const AppSidebar = ({
  user,
}: {
  readonly user: { name: string; email: string };
}) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push('/sign-in');
  };

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className='flex items-center gap-2 px-2 py-1'>
          <span className='font-bold font-sans text-lg'>Nivalis</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    render={<Link href={item.href} />}
                    tooltip={item.title}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                className='flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                render={<SidebarMenuButton size='lg' />}
              >
                <Avatar size='sm'>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-left leading-tight'>
                  <span className='truncate font-medium text-sm'>
                    {user.name}
                  </span>
                  <span className='truncate text-muted-foreground text-xs'>
                    {user.email}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='w-56'
                side='top'
                sideOffset={4}
              >
                <DropdownMenuLabel className='font-normal'>
                  <div className='flex flex-col gap-1'>
                    <p className='font-medium text-sm leading-none'>
                      {user.name}
                    </p>
                    <p className='text-muted-foreground text-xs leading-none'>
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOutIcon />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};

export { AppSidebar };
