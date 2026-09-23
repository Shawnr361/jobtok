'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';

export default function Home() {
  const { status } = useAuth();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-white">
        Job<span className="text-primary">Tok</span>
      </h1>
      <p className="text-sm font-semibold tracking-[0.2em] text-muted">SHOW ME WHAT YOU CAN DO.</p>
      <p className="max-w-md text-muted">Real People. Real Skills. Real Opportunities.</p>
      <Link
        href={status === 'signedIn' ? '/account' : '/login'}
        className="mt-6 rounded-full bg-primary px-6 py-2.5 font-semibold text-white"
      >
        {status === 'signedIn' ? 'Your account' : 'Sign in'}
      </Link>
    </main>
  );
}
