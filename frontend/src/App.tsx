import { useCallback, useId, useState } from 'react';
import { DesignerViewer } from './components/DesignerViewer';
import { TraceViewer } from './components/TraceViewer';
import { analyzePhpJsonResource } from './lib/analyzePhpJsonResource';
import { SAMPLE_PHP_RESOURCE } from './samplePhpResource';
import { sampleEnvelope } from './sampleTrace';
import type { ResourceBlueprint } from './types/resourceBlueprint';
import type { ApiEnvelope, TracePayload } from './types/trace';

type MainTab = 'designer' | 'runtime';

const INITIAL_DESIGNER = analyzePhpJsonResource(SAMPLE_PHP_RESOURCE);

export function App() {
  const [tab, setTab] = useState<MainTab>('designer');

  const [phpSource, setPhpSource] = useState(SAMPLE_PHP_RESOURCE);
  const [phpError, setPhpError] = useState<string | null>(INITIAL_DESIGNER.error);
  const [blueprint, setBlueprint] = useState<ResourceBlueprint | null>(INITIAL_DESIGNER.blueprint);
  const [phpWarnings, setPhpWarnings] = useState<string[]>(INITIAL_DESIGNER.warnings);

  const [rawJson, setRawJson] = useState(JSON.stringify(sampleEnvelope, null, 2));
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [trace, setTrace] = useState<TracePayload | null>(sampleEnvelope._trace ?? null);

  const phpTextareaId = useId();
  const jsonTextareaId = useId();

  const analyzePhp = useCallback(() => {
    const result = analyzePhpJsonResource(phpSource);
    setPhpWarnings(result.warnings);
    if (result.error) {
      setPhpError(result.error);
      setBlueprint(null);
      return;
    }
    setPhpError(null);
    setBlueprint(result.blueprint);
  }, [phpSource]);

  const parseTrace = useCallback(() => {
    try {
      const parsed = JSON.parse(rawJson) as ApiEnvelope;
      if (!parsed._trace) {
        setJsonError('This JSON does not include `_trace`. Enable debug tracing on your API and paste the full response.');
        setTrace(null);
        return;
      }
      setJsonError(null);
      setTrace(parsed._trace);
    } catch {
      setJsonError('This text is not valid JSON. Check for a missing comma or stray quote.');
      setTrace(null);
    }
  }, [rawJson]);

  return (
    <div
      className="min-h-screen text-zinc-100"
      style={{
        fontFamily: '"Instrument Sans", system-ui, sans-serif',
        background:
          'radial-gradient(1200px 600px at 10% -10%, rgba(34,211,238,0.12), transparent 55%), radial-gradient(900px 500px at 90% 0%, rgba(167,139,250,0.12), transparent 50%), #07080c',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-6">
          {(
            [
              { id: 'designer' as const, label: 'Understand API (from code)', hint: 'For designers & PMs' },
              { id: 'runtime' as const, label: 'Request details (for developers)', hint: 'Needs JSON + _trace' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-2xl px-4 py-3 text-left ring-1 transition ${
                tab === t.id
                  ? 'bg-cyan-400/15 text-cyan-50 ring-cyan-400/40'
                  : 'bg-white/3 text-zinc-400 ring-white/10 hover:bg-white/6 hover:text-zinc-200'
              }`}
            >
              <span className="block text-sm font-semibold">{t.label}</span>
              <span className="mt-0.5 block text-[11px] text-zinc-500">{t.hint}</span>
            </button>
          ))}
        </div>

        {tab === 'designer' ? (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <section className="space-y-3">
              <label
                htmlFor={phpTextareaId}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Paste PHP resource code
              </label>
              <textarea
                id={phpTextareaId}
                value={phpSource}
                onChange={(e) => setPhpSource(e.target.value)}
                spellCheck={false}
                className="h-[min(420px,50vh)] w-full resize-y rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-zinc-200 shadow-inner ring-1 ring-white/5 focus:border-cyan-400/50 focus:outline-none focus:ring-cyan-400/30"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={analyzePhp}
                  className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-zinc-950 shadow-[0_12px_40px_rgba(34,211,238,0.35)] transition hover:bg-cyan-300"
                >
                  Analyze code
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhpSource(SAMPLE_PHP_RESOURCE);
                    const r = analyzePhpJsonResource(SAMPLE_PHP_RESOURCE);
                    setPhpWarnings(r.warnings);
                    setPhpError(r.error);
                    setBlueprint(r.blueprint);
                  }}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  Load sample
                </button>
              </div>
              {phpError ? (
                <p className="text-sm leading-relaxed text-rose-300" role="alert">
                  {phpError}
                  {!phpError.includes('could not read') ? (
                    <span className="block pt-2 text-rose-200/80">
                      Tip: include <code className="text-rose-100">extends JsonResource</code> (or{' '}
                      <code className="text-rose-100">TracedJsonResource</code>) and a{' '}
                      <code className="text-rose-100">toArray</code> method.
                    </span>
                  ) : null}
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-zinc-500">
                Paste a Laravel <code className="text-zinc-300">JsonResource</code> class (the file that lists fields
                for the API). Nothing is uploaded; analysis runs in your browser.
              </p>
            </section>

            <section>
              {blueprint ? <DesignerViewer blueprint={blueprint} warnings={phpWarnings} /> : null}
            </section>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
            <section className="space-y-3">
              <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm leading-relaxed text-violet-100/90">
                This view is for <strong className="text-white">engineers</strong> debugging a single API request. It
                expects technical JSON that includes <code className="text-violet-200">_trace</code>.
              </div>
              <label
                htmlFor={jsonTextareaId}
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500"
              >
                Paste API JSON
              </label>
              <textarea
                id={jsonTextareaId}
                value={rawJson}
                onChange={(e) => setRawJson(e.target.value)}
                spellCheck={false}
                className="h-[min(420px,50vh)] w-full resize-y rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-zinc-200 shadow-inner ring-1 ring-white/5 focus:border-cyan-400/50 focus:outline-none focus:ring-cyan-400/30"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={parseTrace}
                  className="rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-zinc-950 shadow-[0_12px_40px_rgba(34,211,238,0.35)] transition hover:bg-cyan-300"
                >
                  Parse _trace
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRawJson(JSON.stringify(sampleEnvelope, null, 2));
                    setTrace(sampleEnvelope._trace ?? null);
                    setJsonError(null);
                  }}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white ring-1 ring-white/15 hover:bg-white/15"
                >
                  Load sample
                </button>
              </div>
              {jsonError ? (
                <p className="text-sm text-rose-300" role="alert">
                  {jsonError}
                </p>
              ) : null}
              <p className="text-xs leading-relaxed text-zinc-500">
                Fetch your Laravel API with <code className="text-zinc-300">?debug=1</code> (or your configured flag),
                paste the full JSON here, and inspect <code className="text-zinc-300">_trace.fields</code> and{' '}
                <code className="text-zinc-300">_trace.events</code>.
              </p>
            </section>

            <section>{trace ? <TraceViewer trace={trace} /> : null}</section>
          </div>
        )}
      </div>
    </div>
  );
}
