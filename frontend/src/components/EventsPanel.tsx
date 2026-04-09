import type { TracePayload } from '../types/trace';
import { ActionBadge } from './ActionBadge';

type Props = { trace: TracePayload };

export function EventsPanel({ trace }: Props) {
  const events = trace.events ?? [];

  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-center text-sm text-zinc-500">
        No flat <code className="text-zinc-400">events</code> array in this payload.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-black/20">
      <table className="min-w-full text-left text-sm text-zinc-200">
        <thead className="border-b border-white/10 text-[11px] uppercase tracking-wider text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Time</th>
            <th className="px-3 py-2 font-medium">Path</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 font-medium">Outcome</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {events.map((e, i) => (
            <tr key={`${e.t}-${e.path}-${i}`} className="hover:bg-white/[0.03]">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-zinc-500">
                {e.t ?? '—'}
              </td>
              <td className="px-3 py-2 font-mono text-xs text-cyan-100/90">{e.path}</td>
              <td className="px-3 py-2">
                <ActionBadge action={e.action} />
              </td>
              <td className="px-3 py-2 text-xs text-zinc-400">{e.source}</td>
              <td className="px-3 py-2 text-xs font-medium text-white">{e.outcome}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
