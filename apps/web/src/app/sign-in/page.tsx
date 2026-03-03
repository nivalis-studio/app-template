'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import {
  type SignInFieldErrors,
  validateSignInFields,
} from '@/lib/auth-validation';

const SignInPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<SignInFieldErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError('');

    const errors = validateSignInFields(email, password);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        setServerError('Invalid email or password');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setServerError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className='flex min-h-dvh items-center justify-center px-4 py-12'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <CardTitle className='font-sans text-2xl'>Welcome back</CardTitle>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            className='flex flex-col gap-4'
            id='sign-in-form'
            onSubmit={handleSubmit}
          >
            {serverError && (
              <p className='rounded-lg bg-destructive/10 px-3 py-2 text-center text-destructive-foreground text-sm'>
                {serverError}
              </p>
            )}

            <div className='flex flex-col gap-2'>
              <Label htmlFor='email'>Email</Label>
              <Input
                autoComplete='email'
                id='email'
                onChange={e => setEmail(e.target.value)}
                placeholder='you@example.com'
                type='email'
                value={email}
              />
              {fieldErrors.email && (
                <p className='text-destructive-foreground text-sm'>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className='flex flex-col gap-2'>
              <Label htmlFor='password'>Password</Label>
              <Input
                autoComplete='current-password'
                id='password'
                onChange={e => setPassword(e.target.value)}
                placeholder='••••••••'
                type='password'
                value={password}
              />
              {fieldErrors.password && (
                <p className='text-destructive-foreground text-sm'>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button
              className='w-full'
              disabled={isLoading}
              size='lg'
              type='submit'
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
        </CardContent>

        <CardFooter className='justify-center'>
          <p className='text-muted-foreground text-sm'>
            Don&apos;t have an account?{' '}
            <Link
              className='text-foreground underline underline-offset-4 hover:text-primary'
              href='/sign-up'
            >
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </main>
  );
};

export default SignInPage;
