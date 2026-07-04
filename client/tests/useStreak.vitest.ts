import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useStreak } from '../src/lib/useStreak';

/** Build a fake log whose created_at is N UTC days before the pinned "today". */
function log(daysAgo: number, todayStr: string) {
  const d = new Date(`${todayStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return { created_at: d.toISOString() };
}

describe('useStreak', () => {
  const TODAY = '2026-07-04';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for an empty log array', () => {
    expect(useStreak([])).toBe(0);
  });

  it('returns 1 for a single log today', () => {
    expect(useStreak([log(0, TODAY)])).toBe(1);
  });

  it('returns 1 for a single log yesterday', () => {
    expect(useStreak([log(1, TODAY)])).toBe(1);
  });

  it('returns 0 when the most recent log is two days ago', () => {
    expect(useStreak([log(2, TODAY)])).toBe(0);
  });

  it('returns 2 for logs on today and yesterday', () => {
    expect(useStreak([log(0, TODAY), log(1, TODAY)])).toBe(2);
  });

  it('returns 3 for logs on today, yesterday, and two days ago', () => {
    expect(useStreak([log(0, TODAY), log(1, TODAY), log(2, TODAY)])).toBe(3);
  });

  it('stops at a gap — today + 2 days ago (no yesterday) → streak 1', () => {
    expect(useStreak([log(0, TODAY), log(2, TODAY)])).toBe(1);
  });

  it('counts multiple logs on the same day as a single day', () => {
    const twiceSameDay = [
      { created_at: `${TODAY}T08:00:00Z` },
      { created_at: `${TODAY}T20:00:00Z` },
    ];
    expect(useStreak(twiceSameDay)).toBe(1);
  });

  it('counts multiple same-day logs alongside a consecutive prior day', () => {
    const yesterday = '2026-07-03';
    const logs = [
      { created_at: `${TODAY}T08:00:00Z` },
      { created_at: `${TODAY}T20:00:00Z` },
      { created_at: `${yesterday}T10:00:00Z` },
    ];
    expect(useStreak(logs)).toBe(2);
  });

  it('handles input in non-chronological order', () => {
    const logs = [log(2, TODAY), log(0, TODAY), log(1, TODAY)];
    expect(useStreak(logs)).toBe(3);
  });

  it('returns 0 when all logs are old with no recent activity', () => {
    const logs = [log(10, TODAY), log(11, TODAY), log(12, TODAY)];
    expect(useStreak(logs)).toBe(0);
  });

  it('anchors from yesterday when today has no log', () => {
    // Yesterday + 2 days ago + 3 days ago → streak of 3 from yesterday
    const logs = [log(1, TODAY), log(2, TODAY), log(3, TODAY)];
    expect(useStreak(logs)).toBe(3);
  });
});
