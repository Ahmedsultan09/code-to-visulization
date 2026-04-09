import { useMemo, useState } from 'react';
import type { TracePayload } from '../types/trace';
import { EventsPanel } from './EventsPanel';
import { FieldTree, type FilterMode } from './FieldTree';
import { TimelinePanel } from './TimelinePanel';

type Props = {
  trace: TracePayload;
};

export function TraceViewer({ trace }: Props) {
  const paths = useMemo(() => Object.keys(trace.fields).sort(), [trace.fields]);
  const [selected, setSelected] = useState<string | null>(paths[0] ?? null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [tab, setTab] = useState<'fields' | 'events'>('fields');

  const field = selected ? trace.fields[selected] ?? null : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/80">
            Request details (for developers)
          </p>
          <h1 className="mt-2 font-['DM_Serif_Display',serif] text-3xl text-white md:text-4xl">
            Fields in this response
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
            {trace.resource ?? 'Unknown resource'} · request{' '}
            <span className="font-mono text-zinc-200">{trace.requestId}</span>
            {typeof trace.durationMs === 'number' ? (
              <>
                {' '}
                · <span className="text-zinc-200">{trace.durationMs} ms</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['fields', 'events'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider ring-1 transition ${
                tab === t
                  ? 'bg-cyan-400/15 text-cyan-100 ring-cyan-400/40'
                  : 'bg-white/5 text-zinc-400 ring-white/10 hover:bg-white/10'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {tab === 'events' ? (
        <EventsPanel trace={trace} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {(['all', 'included', 'excluded', 'override'] as FilterMode[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ring-1 ${
                  filter === f
                    ? 'bg-white text-zinc-900 ring-white'
                    : 'bg-transparent text-zinc-400 ring-white/15 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <FieldTree
              fields={trace.fields}
              selected={selected}
              onSelect={setSelected}
              filter={filter}
            />
            <TimelinePanel path={selected} field={field} />
          </div>
        </>
      )}
    </div>
  );
}
