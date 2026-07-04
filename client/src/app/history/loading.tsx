export default function HistoryLoading() {
  return (
    <div aria-busy="true" aria-label="Loading history" className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-col gap-2">
            <div className="h-4 w-28 rounded bg-zinc-200 motion-safe:animate-pulse dark:bg-zinc-700" />
            <div className="h-3 w-40 rounded bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
          </div>
          <div className="h-7 w-20 rounded-lg bg-zinc-100 motion-safe:animate-pulse dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}
