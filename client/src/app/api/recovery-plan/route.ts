import { anthropic } from '@ai-sdk/anthropic';
import { generateObject } from 'ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RecoveryPlanSchema } from '@/lib/schema';

const RequestSchema = z.object({
  description: z.string().min(1),
  muscleSoreness: z.number().int().min(0).max(5),
  mentalStress: z.number().int().min(0).max(5),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { description, muscleSoreness, mentalStress } = parsed.data;

  let object: unknown;
  try {
    ({ object } = await generateObject({
      model: anthropic('claude-sonnet-4-5'),
      schema: RecoveryPlanSchema,
      prompt: `You are a certified sports-recovery coach. A user has submitted the following symptoms:

Description: ${description}
Muscle soreness: ${muscleSoreness}/5
Mental stress: ${mentalStress}/5

Generate a personalised recovery plan for today. Each task must belong to one of the categories: physical, mental, or biophysical.
Return structured JSON that matches the schema exactly.`,
    }));
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode;
    if (statusCode === 429) {
      return NextResponse.json(
        { error: 'The AI service is rate-limited. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    console.error('generateObject failed', err);
    return NextResponse.json(
      { error: 'The AI service is currently unavailable. Please try again shortly.' },
      { status: 502 }
    );
  }

  const validated = RecoveryPlanSchema.safeParse(object);
  if (!validated.success) {
    console.error('AI output failed schema validation', validated.error.flatten());
    return NextResponse.json({ error: 'AI returned an invalid recovery plan. Please try again.' }, { status: 502 });
  }

  return NextResponse.json(validated.data);
}
