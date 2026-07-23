import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { viewHistory, withMarkDone, markDone } from '../src/lib/viewHistory';
import type { Log } from '../src/lib/viewHistory';

const mockHistory: Log[] = [
  {
    id: 'log-1',
    plan_id: 'plan-1',
    user_id: 'user-abc',
    user_status: null,
    completed_at: null,
    created_at: '2026-07-04T15:00:00Z',
  },
  {
    id: 'log-2',
    plan_id: 'plan-2',
    user_id: 'user-abc',
    user_status: 'done',
    completed_at: '2026-07-04T15:30:00Z',
    created_at: '2026-07-04T15:00:00Z',
  },
];

describe('viewHistory', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a list of history logs', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ logs: mockHistory }),
    } as Response);

    const result = await viewHistory('mock-token', 'user-abc');

    expect(result).toEqual(mockHistory);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('userId=user-abc'),
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      }),
    );
  });

  it('should throw an error and not return data when the request fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    await expect(viewHistory('mock-token', 'user-abc')).rejects.toThrow(
      'Failed to fetch logs: 500',
    );
  });
});

describe('withMarkDone', () => {
  it('marks the target log as done and sets completed_at', () => {
    const result = withMarkDone(mockHistory, 'log-1');

    expect(result[0].user_status).toBe('done');
    expect(result[0].completed_at).not.toBeNull();
    // other logs are unchanged
    expect(result[1]).toEqual(mockHistory[1]);
  });

  it('does not mutate the original array', () => {
    const original = [...mockHistory];
    withMarkDone(mockHistory, 'log-1');
    expect(mockHistory).toEqual(original);
  });

  it('returns the array unchanged when logId is not found', () => {
    const result = withMarkDone(mockHistory, 'nonexistent');
    expect(result).toEqual(mockHistory);
  });
});

describe('markDone', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends a PATCH request with the correct logId and token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: true } as Response);

    await markDone('mock-token', 'log-1');

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('log-1'),
      expect.objectContaining({
        method: 'PATCH',
        headers: { Authorization: 'Bearer mock-token' },
      }),
    );
  });

  it('throws on server error so the caller can rollback optimistic state', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 422 } as Response);

    // Simulate the optimistic-update + rollback pattern
    const previous = [...mockHistory];
    let logs = withMarkDone(mockHistory, 'log-1'); // optimistic

    await expect(markDone('mock-token', 'log-1')).rejects.toThrow(
      'Failed to mark log done: 422',
    );

    // caller would restore previous on catch — verify previous is intact
    logs = previous;
    expect(logs).toEqual(mockHistory);
  });
});