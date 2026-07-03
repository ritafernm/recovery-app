import { z } from 'zod';

export const RecoveryPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  estimatedMinutes: z.number().positive('Must be a positive number'),
  tasks: z.array(
    z.object({
      name: z.string().min(1, 'Task name is required'),
      category: z.enum(['physical', 'mental', 'biophysical']),
      durationMinutes: z.number().positive().optional(),
      reps: z.number().positive().optional(),
      tip: z.string().optional(),
      difficulty: z.number().int().min(1).max(5).optional(),
      isRequired: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    })
  ).min(1, 'At least one task is required'),
});

export type RecoveryPlan = z.infer<typeof RecoveryPlanSchema>;
