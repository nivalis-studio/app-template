import { Skeleton } from '@/components/ui/skeleton';

const ChatLoading = () => {
  return (
    <div className='flex h-[calc(100svh-theme(spacing.12)-2*theme(spacing.4))] flex-col'>
      <div className='mb-4'>
        <Skeleton className='h-8 w-32' />
        <Skeleton className='mt-2 h-5 w-80' />
      </div>
      <div className='flex flex-1 flex-col rounded-lg border bg-card'>
        <div className='flex-1 p-4'>
          <div className='flex h-full items-center justify-center'>
            <Skeleton className='h-32 w-64 rounded-lg' />
          </div>
        </div>
        <div className='flex gap-2 border-t p-4'>
          <Skeleton className='h-10 flex-1 rounded-md' />
          <Skeleton className='h-10 w-10 rounded-md' />
        </div>
      </div>
    </div>
  );
};

export default ChatLoading;
