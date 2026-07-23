import Link from 'next/link';
import { logoutAction } from '@/app/auth/actions';
import { getSession } from '@/lib/session';

export default async function NavAuth() {
  const session = await getSession();

  if (session) {
    return (
      <div className="flex items-center gap-3">
        {session.email && (
          <span className="hidden text-sm text-[var(--color-text-secondary)] sm:block">
            {session.email}
          </span>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-[var(--radius-full)] border border-[var(--color-border)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-overlay)] hover:text-[var(--color-text-primary)]"
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href="/auth/sign-in"
      className="rounded-[var(--radius-full)] bg-[var(--color-primary-600)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-inverse)] transition-colors hover:bg-[var(--color-primary-700)]"
    >
      Sign in
    </Link>
  );
}
