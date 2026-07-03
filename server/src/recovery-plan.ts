import { generateText, Output } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RecoveryPlanSchema, type RecoveryPlan } from 'shared';

function loadServerEnv() {
  try {
    const envFilePath = resolve(dirname(fileURLToPath(import.meta.url)), '.env');

    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envFilePath);
    }
  } catch {
    console.warn('No .env file found — relying on environment variables already set.');
  }
}

loadServerEnv();

let anthropicClient: ReturnType<typeof createAnthropic> | null = null;

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not defined in the environment.');
  }

  if (!anthropicClient) {
    anthropicClient = createAnthropic({ apiKey });
  }

  return anthropicClient;
}

export { RecoveryPlanSchema, type RecoveryPlan } from 'shared';

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

export async function generateRecoveryPlan(input: string): Promise<RecoveryPlan> {
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 30000);

  const aiOperation = generateText({
    model: getAnthropicClient()('claude-sonnet-4-6'),
    output: Output.object({
      schema: RecoveryPlanSchema,
    }),
    prompt: `Generate a recovery plan for: "${input}".
             Ensure the output strictly follows the schema structure for name,
             estimatedMinutes, and the tasks array.`,
  });

  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('AI request timed out'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([aiOperation, timeoutPromise]);
    return result.output;
  } catch (error) {
    throw classifyAIError(error);
  } finally {
    clearTimeout(timeoutId!);
  }
}

export async function saveRecoveryPlan(plan: RecoveryPlan) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL and a Supabase key must be configured to save recovery plans.');
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/recovery_plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify([{ name: plan.name, plan_data: plan }]),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to save recovery plan in Supabase: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const [savedPlan] = Array.isArray(data) ? data : [data];

  if (!savedPlan?.id) {
    throw new Error('Supabase did not return a persisted recovery plan id.');
  }

  return { id: String(savedPlan.id) };
}

const isMainModule = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const input = process.argv[2] ?? 'I feel tired and need a gentle recovery plan.';

  generateRecoveryPlan(input)
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
}