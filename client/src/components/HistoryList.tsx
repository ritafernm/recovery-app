'use client';

import type { Log } from '@/lib/viewHistory';

interface Props {
  logs: Log[];
  onMarkDone: (logId: string) => void;
}

export function HistoryList({ logs, onMarkDone }: Props) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No logs yet. Complete a recovery plan to see your history here.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {logs.map((log) => (
        <li
          key={log.id}
          className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Plan {log.plan_id}</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Logged {new Date(log.created_at).toLocaleDateString()}
            </span>
            {log.completed_at && (
              <span className="text-xs text-teal-600 dark:text-teal-400">
                Completed {new Date(log.completed_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {log.user_status !== 'done' ? (
            <button
              type="button"
              onClick={() => onMarkDone(log.id)}
              className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-teal-700"
            >
              Mark done
            </button>
          ) : (
            <span className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              Done
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
