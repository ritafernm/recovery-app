/**
 * Integration tests — SymptomForm × /api/recovery-plan
 **/

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import SymptomForm from '../src/components/SymptomForm';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const recoveryPlan = {
  name: 'Full Recovery',
  estimatedMinutes: 40,
  tasks: [
    {
      name: 'Foam rolling',
      category: 'physical' as const,
      durationMinutes: 15,
      isRequired: true,
      tip: 'Focus on tight spots.',
    },
    {
      name: 'Box breathing',
      category: 'mental' as const,
      durationMinutes: 10,
    },
    {
      name: 'Cold shower',
      category: 'biophysical' as const,
      durationMinutes: 5,
    },
  ],
};

// ---------------------------------------------------------------------------
// MSW server — default handler returns the recovery plan
// Relative path matches any origin, making it work regardless of how jsdom
// resolves the base URL in the Vitest environment.
// ---------------------------------------------------------------------------
const server = setupServer(
  http.post('/api/recovery-plan', () =>
    HttpResponse.json(recoveryPlan),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fillAndSubmit(symptom = 'Sore legs after a long run') {
  const user = userEvent.setup();
  render(<SymptomForm />);
  await user.type(screen.getByRole('textbox', { name: /describe your symptoms/i }), symptom);
  await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------
describe('SymptomForm — successful plan fetch', () => {
  it('sends a POST with the symptom description and slider values', async () => {
    let capturedBody: unknown;

    server.use(
      http.post('/api/recovery-plan', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json(recoveryPlan);
      }),
    );

    const user = userEvent.setup();
    render(<SymptomForm />);

    const textarea = screen.getByRole('textbox', { name: /describe your symptoms/i });
    await user.type(textarea, 'Tight hamstrings');

    const soreness = screen.getByRole('slider', { name: /muscle soreness/i });
    fireEvent.change(soreness, { target: { value: '2' } });

    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    await waitFor(() => expect(capturedBody).toMatchObject({
      description: 'Tight hamstrings',
      muscleSoreness: 2,
      mentalStress: 0,
    }));
  });

  it('renders the plan name after a successful response', async () => {
    await fillAndSubmit();
    expect(await screen.findByText('Full Recovery')).toBeInTheDocument();
  });

  it('renders the total duration estimate', async () => {
    await fillAndSubmit();
    // durationMinutes sum: 15 + 10 + 5 = 30
    expect(await screen.findByText(/~30 min total/i)).toBeInTheDocument();
  });

  it('renders a region for each task category present in the plan', async () => {
    await fillAndSubmit();
    await waitFor(() => {
      // Use exact strings so the regex doesn't accidentally match 'biophysical tasks'
      // when looking for 'physical tasks' (substring collision).
      expect(screen.getByRole('region', { name: 'physical tasks' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'mental tasks' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'biophysical tasks' })).toBeInTheDocument();
    });
  });

  it('renders the task name, duration and tip within its category section', async () => {
    await fillAndSubmit();
    const physicalSection = await screen.findByRole('region', { name: 'physical tasks' });
    expect(physicalSection).toHaveTextContent('Foam rolling');
    expect(physicalSection).toHaveTextContent('15 min');
    expect(physicalSection).toHaveTextContent('Focus on tight spots.');
  });

  it('re-enables the submit button after the plan loads', async () => {
    await fillAndSubmit();
    await screen.findByText('Full Recovery');
    expect(screen.getByRole('button', { name: /generate recovery plan/i })).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// In-flight / loading state
// ---------------------------------------------------------------------------
describe('SymptomForm — loading state', () => {
  it('disables the submit button and shows aria-busy while in flight', async () => {
    let resolve!: (value: ReturnType<typeof HttpResponse.json>) => void;

    server.use(
      http.post('/api/recovery-plan', () =>
        new Promise((r) => {
          resolve = () => r(HttpResponse.json(recoveryPlan));
        }),
      ),
    );

    const user = userEvent.setup();
    render(<SymptomForm />);
    await user.type(screen.getByRole('textbox'), 'Tired');
    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    const busyBtn = screen.getByRole('button', { name: /generating plan/i });
    expect(busyBtn).toHaveAttribute('aria-busy', 'true');
    expect(busyBtn).toBeDisabled();

    resolve();
    await screen.findByText('Full Recovery');
  });
});

// ---------------------------------------------------------------------------
// Error states — MSW one-off overrides
// ---------------------------------------------------------------------------
describe('SymptomForm — error responses', () => {
  it('shows rate-limit message for a 429 response', async () => {
    server.use(
      http.post('/api/recovery-plan', () =>
        HttpResponse.json({ error: 'Too many requests' }, { status: 429 }),
      ),
    );

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/rate limit reached/i);
  });

  it('shows a Retry button for a 502 response', async () => {
    server.use(
      http.post('/api/recovery-plan', () =>
        HttpResponse.json({ error: 'Bad gateway' }, { status: 502 }),
      ),
    );

    await fillAndSubmit();

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: /retry/i })).not.toBeDisabled();
  });

  it('shows the error message for a generic 500 response', async () => {
    server.use(
      http.post('/api/recovery-plan', () =>
        HttpResponse.json({ error: 'Internal server error' }, { status: 500 }),
      ),
    );

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/internal server error/i);
  });

  it('clears a previous error when the user retries and succeeds', async () => {
    // First request: fail
    server.use(
      http.post(
        '/api/recovery-plan',
        () => HttpResponse.json({ error: 'Bad gateway' }, { status: 502 }),
        { once: true },
      ),
    );

    await fillAndSubmit();

    const retryBtn = await screen.findByRole('button', { name: /retry/i });

    // Second request: succeed (default handler takes over after `once`)
    await userEvent.setup().click(retryBtn);

    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Full Recovery')).toBeInTheDocument();
  });
});
