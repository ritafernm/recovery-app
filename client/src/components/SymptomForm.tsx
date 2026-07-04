'use client';

import { useState } from 'react';
import type { RecoveryPlan } from '@/lib/schema';
import { CategorySection } from '@/components/Card';

type ErrorKind = 'rate-limit' | 'server-error' | 'general';
interface AppError { kind: ErrorKind; message: string; }

export default function SymptomForm() {
  const [description, setDescription] = useState('');
  const [muscleSoreness, setmuscleSoreness] = useState(0);
  const [mentalStress, setMentalStress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plan, setPlan] = useState<RecoveryPlan | null>(null);
  const [appError, setAppError] = useState<AppError | null>(null);

  async function submit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setAppError(null);
    setPlan(null);
    try {
      const res = await fetch('/api/recovery-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, muscleSoreness, mentalStress }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = (data as { error?: string }).error ?? `Request failed (${res.status})`;
        if (res.status === 429) {
          setAppError({ kind: 'rate-limit', message });
        } else if (res.status === 502 || res.status === 504) {
          setAppError({ kind: 'server-error', message });
        } else {
          setAppError({ kind: 'general', message });
        }
        return;
      }
      setPlan(await res.json());
    } catch (err) {
      setAppError({ kind: 'general', message: err instanceof Error ? err.message : 'Something went wrong' });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit();
  }

  const totalMinutes = plan?.tasks.reduce((sum, t) => sum + (t.durationMinutes ?? 0), 0) ?? 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-6 rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.1] dark:bg-zinc-900"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl text-zinc-500 font-semibold tracking-tight">How are you feeling?</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Describe your symptoms and we&apos;ll build a personalised recovery plan.
        </p>
      </div>

      {/* Symptom description */}
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm text-zinc-500 font-medium">
          Describe your symptoms
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="e.g. sore lower back after a long run, difficulty sleeping, feeling anxious…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full resize-none rounded-lg border border-black/[.12] text-zinc-500 px-4 py-3 text-sm leading-relaxed placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-white/[.1] dark:bg-zinc-800 dark:placeholder:text-zinc-600 dark:focus:ring-zinc-700"
        />
      </div>

      {/* Physical soreness */}
      <div className="flex flex-col gap-2">
        <label htmlFor="muscleSoreness" className="flex justify-between text-sm text-zinc-500 font-medium">
          <span>Muscle soreness</span>
          <span className="tabular-nums">{muscleSoreness}&nbsp;/ 5</span>
        </label>
        <input
          id="muscleSoreness"
          name="muscleSoreness"
          type="range"
          min={0}
          max={5}
          step={1}
          value={muscleSoreness}
          onChange={(e) => setmuscleSoreness(Number(e.target.value))}
          className="w-full accent-zinc-900 dark:accent-zinc-100"
        />
        <div className="flex justify-between text-xs text-zinc-400">
          <span>None</span>
          <span>Severe</span>
        </div>
      </div>

      {/* Mental stress */}
      <div className="flex flex-col gap-2">
        <label htmlFor="mentalStress" className="flex justify-between text-sm text-zinc-500 font-medium">
          <span>Mental stress</span>
          <span className="tabular-nums">{mentalStress}&nbsp;/ 5</span>
        </label>
        <input
          id="mentalStress"
          name="mentalStress"
          type="range"
          min={0}
          max={5}
          step={1}
          value={mentalStress}
          onChange={(e) => setMentalStress(Number(e.target.value))}
          className="w-full accent-zinc-900 dark:accent-zinc-100"
        />
        <div className="flex justify-between text-xs text-zinc-400">
          <span>None</span>
          <span>Severe</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting || description.trim().length === 0}
        aria-busy={isSubmitting}
        className="mt-2 flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isSubmitting ? 'Generating plan…' : 'Generate Recovery Plan'}
      </button>

      {appError?.kind === 'rate-limit' && (
        <div role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-semibold">Rate limit reached</p>
          <p className="mt-0.5">{appError.message}</p>
        </div>
      )}

      {appError?.kind === 'server-error' && (
        <div role="alert" className="flex items-start justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <p>{appError.message}</p>
          <button
            type="button"
            onClick={submit}
            disabled={isSubmitting}
            className="shrink-0 font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      )}

      {appError?.kind === 'general' && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {appError.message}
        </p>
      )}

      {plan && (
        <section className="flex flex-col gap-6 pt-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">{plan.name}</h3>
            <p className="text-sm text-zinc-500">~{totalMinutes} min total</p>
          </div>

          {(['physical', 'mental', 'biophysical'] as const).map((cat) => (
            <CategorySection
              key={cat}
              category={cat}
              tasks={plan.tasks.filter((t) => t.category === cat)}
            />
          ))}
        </section>
      )}
    </form>
  );
}
