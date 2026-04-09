import { useId, useState, type ReactNode } from 'react';
import type { BlueprintField, ResourceBlueprint } from '../types/resourceBlueprint';
import { ResponseFlowMap, sectionVisualAccent } from './ResponseFlowMap';

type Props = {
  blueprint: ResourceBlueprint;
  warnings: string[];
};

function FieldTree({ fields, depth = 0 }: { fields: BlueprintField[]; depth?: number }) {
  return (
    <ul className={`space-y-2 ${depth > 0 ? 'mt-2 border-l border-white/10 pl-4' : ''}`}>
      {fields.map((f, i) => (
        <li key={`${depth}-${i}-${f.apiKey}`} className="text-sm">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-medium text-white">{f.displayLabel}</span>
            <code
              className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-[11px] text-zinc-400 ring-1 ring-white/10"
              title="Internal name used by apps and the API."
            >
              {f.apiKey}
            </code>
            {f.kind !== 'scalar' ? (
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                {f.kind === 'object' ? 'Group of fields' : f.kind === 'list' ? 'List' : 'Varies'}
              </span>
            ) : null}
          </div>
          {f.note ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{f.note}</p> : null}
          {f.nested && f.nested.length > 0 ? <FieldTree fields={f.nested} depth={depth + 1} /> : null}
        </li>
      ))}
    </ul>
  );
}

function Collapsible({
  id,
  title,
  children,
  defaultOpen = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 ring-1 ring-white/5">
      <button
        type="button"
        id={id}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm font-medium text-zinc-200 transition hover:bg-white/4"
      >
        {title}
        <span className="text-zinc-500">{open ? '−' : '+'}</span>
      </button>
      {open ? <div className="border-t border-white/10 px-4 py-3 text-sm text-zinc-400">{children}</div> : null}
    </div>
  );
}

export function DesignerViewer({ blueprint, warnings }: Props) {
  const helpId = useId();
  const glossaryId = useId();

  return (
    <div className="space-y-6">
      <header className="border-b border-white/10 pb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/80">
          Understand API (from code)
        </p>
        <h1 className="mt-2 font-['DM_Serif_Display',serif] text-3xl text-white md:text-4xl">
          What can appear in this API response?
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
          <span className="text-zinc-200">{blueprint.displayTitle}</span>
          <span className="text-zinc-500"> · class </span>
          <code className="text-zinc-300">{blueprint.className}</code>
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
          These are the pieces of information the server <em>may</em> send. Some items only appear in special
          situations (for example, after publishing or for a specific ad platform). This view reads your PHP file; it
          does not call your live server.
        </p>
      </header>

      <div className="space-y-3">
        <Collapsible id={helpId} title="How to use this page" defaultOpen>
          <ul className="list-inside list-disc space-y-2 leading-relaxed">
            <li>Paste the PHP class that builds the API response (usually a file ending in “Resource”).</li>
            <li>Click the button to analyze the code.</li>
            <li>Read each section: “Always included” vs “Only in some cases.”</li>
            <li>
              Friendly names are guesses from the code; the short gray names (<code className="text-zinc-300">like_this</code>)
              are what apps use in JSON.
            </li>
          </ul>
        </Collapsible>
        <Collapsible id={glossaryId} title="Short glossary">
          <dl className="space-y-3">
            <div>
              <dt className="font-medium text-zinc-200">API response</dt>
              <dd className="mt-0.5 text-zinc-500">The data the server sends back to an app after a request.</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-200">Field</dt>
              <dd className="mt-0.5 text-zinc-500">One named piece of information inside that response.</dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-200">Permission</dt>
              <dd className="mt-0.5 text-zinc-500">
                Some fields are hidden unless the signed-in account is allowed to see them.
              </dd>
            </div>
            <div>
              <dt className="font-medium text-zinc-200">Platform</dt>
              <dd className="mt-0.5 text-zinc-500">For ads or social integrations, which network (e.g. TikTok vs Facebook) the row belongs to.</dd>
            </div>
          </dl>
        </Collapsible>
      </div>

      <ResponseFlowMap sections={blueprint.sections} />

      {warnings.length > 0 ? (
        <div
          className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90"
          role="status"
        >
          <p className="font-medium text-amber-200">Heads up</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-amber-100/80">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Field details</p>
        {blueprint.sections.map((section) => (
          <article
            key={section.id}
            className={`rounded-2xl border border-white/10 border-l-4 bg-linear-to-b from-white/6 to-transparent p-5 shadow-[0_20px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/5 ${sectionVisualAccent[section.visualKind]}`}
          >
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{section.flowLabel}</p>
              {section.title !== 'Always included' ? (
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Only in some cases</p>
              ) : null}
              <h2 className="mt-1 text-lg font-semibold text-white">
                {section.title}
              </h2>
            </div>
            {section.plainConditionSummary !== section.title ? (
              <p className="text-sm leading-relaxed text-zinc-300">{section.plainConditionSummary}</p>
            ) : null}
            {section.technicalHint ? (
              <p className="mt-2 font-mono text-[11px] leading-relaxed text-zinc-500">
                More context: {section.technicalHint}
              </p>
            ) : null}
            <div className="mt-5">
              <FieldTree fields={section.fields} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
