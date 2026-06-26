import { generateText, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is not defined in the environment.");
}

const anthropic = createAnthropic({
  apiKey: apiKey,
});

// My Zod schema for the recovery plan
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

async function getRoutine(input: string) {
  const result = await generateText({
    model: anthropic('claude-sonnet-4-6'),
    output: Output.object({
      schema: RecoveryPlanSchema,
    }),
    prompt: `Generate a recovery plan for: "${input}". 
             Ensure the output strictly follows the schema structure for name, 
             estimatedMinutes, and the tasks array.`,
  });

  return result;
}

const input = process.argv[2] ?? 'I feel tired and need a gentle recovery routine.';

getRoutine(input)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error('Error generating routine:', error);
  });