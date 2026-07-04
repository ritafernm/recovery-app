export type LogLike = { created_at: string };

function toUTCDate(iso: string): string {
  return iso.slice(0, 10);
}

function utcDaysBefore(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export function useStreak(logs: LogLike[]): number {
  if (logs.length === 0) return 0;

  const uniqueDates = [...new Set(logs.map((l) => toUTCDate(l.created_at)))]
    .sort()
    .reverse();

  const today = toUTCDate(new Date().toISOString());
  const anchor = uniqueDates[0];

  // Streak must reach today or yesterday to be considered current.
  if (anchor !== today && anchor !== utcDaysBefore(today, 1)) return 0;

  let streak = 0;
  let expected = anchor;

  for (const date of uniqueDates) {
    if (date === expected) {
      streak++;
      expected = utcDaysBefore(expected, 1);
    } else {
      break;
    }
  }

  return streak;
}
