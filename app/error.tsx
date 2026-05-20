'use client';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return <html><body><main className='p-8'><h2 className='text-xl font-semibold'>Something went wrong</h2><p className='mt-2 text-sm text-muted'>{error.message}</p></main></body></html>;
}
