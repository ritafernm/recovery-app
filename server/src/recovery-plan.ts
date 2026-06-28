import { generateText, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

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

class RecoveryPlanAIError extends Error {
  constructor(public statusCode: 502 | 504, message: string) {
    super(message);
    this.name = 'RecoveryPlanAIError';
  }
}

function classifyAIError(error: unknown): RecoveryPlanAIError {
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('timeout') || normalizedMessage.includes('timed out')) {
    return new RecoveryPlanAIError(504, 'The AI service timed out while generating the recovery plan.');
  }

  return new RecoveryPlanAIError(502, `The AI service failed: ${message}`);
}

async function getRecoveryPlan(input: string) {
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000);

  const aiOperation = generateText({
    model: anthropic('claude-sonnet-4-6'),
    output: Output.object({
      schema: RecoveryPlanSchema,
    }),
    prompt: `Generate a recovery plan for: "${input}". 
             Ensure the output strictly follows the schema structure for name, 
             estimatedMinutes, and the tasks array.`,
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error('AI request timed out'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([aiOperation, timeoutPromise]);
    return result;
  } catch (error) {
    throw classifyAIError(error);
  }
}

const input = process.argv[2] ?? 'I feel tired and need a gentle recovery plan.';

getRecoveryPlan(input)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    if (error instanceof RecoveryPlanAIError) {
      console.error(JSON.stringify({
        error: error.message,
        statusCode: error.statusCode,
      }, null, 2));
      process.exitCode = error.statusCode;
      return;
    }

    console.error('Error generating recovery plan:', error);
    process.exitCode = 502;
  });