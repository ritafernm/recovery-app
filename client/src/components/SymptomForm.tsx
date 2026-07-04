'use client';

import { useState } from 'react';

export default function SymptomForm() {
  const [description, setDescription] = useState('');
  const [muscleSoreness, setmuscleSoreness] = useState(0);
  const [mentalStress, setMentalStress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // TODO: call API to generate recovery plan from symptoms
      console.log({ description, muscleSoreness, mentalStress });
    } finally {
      setIsSubmitting(false);
    }
  }

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
        className="mt-2 flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {isSubmitting ? 'Generating plan…' : 'Generate Recovery Plan'}
      </button>
    </form>
  );
}
