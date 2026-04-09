import type { BlueprintSection, SectionVisualKind } from '../types/resourceBlueprint';

export const sectionVisualAccent: Record<SectionVisualKind, string> = {
  always: 'border-l-emerald-400 bg-emerald-500/7 ring-emerald-500/20',
  permission: 'border-l-violet-400 bg-violet-500/7 ring-violet-500/20',
  platform: 'border-l-sky-400 bg-sky-500/7 ring-sky-500/20',
  audience: 'border-l-amber-400 bg-amber-500/7 ring-amber-500/20',
  published: 'border-l-rose-400 bg-rose-500/7 ring-rose-500/20',
  prediction: 'border-l-cyan-400 bg-cyan-500/7 ring-cyan-500/20',
  other: 'border-l-zinc-400 bg-zinc-500/6 ring-white/10',
};

function fieldCount(s: BlueprintSection): number {
  const countNested = (fs: typeof s.fields): number =>
    fs.reduce((n, f) => n + 1 + (f.nested ? countNested(f.nested) : 0), 0);
  return countNested(s.fields);
}

function FlowMiniCard({ section }: { section: BlueprintSection }) {
  const n = fieldCount(section);
  return (
    <div
      className={`rounded-xl border border-white/10 border-l-4 py-3 pl-4 pr-3 ring-1 ${sectionVisualAccent[section.visualKind]}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">{section.flowLabel}</p>
      <p className="mt-1 text-sm font-medium leading-snug text-white">{section.title}</p>
      <p className="mt-2 text-[11px] text-zinc-500">
        {n} field{n === 1 ? '' : 's'} in this block
      </p>
    </div>
  );
}

type Props = {
  sections: BlueprintSection[];
};

export function ResponseFlowMap({ sections }: Props) {
  const always = sections.find((s) => s.visualKind === 'always');
  const layers = sections.filter((s) => s.visualKind !== 'always');

  if (!always && layers.length === 0) return null;

  return (
    <div className="rounded-3xl border border-white/10 bg-linear-to-b from-white/7 to-transparent p-6 ring-1 ring-white/10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">Visual map</p>
      <h3 className="mt-2 font-['DM_Serif_Display',serif] text-2xl text-white">How this API response is layered</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
        Every response starts with a <span className="text-zinc-200">core</span> set of fields. Extra groups are added
        only when the rules on the cards apply (permissions, ad platform, whether the campaign is live, and so on).
      </p>

      <div className="mt-8 flex flex-col items-center gap-6">
        {always ? (
          <>
            <div className="w-full max-w-lg">
              <FlowMiniCard section={always} />
            </div>
            {layers.length > 0 ? (
              <>
                <div className="flex flex-col items-center gap-1 text-zinc-500" aria-hidden>
                  <span className="text-lg leading-none text-cyan-500/80">↓</span>
                  <span className="text-[11px] uppercase tracking-wider">then maybe add</span>
                </div>
                <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {layers.map((s) => (
                    <FlowMiniCard key={s.id} section={s} />
                  ))}
                </div>
              </>
            ) : null}
          </>
        ) : (
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sections.map((s) => (
              <FlowMiniCard key={s.id} section={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
