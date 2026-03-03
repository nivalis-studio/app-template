import Link from 'next/link';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const features = [
  {
    title: 'AI Connectors',
    description:
      'Pre-built integrations with Mistral, Gemini, Firecrawl, and Google APIs — all wired as Effect services.',
  },
  {
    title: 'Type-Safe by Default',
    description:
      'Effect.ts services with typed errors, Zod-validated environment, and strict TypeScript throughout.',
  },
  {
    title: 'Production Ready',
    description:
      'Sentry monitoring, Better-Auth authentication, Prisma ORM, and a Turbo-powered monorepo — out of the box.',
  },
] as const;

const Page = () => {
  return (
    <main className='flex min-h-dvh flex-col'>
      {/* Hero */}
      <section className='flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center'>
        <h1 className='max-w-2xl font-bold font-sans text-4xl tracking-tight sm:text-5xl lg:text-6xl'>
          Build AI&#8209;Powered Tools, Fast
        </h1>

        <p className='max-w-lg text-base text-muted-foreground sm:text-lg'>
          A production-ready Next.js starter with Effect.ts services, AI
          connectors, and everything you need to ship.
        </p>

        <div className='flex flex-wrap items-center justify-center gap-3'>
          <Link
            className='inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 font-medium font-sans text-primary-foreground text-sm transition-colors hover:bg-primary/80'
            href='/sign-up'
          >
            Get Started
          </Link>
          <Link
            className='inline-flex h-9 items-center justify-center rounded-lg border border-input bg-background px-4 font-medium font-sans text-sm transition-colors hover:bg-muted hover:text-foreground'
            href='/sign-in'
          >
            Sign In
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className='mx-auto w-full max-w-4xl px-6 pb-24'>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {features.map(feature => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className='font-sans'>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className='border-t py-6 text-center text-muted-foreground text-sm'>
        <p>&copy; Nivalis. All rights reserved.</p>
      </footer>
    </main>
  );
};

export default Page;
