'use client';

import { captureException } from '@sentry/nextjs';
import { useEffect } from 'react';

const GlobalError = ({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) => {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html lang='en'>
      <body>
        <div className='flex h-full min-h-screen items-center justify-center'>
          <div className='flex flex-col items-center gap-4 px-4 text-center'>
            <h1 className='font-extrabold text-2xl tracking-tight sm:text-3xl'>
              Something went wrong
            </h1>
            <p className='text-gray-500'>
              An unexpected error occurred. Please try again.
            </p>
            <button
              className='inline-flex h-9 items-center justify-center rounded-lg bg-neutral-800 px-4 font-medium text-neutral-50 text-sm transition-colors hover:bg-neutral-800/80 dark:bg-neutral-100 dark:text-neutral-800 dark:hover:bg-neutral-100/80'
              onClick={reset}
              type='button'
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
};

export default GlobalError;
