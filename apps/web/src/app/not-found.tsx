import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '404 Not Found',
};

const Page = () => {
  return (
    <div className='flex h-full min-h-screen items-center justify-center'>
      <div className='flex flex-auto flex-col items-center justify-center px-4 text-center sm:flex-row'>
        <h1 className='font-extrabold text-2xl tracking-tight sm:mr-6 sm:border-r sm:pr-6 sm:text-3xl'>
          404
        </h1>
        <h2 className='mt-2 text-muted-foreground sm:mt-0'>
          This page could not be found.
        </h2>
      </div>
    </div>
  );
};

export default Page;
