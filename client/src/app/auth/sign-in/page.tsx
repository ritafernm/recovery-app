'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { loginAction, type AuthState } from '../actions';

const initialState: AuthState = {};

export default function SignInPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const searchParams = useSearchParams();
  const justSignedUp = searchParams.get('success') === '1';

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Welcome back — log in to your account.
        </p>
      </div>

      {justSignedUp && (
        <div className="mb-4 rounded-[var(--radius-md)] bg-teal-50 px-4 py-3 text-sm text-teal-800 dark:bg-teal-950 dark:text-teal-200">
          Account created! Check your email to confirm, then sign in.
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="mb-4 rounded-[var(--radius-md)] bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[var(--color-primary-500)] focus:ring-2"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none ring-[var(--color-primary-500)] focus:ring-2"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-[var(--radius-full)] bg-[var(--color-primary-600)] px-4 py-2 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-700)] disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/sign-up"
          className="font-medium text-[var(--color-primary-600)] hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
