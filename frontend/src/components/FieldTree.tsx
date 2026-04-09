import { useMemo, useState } from 'react';
import type { TraceFieldEntry } from '../types/trace';
import { ActionBadge } from './ActionBadge';

export type FilterMode = 'all' | 'included' | 'excluded' | 'override';

type TreeNode = {
  segment: string;
  fullPath: string;
  children: Map<string, TreeNode>;
  field?: TraceFieldEntry;
};

function insert(root: TreeNode, path: string, field: TraceFieldEntry) {
  const parts = path.split('.').filter(Boolean);
  let current = root;
  let acc = '';

  parts.forEach((part, idx) => {
    acc = acc ? `${acc}.${part}` : part;
    if (!current.children.has(part)) {
      current.children.set(part, {
        segment: part,
        fullPath: acc,
        children: new Map(),
      });
    }
    const next = current.children.get(part)!;
    if (idx === parts.length - 1) {
      next.field = field;
    }
    current = next;
  });
}

function buildTree(fields: Record<string, TraceFieldEntry>): TreeNode {
  const root: TreeNode = { segment: '', fullPath: '', children: new Map() };
  Object.entries(fields).forEach(([path, field]) => insert(root, path, field));
  return root;
}

function lastOutcome(field: TraceFieldEntry): string {
  const t = field.timeline[field.timeline.length - 1];
  return t?.outcome ?? '—';
}

type Props = {
  fields: Record<string, TraceFieldEntry>;
  selected: string | null;
  onSelect: (path: string) => void;
  filter: FilterMode;
};

function NodeRow({
  node,
  depth,
  selected,
  onSelect,
  filter,
}: {
  node: TreeNode;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
  filter: FilterMode;
}) {
  const [open, setOpen] = useState(true);
  const children = useMemo(
    () => Array.from(node.children.values()).sort((a, b) => a.segment.localeCompare(b.segment)),
    [node.children],
  );

  const isLeafField = Boolean(node.field);
  const passes =
    !node.field ||
    filter === 'all' ||
    (filter === 'included' && node.field.included) ||
    (filter === 'excluded' && !node.field.included) ||
    (filter === 'override' && node.field.timeline.some((e) => e.outcome === 'override'));

  const childNodes = children.filter((c) => subtreeMatches(c, filter));

  if (!isLeafField && childNodes.length === 0) {
    return null;
  }

  if (isLeafField && node.field && !passes) {
    return null;
  }

  return (
    <li className="select-none">
      {node.segment ? (
        <button
          type="button"
          onClick={() => {
            if (node.field) {
              onSelect(node.fullPath);
            }
            setOpen((o) => !o);
          }}
          className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition ${
            node.field && selected === node.fullPath
              ? 'bg-cyan-500/15 text-white ring-1 ring-cyan-400/40'
              : 'text-zinc-300 hover:bg-white/5'
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <span className="text-zinc-500">{children.length ? (open ? '▾' : '▸') : '·'}</span>
          <span className="font-mono text-[13px]">{node.segment}</span>
          {node.field ? (
            <span className="ml-auto flex items-center gap-2 text-[11px] text-zinc-500">
              {node.field.timeline.length > 1 ? (
                <ActionBadge action="merge" />
              ) : (
                <ActionBadge action={node.field.timeline[0]?.action ?? 'set'} />
              )}
              <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-zinc-400">
                {lastOutcome(node.field)}
              </span>
            </span>
          ) : null}
        </button>
      ) : null}
      {children.length > 0 && open ? (
        <ul className="mt-0.5 space-y-0.5">
          {childNodes.map((c) => (
            <NodeRow
              key={c.fullPath}
              node={c}
              depth={node.segment ? depth + 1 : depth}
              selected={selected}
              onSelect={onSelect}
              filter={filter}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function subtreeMatches(node: TreeNode, filter: FilterMode): boolean {
  if (node.field) {
    const passes =
      filter === 'all' ||
      (filter === 'included' && node.field.included) ||
      (filter === 'excluded' && !node.field.included) ||
      (filter === 'override' && node.field.timeline.some((e) => e.outcome === 'override'));
    if (passes) {
      return true;
    }
  }
  return Array.from(node.children.values()).some((c) => subtreeMatches(c, filter));
}

export function FieldTree({ fields, selected, onSelect, filter }: Props) {
  const root = useMemo(() => buildTree(fields), [fields]);

  return (
    <div className="rounded-2xl border border-white/10 bg-linear-to-b from-white/3 to-transparent p-3">
      <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
        Fields
      </p>
      <ul className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1">
        {Array.from(root.children.values())
          .sort((a, b) => a.segment.localeCompare(b.segment))
          .map((c) => (
            <NodeRow
              key={c.fullPath}
              node={c}
              depth={0}
              selected={selected}
              onSelect={onSelect}
              filter={filter}
            />
          ))}
      </ul>
    </div>
  );
}
