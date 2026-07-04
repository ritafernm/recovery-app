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

  const plan = validated.data;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      // Save the plan to recovery_plans
      const dbRes = await fetch(`${supabaseUrl}/rest/v1/recovery_plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify([{ name: plan.name, plan_data: plan }]),
      });

      if (!dbRes.ok) {
        console.error('Failed to save recovery plan to database:', dbRes.status, await dbRes.text());
      } else {
        const savedData = await dbRes.json();
        const [savedPlan] = Array.isArray(savedData) ? savedData : [savedData];

        if (savedPlan?.id) {
          // Decode the user's JWT to get their user ID
          const userToken = req.cookies.get('session_token')?.value;
          let userId: string | null = null;
          if (userToken) {
            try {
              const [, payloadB64] = userToken.split('.');
              const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<string, unknown>;
              userId = typeof payload.sub === 'string' ? payload.sub : null;
            } catch {
              console.warn('Could not decode session token to extract user ID.');
            }
          }

          if (userId && userToken) {
            // Create a log entry with no user_status (not done yet)
            const logRes = await fetch(`${supabaseUrl}/rest/v1/recovery_plan_logs`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                apikey: supabaseKey,
                Authorization: `Bearer ${userToken}`,
                Prefer: 'return=representation',
              },
              body: JSON.stringify([{ plan_id: savedPlan.id, user_id: userId }]),
            });
            if (!logRes.ok) {
              console.error('Failed to create recovery plan log:', logRes.status, await logRes.text());
            }
          } else {
            console.warn('No authenticated user — skipping log creation.');
          }
        }
      }
    } catch (err) {
      console.error('Error persisting recovery plan:', err);
    }
  } else {
    console.warn('SUPABASE_URL or Supabase key not configured — recovery plan not persisted.');
  }

  return NextResponse.json(plan);
}
