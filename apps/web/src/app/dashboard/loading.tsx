import { Skeleton } from '@/components/ui/skeleton';

const DashboardLoading = () => {
  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-5 w-96' />
      </div>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        <Skeleton className='h-32 rounded-xl' />
        <Skeleton className='h-32 rounded-xl' />
        <Skeleton className='h-32 rounded-xl' />
      </div>
    </div>
  );
};

export default DashboardLoading;
