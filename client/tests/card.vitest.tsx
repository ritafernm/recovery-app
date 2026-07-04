/**
 * Component tests — Card & CategorySection
 **/

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import Card, { CategorySection } from '../src/components/Card';
import type { CardProps } from '../src/components/Card';

afterEach(cleanup);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const base: CardProps = {
  name: 'Foam rolling',
  category: 'physical',
};

// ---------------------------------------------------------------------------
// Card — required fields
// ---------------------------------------------------------------------------
describe('Card — core rendering', () => {
  it('renders the task name', () => {
    render(<Card {...base} />);
    expect(screen.getByText('Foam rolling')).toBeInTheDocument();
  });

  it('renders the category badge', () => {
    render(<Card {...base} />);
    expect(screen.getByText('physical')).toBeInTheDocument();
  });

  it('renders the "Required" pill when isRequired is true', () => {
    render(<Card {...base} isRequired />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });

  it('does not render the "Required" pill when isRequired is false', () => {
    render(<Card {...base} isRequired={false} />);
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });

  it('does not render the "Required" pill when isRequired is omitted', () => {
    render(<Card {...base} />);
    expect(screen.queryByText('Required')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Card — optional meta fields
// ---------------------------------------------------------------------------
describe('Card — optional meta fields', () => {
  it('shows duration in minutes when provided', () => {
    render(<Card {...base} durationMinutes={15} />);
    expect(screen.getByText(/15 min/i)).toBeInTheDocument();
  });

  it('does not show duration row when durationMinutes is omitted', () => {
    render(<Card {...base} />);
    expect(screen.queryByText(/min/i)).not.toBeInTheDocument();
  });

  it('shows reps when provided', () => {
    render(<Card {...base} reps={3} />);
    expect(screen.getByText(/3 reps/i)).toBeInTheDocument();
  });

  it('does not show reps when omitted', () => {
    render(<Card {...base} />);
    expect(screen.queryByText(/reps/i)).not.toBeInTheDocument();
  });

  it('shows the tip text when provided', () => {
    render(<Card {...base} tip="Breathe deeply throughout." />);
    expect(screen.getByText('Breathe deeply throughout.')).toBeInTheDocument();
  });

  it('does not show a tip when omitted', () => {
    render(<Card {...base} />);
    expect(screen.queryByText(/breathe/i)).not.toBeInTheDocument();
  });

  it('renders difficulty with an accessible aria-label', () => {
    render(<Card {...base} difficulty={3} />);
    expect(screen.getByLabelText('Difficulty 3 of 5')).toBeInTheDocument();
  });

  it('does not render difficulty when omitted', () => {
    render(<Card {...base} />);
    expect(screen.queryByLabelText(/difficulty/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Card — tags
// ---------------------------------------------------------------------------
describe('Card — tags', () => {
  it('renders each tag as a visible chip', () => {
    render(<Card {...base} tags={['warm-up', 'flexibility', 'low-impact']} />);
    expect(screen.getByText('warm-up')).toBeInTheDocument();
    expect(screen.getByText('flexibility')).toBeInTheDocument();
    expect(screen.getByText('low-impact')).toBeInTheDocument();
  });

  it('renders no tags when the array is empty', () => {
    const { container } = render(<Card {...base} tags={[]} />);
    // The tags wrapper div is only rendered when tags.length > 0
    expect(container.querySelectorAll('.rounded-md.bg-zinc-100').length).toBe(0);
  });

  it('renders no tags section when tags is omitted', () => {
    const { container } = render(<Card {...base} />);
    expect(container.querySelectorAll('.rounded-md.bg-zinc-100').length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Card — category colours (badge class)
// ---------------------------------------------------------------------------
describe('Card — category badge colour variants', () => {
  it('applies mental category styling', () => {
    render(<Card name="Meditation" category="mental" />);
    const badge = screen.getByText('mental');
    expect(badge.className).toMatch(/violet/);
  });

  it('applies biophysical category styling', () => {
    render(<Card name="Cold shower" category="biophysical" />);
    const badge = screen.getByText('biophysical');
    expect(badge.className).toMatch(/emerald/);
  });
});

// ---------------------------------------------------------------------------
// CategorySection
// ---------------------------------------------------------------------------
describe('CategorySection', () => {
  it('renders a labelled region for the category', () => {
    render(
      <CategorySection
        category="physical"
        tasks={[{ name: 'Stretch', category: 'physical' }]}
      />,
    );
    expect(screen.getByRole('region', { name: /physical tasks/i })).toBeInTheDocument();
  });

  it('renders one list item per task', () => {
    render(
      <CategorySection
        category="mental"
        tasks={[
          { name: 'Meditation', category: 'mental' },
          { name: 'Journaling', category: 'mental' },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('returns nothing when the tasks array is empty', () => {
    const { container } = render(
      <CategorySection category="physical" tasks={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the section heading with the category name', () => {
    render(
      <CategorySection
        category="biophysical"
        tasks={[{ name: 'Ice bath', category: 'biophysical' }]}
      />,
    );
    // The <h4> heading should carry the category name; use role query to avoid
    // ambiguity with the badge <span> that also contains the word.
    expect(screen.getByRole('heading', { name: /biophysical/i })).toBeInTheDocument();
  });
});
