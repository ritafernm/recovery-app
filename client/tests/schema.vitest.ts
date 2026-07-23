/**
 * Unit tests for RecoveryPlanSchema (Zod validation)
 **/

import { describe, expect, it } from 'vitest';
import { RecoveryPlanSchema } from 'shared';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const validTask = {
  name: 'Foam rolling',
  category: 'physical' as const,
  durationMinutes: 10,
};

const validPlan = {
  name: 'Active Recovery',
  estimatedMinutes: 30,
  tasks: [validTask],
};

// ---------------------------------------------------------------------------
// Top-level plan fields
// ---------------------------------------------------------------------------
describe('RecoveryPlanSchema — plan-level validation', () => {
  it('accepts a valid plan with all required fields', () => {
    const result = RecoveryPlanSchema.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('rejects when name is missing', () => {
    const { name: _n, ...rest } = validPlan;
    const result = RecoveryPlanSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when name is an empty string', () => {
    const result = RecoveryPlanSchema.safeParse({ ...validPlan, name: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined();
    }
  });

  it('rejects when estimatedMinutes is missing', () => {
    const { estimatedMinutes: _e, ...rest } = validPlan;
    const result = RecoveryPlanSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects when estimatedMinutes is zero', () => {
    const result = RecoveryPlanSchema.safeParse({ ...validPlan, estimatedMinutes: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects when estimatedMinutes is negative', () => {
    const result = RecoveryPlanSchema.safeParse({ ...validPlan, estimatedMinutes: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects an empty tasks array', () => {
    const result = RecoveryPlanSchema.safeParse({ ...validPlan, tasks: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.tasks).toBeDefined();
    }
  });

  it('accepts a plan with multiple tasks', () => {
    const plan = {
      ...validPlan,
      tasks: [
        validTask,
        { name: 'Meditation', category: 'mental' as const },
        { name: 'Cold shower', category: 'biophysical' as const },
      ],
    };
    expect(RecoveryPlanSchema.safeParse(plan).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task-level fields
// ---------------------------------------------------------------------------
describe('RecoveryPlanSchema — task-level validation', () => {
  it('rejects a task with an empty name', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, name: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown category', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, category: 'spiritual' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all three valid categories', () => {
    const categories = ['physical', 'mental', 'biophysical'] as const;
    for (const category of categories) {
      const result = RecoveryPlanSchema.safeParse({
        ...validPlan,
        tasks: [{ name: 'Task', category }],
      });
      expect(result.success, `category "${category}" should be valid`).toBe(true);
    }
  });

  it('rejects durationMinutes of zero', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, durationMinutes: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative reps', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, reps: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects difficulty below 1', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, difficulty: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects difficulty above 5', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, difficulty: 6 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a non-integer difficulty', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, difficulty: 2.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts all boundary difficulty values (1 and 5)', () => {
    for (const difficulty of [1, 5]) {
      const result = RecoveryPlanSchema.safeParse({
        ...validPlan,
        tasks: [{ ...validTask, difficulty }],
      });
      expect(result.success, `difficulty ${difficulty} should be valid`).toBe(true);
    }
  });

  it('accepts a task with all optional fields populated', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [
        {
          name: 'Stretch',
          category: 'physical',
          durationMinutes: 5,
          reps: 3,
          tip: 'Breathe deeply',
          difficulty: 2,
          isRequired: true,
          tags: ['warm-up', 'flexibility'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts a task with only the required fields (all optionals absent)', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ name: 'Walk', category: 'physical' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a tags entry that is not a string', () => {
    const result = RecoveryPlanSchema.safeParse({
      ...validPlan,
      tasks: [{ ...validTask, tags: [123] }],
    });
    expect(result.success).toBe(false);
  });
});
