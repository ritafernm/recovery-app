import type { Metadata } from 'next';
import Image from 'next/image';
import SymptomForm from '@/components/SymptomForm';

export const metadata: Metadata = {
  title: 'Log Symptoms | RecoveryApp',
  description: 'Describe how you are feeling and get a personalised recovery plan based on your muscle soreness and mental stress.',
};

// No user-specific data — build once and serve from the CDN edge.
export const dynamic = 'force-static';

export default function Home() {
  //await new Promise((r) => setTimeout(r,8000)); // loading test
  return (
    <div className="flex flex-col gap-6">
      <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-teal-50 dark:bg-teal-950 sm:h-64">
        {/* Replace /hero.svg with your own photo */}
        <Image
          src="/hero.svg"
          alt="Recovery plan heartrate graphic"
          fill
          priority
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 960px"
        />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log your symptoms</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Tell us how you&apos;re feeling and we&apos;ll generate a tailored recovery plan.
        </p>
      </div>
      <SymptomForm />
    </div>
  );
}
