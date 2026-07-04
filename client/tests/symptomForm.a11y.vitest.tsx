/**
 * Accessibility tests — SymptomForm screen-reader flow
 **/

import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SymptomForm from '../src/components/SymptomForm';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    }),
  );
}

const minimalPlan = {
  name: 'Active Recovery',
  tasks: [
    {
      name: 'Foam rolling',
      category: 'physical' as const,
      durationMinutes: 10,
      isRequired: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// 1. Form structure — what a screen reader announces on page load
// ---------------------------------------------------------------------------
describe('Form structure (initial render)', () => {
  beforeEach(() => render(<SymptomForm />));

  it('exposes the form via its associated description (aria-describedby)', () => {
    const desc = screen.getByText(/describe your symptoms and we/i);
    expect(desc).toHaveAttribute('id', 'symptom-form-desc');

    // The form element should reference that description
    const form = desc.closest('form');
    expect(form).toHaveAttribute('aria-describedby', 'symptom-form-desc');
  });

  it('has a labelled textarea for symptom description', () => {
    const textarea = screen.getByRole('textbox', { name: /describe your symptoms/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('required');
  });

  it('has labelled range sliders with accessible value text', () => {
    const soreness = screen.getByRole('slider', { name: /muscle soreness/i });
    expect(soreness).toHaveAttribute('aria-valuetext', 'None');

    const stress = screen.getByRole('slider', { name: /mental stress/i });
    expect(stress).toHaveAttribute('aria-valuetext', 'None');
  });

  it('submit button is disabled and labelled when description is empty', () => {
    const btn = screen.getByRole('button', { name: /generate recovery plan/i });
    expect(btn).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 2. Keyboard navigation — Tab order visits every interactive element
// ---------------------------------------------------------------------------
describe('Keyboard navigation', () => {
  it('reaches textarea, both sliders, and submit button via Tab', async () => {
    const user = userEvent.setup();
    render(<SymptomForm />);

    // Start focus in the form area
    await user.tab();
    expect(document.activeElement?.tagName).toBe('TEXTAREA');

    await user.tab();
    expect(document.activeElement).toHaveAttribute('id', 'muscleSoreness');

    await user.tab();
    expect(document.activeElement).toHaveAttribute('id', 'mentalStress');

    await user.tab();
    // Submit button is still disabled here, but still reachable in the tab order
    expect(document.activeElement).toHaveAttribute('type', 'submit');
  });
});

// ---------------------------------------------------------------------------
// 3. Slider value text updates — screen readers read aria-valuetext on change
// ---------------------------------------------------------------------------
describe('Slider aria-valuetext updates', () => {
  it('updates muscle soreness value text as slider changes', async () => {
    const user = userEvent.setup();
    render(<SymptomForm />);

    const slider = screen.getByRole('slider', { name: /muscle soreness/i });
    slider.focus();

    // Arrow-right increments value
    await user.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Mild');

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Significant');
  });

  it('updates mental stress value text as slider changes', async () => {
    const user = userEvent.setup();
    render(<SymptomForm />);

    const slider = screen.getByRole('slider', { name: /mental stress/i });
    slider.focus();

    await user.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuetext', 'Low');
  });
});

// ---------------------------------------------------------------------------
// 4. Successful submission — live region announces the plan
// ---------------------------------------------------------------------------
describe('Successful submission (screen-reader flow)', () => {
  it('announces the recovery plan via aria-live region', async () => {
    mockFetch(200, minimalPlan);
    const user = userEvent.setup();
    render(<SymptomForm />);

    await user.type(screen.getByRole('textbox'), 'Sore legs after long run');
    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    // Plan section should appear with aria-live="polite" so AT announces it
    const planSection = await screen.findByRole('region', { name: /your recovery plan/i });
    expect(planSection).toHaveAttribute('aria-live', 'polite');

    // Plan name and task are accessible within the live region
    expect(within(planSection).getByText('Active Recovery')).toBeInTheDocument();
    expect(within(planSection).getByText('Foam rolling')).toBeInTheDocument();
  });

  it('shows "Generating plan…" with aria-busy while request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn().mockReturnValue(
        new Promise((r) => {
          resolve = r;
        }),
      ),
    );

    const user = userEvent.setup();
    render(<SymptomForm />);
    await user.type(screen.getByRole('textbox'), 'Tired');

    const submitBtn = screen.getByRole('button', { name: /generate recovery plan/i });
    await user.click(submitBtn);

    // While in-flight the button text and aria-busy change
    const busyBtn = screen.getByRole('button', { name: /generating plan/i });
    expect(busyBtn).toHaveAttribute('aria-busy', 'true');
    expect(busyBtn).toBeDisabled();

    // Resolve to prevent state-update-after-unmount warnings
    resolve({ ok: true, status: 200, json: () => Promise.resolve(minimalPlan) });
  });
});

// ---------------------------------------------------------------------------
// 5. Error states — role="alert" surfaces errors to screen readers immediately
// ---------------------------------------------------------------------------
describe('Error announcements', () => {
  it('announces a rate-limit error via role="alert"', async () => {
    mockFetch(429, { error: 'Too many requests' });
    const user = userEvent.setup();
    render(<SymptomForm />);

    await user.type(screen.getByRole('textbox'), 'Sore');
    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/rate limit reached/i);
  });

  it('announces a server error with a labelled Retry button', async () => {
    mockFetch(502, { error: 'Bad gateway' });
    const user = userEvent.setup();
    render(<SymptomForm />);

    await user.type(screen.getByRole('textbox'), 'Sore');
    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    await screen.findByRole('alert');
    // Retry button must be keyboard-reachable and labelled
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeInTheDocument();
    expect(retryBtn).not.toBeDisabled();
  });

  it('announces a general error via role="alert"', async () => {
    mockFetch(500, { error: 'Internal server error' });
    const user = userEvent.setup();
    render(<SymptomForm />);

    await user.type(screen.getByRole('textbox'), 'Sore');
    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/internal server error/i);
  });
});

// ---------------------------------------------------------------------------
// 6. CategorySection — landmark structure within the plan
// ---------------------------------------------------------------------------
describe('Recovery plan landmark structure', () => {
  it('exposes each category as a labelled region', async () => {
    mockFetch(200, {
      name: 'Full Recovery',
      tasks: [
        { name: 'Stretch', category: 'physical', durationMinutes: 5 },
        { name: 'Meditation', category: 'mental', durationMinutes: 10 },
      ],
    });
    const user = userEvent.setup();
    render(<SymptomForm />);

    await user.type(screen.getByRole('textbox'), 'Sore and stressed');
    await user.click(screen.getByRole('button', { name: /generate recovery plan/i }));

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /physical tasks/i })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: /mental tasks/i })).toBeInTheDocument();
    });
  });
});
