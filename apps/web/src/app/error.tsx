'use client';

import { useEffect } from 'react';

const Page = ({
  error,
  reset,
}: {
  readonly error: Error;
  readonly reset: () => void;
}) => {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className='flex h-full min-h-screen items-center justify-center'>
      <div className='flex flex-col items-center gap-4 px-4 text-center'>
        <div className='flex flex-auto flex-col items-center justify-center sm:flex-row'>
          <h1 className='font-extrabold text-2xl tracking-tight sm:mr-6 sm:border-r sm:pr-6 sm:text-3xl'>
            500
          </h1>
          <h2 className='mt-2 text-muted-foreground sm:mt-0'>
            An unexpected error occurred.
          </h2>
        </div>
        <button
          className='inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/80'
          onClick={reset}
          type='button'
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default Page;
