type Props = { action: string };

const palette: Record<string, string> = {
  set: 'bg-emerald-500/15 text-emerald-200 ring-emerald-500/30',
  merge: 'bg-sky-500/15 text-sky-200 ring-sky-500/30',
  when: 'bg-amber-500/15 text-amber-100 ring-amber-500/35',
  gate: 'bg-rose-500/15 text-rose-100 ring-rose-500/35',
  enum: 'bg-violet-500/15 text-violet-100 ring-violet-500/35',
};

export function ActionBadge({ action }: Props) {
  const cls = palette[action] ?? 'bg-white/5 text-zinc-200 ring-white/10';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${cls}`}
    >
      {action}
    </span>
  );
}
