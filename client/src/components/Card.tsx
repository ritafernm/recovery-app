export type Category = 'physical' | 'mental' | 'biophysical';

export interface CardProps {
  name: string;
  category: Category;
  durationMinutes?: number;
  reps?: number;
  tip?: string;
  difficulty?: number;
  isRequired?: boolean;
  tags?: string[];
}

export const categoryStyles: Record<Category, { badge: string; dot: string; heading: string }> = {
  physical: {
    badge:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    dot:     'bg-blue-500',
    heading: 'text-blue-600 dark:text-blue-400',
  },
  mental: {
    badge:   'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    dot:     'bg-violet-500',
    heading: 'text-violet-600 dark:text-violet-400',
  },
  biophysical: {
    badge:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    dot:     'bg-emerald-500',
    heading: 'text-emerald-600 dark:text-emerald-400',
  },
};

function DifficultyDots({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`Difficulty ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`size-1.5 rounded-full ${
            i < value ? 'bg-zinc-600 dark:bg-zinc-300' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        />
      ))}
    </span>
  );
}

export interface CategorySectionProps {
  category: Category;
  tasks: CardProps[];
}

export function CategorySection({ category, tasks }: CategorySectionProps) {
  if (tasks.length === 0) return null;
  const { heading } = categoryStyles[category];
  return (
    <section aria-label={`${category} tasks`} className="flex flex-col gap-3">
      <h4 className={`text-sm font-semibold uppercase tracking-widest ${heading}`}>
        {category}
      </h4>
      <ul className="flex flex-col gap-3">
        {tasks.map((task) => (
          <li key={`${task.category}-${task.name}`}>
            <Card {...task} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Card({
  name,
  category,
  durationMinutes,
  reps,
  tip,
  difficulty,
  isRequired,
  tags,
}: CardProps) {
  const { badge } = categoryStyles[category];

  return (
    <article className="rounded-xl border border-black/[.08] bg-white p-4 dark:border-white/[.1] dark:bg-zinc-900">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{name}</span>
          {isRequired && (
            <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              Required
            </span>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${badge}`}>
          {category}
        </span>
      </div>

      {/* Tip */}
      {tip && (
        <p className="mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{tip}</p>
      )}

      {/* Meta row */}
      {(durationMinutes != null || reps != null || difficulty != null) && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
          {durationMinutes != null && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
                <path fillRule="evenodd" d="M1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Zm7.75-4.25a.75.75 0 0 0-1.5 0V8c0 .414.336.75.75.75h3.25a.75.75 0 0 0 0-1.5h-2.5V3.75Z" clipRule="evenodd" />
              </svg>
              {durationMinutes} min
            </span>
          )}
          {reps != null && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08.932.75.75 0 0 1-1.3-.75 6 6 0 0 1 9.44-1.242l.842.84V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.241l-.84-.84v1.371a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.841.841a4.5 4.5 0 0 0 7.08-.932.75.75 0 0 1 1.024-.273Z" clipRule="evenodd" />
              </svg>
              {reps} reps
            </span>
          )}
          {difficulty != null && (
            <span className="flex items-center gap-1.5">
              <DifficultyDots value={difficulty} />
            </span>
          )}
        </div>
      )}

      {/* Tags */}
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
