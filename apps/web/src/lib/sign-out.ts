'use client';

import { authClient } from '@/lib/auth-client';

export const signOut = async () => {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = '/';
      },
    },
  });
};
