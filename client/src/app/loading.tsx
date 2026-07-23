export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-80 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
      </div>
      <div className="flex flex-col gap-6 rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.1] dark:bg-zinc-900">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-40 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-4 w-72 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-28 w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        <div className="flex flex-col gap-2">
          <div className="h-4 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="h-4 w-28 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
        </div>
        <div className="h-11 w-full animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}
