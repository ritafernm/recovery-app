'use client';

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function HistoryError({ error, reset }: Props) {
  return (
    <div role="alert" className="flex flex-col gap-4 rounded-xl border border-red-200 p-6 dark:border-red-900">
      <div>
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">
          Failed to load history
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {error.message ?? 'Something went wrong.'}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="self-start rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        Try again
      </button>
    </div>
  );
}
