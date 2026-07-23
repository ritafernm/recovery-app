import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HistoryError from '../src/app/history/error';
import HistoryLoading from '../src/app/history/loading';
import { HistoryList, type Log } from '../src/components/HistoryList';

afterEach(cleanup);

const logs: Log[] = [
  {
    id: 'log-1',
    plan_id: 'plan-A',
    user_id: 'user-1',
    user_status: null,
    completed_at: null,
    created_at: '2026-07-04T10:00:00Z',
  },
  {
    id: 'log-2',
    plan_id: 'plan-B',
    user_id: 'user-1',
    user_status: 'done',
    completed_at: '2026-07-04T11:00:00Z',
    created_at: '2026-07-04T09:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Skeleton / loading state
// ---------------------------------------------------------------------------
describe('HistoryLoading (skeleton)', () => {
  it('renders an aria-busy region while loading', () => {
    const { container } = render(<HistoryLoading />);
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('uses motion-safe:animate-pulse so animation is skipped under prefers-reduced-motion', () => {
    const { container } = render(<HistoryLoading />);
    const pulsingEls = container.querySelectorAll('[class*="motion-safe:animate-pulse"]');
    expect(pulsingEls.length).toBeGreaterThan(0);
  });

  it('renders exactly three skeleton rows', () => {
    const { container } = render(<HistoryLoading />);
    const rows = container.querySelectorAll('.rounded-xl');
    expect(rows).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
describe('HistoryList — empty state', () => {
  it('shows the empty-state message when there are no logs', () => {
    render(<HistoryList logs={[]} onMarkDone={vi.fn()} />);
    expect(screen.getByText(/no logs yet/i)).toBeInTheDocument();
  });

  it('does not render a list when empty', () => {
    render(<HistoryList logs={[]} onMarkDone={vi.fn()} />);
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error + retry
// ---------------------------------------------------------------------------
describe('HistoryError — error with retry', () => {
  it('renders the error message inside an alert region', () => {
    render(<HistoryError error={new Error('Failed to fetch logs: 503')} reset={vi.fn()} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/failed to fetch logs: 503/i)).toBeInTheDocument();
  });

  it('calls reset() when "Try again" is clicked', async () => {
    const reset = vi.fn();
    render(<HistoryError error={new Error('oops')} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(reset).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Success state
// ---------------------------------------------------------------------------
describe('HistoryList — success state', () => {
  it('renders one list item per log', () => {
    render(<HistoryList logs={logs} onMarkDone={vi.fn()} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(logs.length);
  });

  it('shows plan ids for each log', () => {
    render(<HistoryList logs={logs} onMarkDone={vi.fn()} />);
    expect(screen.getByText('Plan plan-A')).toBeInTheDocument();
    expect(screen.getByText('Plan plan-B')).toBeInTheDocument();
  });

  it('shows "Mark done" only for incomplete logs', () => {
    render(<HistoryList logs={logs} onMarkDone={vi.fn()} />);
    expect(screen.getAllByRole('button', { name: /mark done/i })).toHaveLength(1);
  });

  it('shows "Done" badge for completed logs', () => {
    render(<HistoryList logs={logs} onMarkDone={vi.fn()} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Success transition — optimistic mark-done + rollback
// ---------------------------------------------------------------------------
describe('HistoryList — mark-done transition', () => {
  it('calls onMarkDone with the correct logId when "Mark done" is clicked', async () => {
    const onMarkDone = vi.fn();
    render(<HistoryList logs={logs} onMarkDone={onMarkDone} />);
    await userEvent.click(screen.getByRole('button', { name: /mark done/i }));
    expect(onMarkDone).toHaveBeenCalledWith('log-1');
  });

  it('re-renders as "Done" after optimistic state update', () => {
    const { rerender } = render(<HistoryList logs={logs} onMarkDone={vi.fn()} />);

    const optimistic: Log[] = logs.map((l) =>
      l.id === 'log-1'
        ? { ...l, user_status: 'done', completed_at: new Date().toISOString() }
        : l,
    );
    rerender(<HistoryList logs={optimistic} onMarkDone={vi.fn()} />);

    expect(screen.queryByRole('button', { name: /mark done/i })).not.toBeInTheDocument();
    expect(screen.getAllByText('Done')).toHaveLength(2);
  });

  it('shows "Mark done" again after rollback to previous state', () => {
    const { rerender } = render(<HistoryList logs={logs} onMarkDone={vi.fn()} />);

    const optimistic: Log[] = logs.map((l) =>
      l.id === 'log-1'
        ? { ...l, user_status: 'done', completed_at: new Date().toISOString() }
        : l,
    );
    rerender(<HistoryList logs={optimistic} onMarkDone={vi.fn()} />);
    rerender(<HistoryList logs={logs} onMarkDone={vi.fn()} />); // rollback

    expect(screen.getByRole('button', { name: /mark done/i })).toBeInTheDocument();
  });
});
