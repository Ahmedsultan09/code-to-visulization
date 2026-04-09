import type { TraceFieldEntry, TraceTimelineEntry } from '../types/trace';
import { ActionBadge } from './ActionBadge';

type Props = {
  path: string | null;
  field: TraceFieldEntry | null;
};

function Row({ entry, index }: { entry: TraceTimelineEntry; index: number }) {
  return (
    <li className="relative border-l border-white/10 pl-4 pb-6 last:pb-0">
      <span className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]" />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-mono text-zinc-500">#{index + 1}</span>
        <ActionBadge action={entry.action} />
        <span className="text-xs text-zinc-400">{entry.source}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-100">
        Outcome:{' '}
        <span className="font-medium text-white">{entry.outcome}</span>
      </p>
      {entry.condition ? (
        <p className="mt-2 rounded-md bg-black/30 px-2 py-1.5 font-mono text-xs text-cyan-100/90 ring-1 ring-white/5">
          {entry.condition}
        </p>
      ) : null}
      {entry.detail && Object.keys(entry.detail).length > 0 ? (
        <pre className="mt-2 max-h-40 overflow-auto rounded-md bg-black/40 p-2 text-[11px] leading-relaxed text-zinc-300 ring-1 ring-white/5">
          {JSON.stringify(entry.detail, null, 2)}
        </pre>
      ) : null}
      {entry.valuePreview ? (
        <pre className="mt-2 max-h-32 overflow-auto rounded-md bg-black/25 p-2 text-[11px] text-zinc-400 ring-1 ring-white/5">
          {JSON.stringify(entry.valuePreview, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}

export function TimelinePanel({ path, field }: Props) {
  if (!path || !field) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/2 p-8 text-center text-sm text-zinc-500">
        Select a field in the tree to inspect its timeline.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-linear-to-b from-white/4 to-transparent p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Timeline
          </p>
          <h2 className="mt-1 font-mono text-lg text-white">{path}</h2>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
            field.included
              ? 'bg-emerald-500/10 text-emerald-200 ring-emerald-500/25'
              : 'bg-zinc-800 text-zinc-300 ring-white/10'
          }`}
        >
          {field.included ? 'included' : 'excluded'}
        </span>
      </div>
      {field.finalValuePreview ? (
        <div className="mb-4 rounded-lg bg-black/30 p-3 ring-1 ring-white/5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Final value preview
          </p>
          <pre className="mt-1 text-xs text-zinc-300">
            {JSON.stringify(field.finalValuePreview, null, 2)}
          </pre>
        </div>
      ) : null}
      <ol className="flex-1 space-y-0 overflow-y-auto pr-1">
        {field.timeline.map((e, i) => (
          <Row key={`${e.t ?? ''}-${i}`} entry={e} index={i} />
        ))}
      </ol>
    </div>
  );
}
