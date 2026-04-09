import PhpParserModule from 'php-parser';
import type {
  AnalyzePhpResult,
  BlueprintField,
  BlueprintSection,
  FieldKind,
  ResourceBlueprint,
  SectionVisualKind,
} from '../types/resourceBlueprint';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AstNode = Record<string, any>;

type PhpParserEngine = new (options?: object) => { parseCode: (code: string, filename: string) => AstNode };
const PhpEngine = PhpParserModule as unknown as PhpParserEngine;

const parserEngine = new PhpEngine({
  parser: { php74Migration: false, version: 804, suppressErrors: true },
});

export function analyzePhpJsonResource(code: string): AnalyzePhpResult {
  const warnings: string[] = [];
  let ast: AstNode;
  try {
    ast = parserEngine.parseCode(code, 'resource.php') as AstNode;
  } catch {
    return {
      blueprint: null,
      error:
        'We could not read this as PHP. Check that it starts with <?php and that the file is valid PHP.',
      warnings,
    };
  }

  const classNode = findResourceClass(ast);
  if (!classNode) {
    return {
      blueprint: null,
      error:
        'No class extending JsonResource or TracedJsonResource was found. Add something like `class MyResource extends JsonResource` and a `toArray` method.',
      warnings,
    };
  }

  const className = classNode.name?.name ?? 'UnknownResource';
  const method = findToArrayMethod(classNode);
  if (!method?.body) {
    return {
      blueprint: null,
      error:
        'We found the resource class but no `toArray` method with a body. Add `public function toArray($request)` (or `toArray($request): array`).',
      warnings,
    };
  }

  const sectionOrder: string[] = [];
  const sectionFields = new Map<string, BlueprintField[]>();

  const addFields = (stack: string[], fields: BlueprintField[]) => {
    if (fields.length === 0) return;
    const key = stack.length === 0 ? '__always__' : stack.join('\n');
    if (!sectionFields.has(key)) sectionOrder.push(key);
    const prev = sectionFields.get(key) ?? [];
    sectionFields.set(key, dedupeFields([...prev, ...fields]));
  };

  const onFields = (fields: BlueprintField[], stack: string[]) => addFields(stack, fields);

  const assignMap = new Map<string, AstNode>();
  collectVariableAssignments(method.body, assignMap);

  walk(method.body, [], onFields, assignMap);

  if (sectionFields.size === 0) {
    warnings.push('No array keys or trace helpers were detected. Try pasting the full toArray method.');
  }

  const sections: BlueprintSection[] = sectionOrder.map((key, i) => {
    const fields = sectionFields.get(key) ?? [];
    if (key === '__always__') {
      return {
        id: `s-${i}`,
        title: 'Always included',
        plainConditionSummary:
          'These fields are built in the main part of the code. They may still be empty in real data depending on your database.',
        flowLabel: 'Core response',
        visualKind: 'always' as SectionVisualKind,
        fields,
      };
    }
    const lines = key.split('\n');
    const innermost = lines[lines.length - 1] ?? key;
    const outer = lines.slice(0, -1);
    const title = innermost;
    const plainConditionSummary =
      outer.length > 0
        ? `${outer.join(' · ')} · ${innermost}`
        : innermost;
    const visualKind = inferSectionVisualKind(innermost, plainConditionSummary);
    return {
      id: `s-${i}`,
      title,
      plainConditionSummary,
      flowLabel: flowLabelFromCondition(title, visualKind),
      visualKind,
      technicalHint: outer.length > 0 ? outer.join(' · ') : undefined,
      fields,
    };
  });

  const blueprint: ResourceBlueprint = {
    className,
    displayTitle: classToDisplayTitle(className),
    sections,
  };

  return { blueprint, error: null, warnings };
}

function dedupeFields(fields: BlueprintField[]): BlueprintField[] {
  const byKey = new Map<string, BlueprintField>();
  for (const f of fields) {
    const existing = byKey.get(f.apiKey);
    if (!existing) {
      byKey.set(f.apiKey, f);
      continue;
    }
    byKey.set(f.apiKey, {
      ...existing,
      note: [existing.note, f.note].filter(Boolean).join(' ') || existing.note,
    });
  }
  return [...byKey.values()];
}

function extendsBaseName(extendsNode: AstNode | null | undefined): string | null {
  if (!extendsNode) return null;
  const n = extendsNode.name;
  if (typeof n !== 'string') return null;
  const trimmed = n.trim();
  return trimmed.includes('\\') ? (trimmed.split('\\').pop() ?? trimmed) : trimmed;
}

function isJsonResourceSubclass(base: string | null): boolean {
  if (!base) return false;
  return base === 'JsonResource' || base === 'TracedJsonResource';
}

function findResourceClass(program: AstNode): AstNode | null {
  const found: AstNode[] = [];
  const visit = (node: AstNode | null | undefined) => {
    if (!node || typeof node !== 'object') return;
    if (node.kind === 'program') {
      for (const c of node.children ?? []) visit(c);
      return;
    }
    if (node.kind === 'namespace') {
      for (const c of node.children ?? []) visit(c);
      return;
    }
    if (node.kind === 'class') {
      const last = extendsBaseName(node.extends as AstNode | null);
      if (isJsonResourceSubclass(last)) found.push(node);
    }
  };
  visit(program);
  return found[0] ?? null;
}

function findToArrayMethod(classNode: AstNode): AstNode | null {
  for (const m of classNode.body ?? []) {
    if (m.kind === 'method' && m.name?.name === 'toArray') return m;
  }
  return null;
}

function classToDisplayTitle(name: string): string {
  const base = name.replace(/Resource$/i, '');
  const spaced = base.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  const t = spaced.trim();
  if (!t) return name;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function walk(
  node: AstNode | null | undefined,
  stack: string[],
  onFields: (f: BlueprintField[], s: string[]) => void,
  assignMap: Map<string, AstNode>,
) {
  if (!node || typeof node !== 'object') return;

  if (node.kind === 'if') {
    walkIf(node, stack, onFields, assignMap);
    return;
  }

  if (node.kind === 'block') {
    for (const c of node.children ?? []) walk(c, stack, onFields, assignMap);
    return;
  }

  if (node.kind === 'return') {
    walk(node.expr, stack, onFields, assignMap);
    return;
  }

  if (node.kind === 'expressionstatement') {
    walk(node.expression, stack, onFields, assignMap);
    return;
  }

  if (node.kind === 'assign') {
    walk(node.right, stack, onFields, assignMap);
    return;
  }

  if (node.kind === 'array') {
    onFields(extractArrayFields(node), stack);
    return;
  }

  if (node.kind === 'call') {
    processCall(node, stack, onFields, assignMap);
    return;
  }

  if (node.kind === 'match') {
    for (const arm of node.arms ?? []) walk(arm.body, stack, onFields, assignMap);
    return;
  }
}

function walkIf(
  node: AstNode,
  stack: string[],
  onFields: (f: BlueprintField[], s: string[]) => void,
  assignMap: Map<string, AstNode>,
) {
  const h = humanizeCondition(node.test, assignMap);
  walk(node.body, [...stack, h], onFields, assignMap);
  const alt = node.alternate;
  if (!alt) return;
  if (alt.kind === 'if') {
    walkIf(alt, stack, onFields, assignMap);
  } else {
    walk(alt, [...stack, `Otherwise: ${h} does not apply`], onFields, assignMap);
  }
}

function getGlobalCallName(call: AstNode): string | null {
  if (call.kind !== 'call') return null;
  const what = call.what as AstNode;
  if (what?.kind === 'name') return what.name ?? null;
  return null;
}

function getOuterMethodName(call: AstNode): string | null {
  if (call.kind !== 'call') return null;
  const what = call.what as AstNode;
  if (what?.kind === 'propertylookup' && what.offset?.kind === 'identifier') return what.offset.name ?? null;
  if (what?.kind === 'staticlookup' && what.offset?.kind === 'identifier') return what.offset.name ?? null;
  return null;
}

function callChainContainsTrace(node: AstNode | null | undefined): boolean {
  if (!node) return false;
  if (node.kind === 'propertylookup') {
    if (node.offset?.name === 'trace') return true;
    return callChainContainsTrace(node.what);
  }
  if (node.kind === 'call') return callChainContainsTrace(node.what);
  return false;
}

const TRACE_METHODS = new Set(['field', 'when', 'merge', 'whenGate', 'recordEnum', 'child']);

function isTraceStyleCall(call: AstNode): boolean {
  const m = getOuterMethodName(call);
  if (!m || !TRACE_METHODS.has(m)) return false;
  return callChainContainsTrace(call.what);
}

function processCall(
  call: AstNode,
  stack: string[],
  onFields: (f: BlueprintField[], s: string[]) => void,
  assignMap: Map<string, AstNode>,
) {
  const globalName = getGlobalCallName(call);
  if (globalName === 'array_merge') {
    for (const arg of call.arguments ?? []) walk(arg, stack, onFields, assignMap);
    return;
  }

  if (isTraceStyleCall(call)) {
    const method = getOuterMethodName(call)!;
    const args = (call.arguments ?? []) as AstNode[];

    if (method === 'field') {
      const key = firstPositionalString(args);
      if (key) {
        onFields(
          [
            {
              apiKey: key,
              displayLabel: toDisplayLabel(key),
              kind: 'scalar',
              note: 'Value is set in your application code.',
            },
          ],
          stack,
        );
      }
      return;
    }

    if (method === 'merge') {
      const block = firstPositionalString(args);
      const arr = args.find((a, i) => i > 0 && a.kind === 'array');
      const fields = arr ? extractArrayFields(arr) : [];
      const namedCond = args.find((a) => a.kind === 'namedargument' && a.name === 'condition');
      const extra = namedCond ? `Code checks: ${exprToShortString(namedCond.value)}` : null;
      const withNotes = fields.map((f) => ({
        ...f,
        note: f.note ?? (block ? `Group in code: ${block}` : undefined),
      }));
      onFields(withNotes, extra ? [...stack, extra] : stack);
      return;
    }

    if (method === 'when') {
      const condStr = firstPositionalString(args);
      const closure = args.find((a) => a.kind === 'closure');
      const whenStack = condStr
        ? [...stack, `Only when (from code): ${condStr}`]
        : [...stack, 'Only in a specific case described in the code'];
      if (closure?.body) walk(closure.body, whenStack, onFields, assignMap);
      return;
    }

    if (method === 'whenGate') {
      const perm = firstPositionalString(args);
      const closure = args.find((a) => a.kind === 'closure');
      const gateStack = [...stack, humanizeGateString(perm)];
      if (closure?.body) walk(closure.body, gateStack, onFields, assignMap);
      return;
    }

    if (method === 'recordEnum') {
      const arr = args.find((a) => a.kind === 'array');
      if (arr) onFields(extractArrayFields(arr), stack);
      return;
    }

    if (method === 'child') {
      const name = firstPositionalString(args);
      const closure = args.find((a) => a.kind === 'closure');
      if (closure?.body) {
        walk(closure.body, [...stack, `Nested group: ${name ?? 'child'}`], onFields, assignMap);
      }
      return;
    }
  }

  for (const arg of call.arguments ?? []) walk(arg, stack, onFields, assignMap);
}

function firstPositionalString(args: AstNode[]): string | null {
  for (const a of args) {
    if (a.kind === 'namedargument') continue;
    if (a.kind === 'string') return a.value ?? null;
  }
  return null;
}

const PERMISSION_FRIENDLY: Record<string, string> = {
  view_campaign_pool_attributes: 'pool campaign details',
  view_published_campaigns_table_view_campaign_ad_account: 'ad account details in the published campaigns view',
  super_admin_full_access: 'full admin access',
};

function collectVariableAssignments(node: AstNode | null | undefined, map: Map<string, AstNode>) {
  if (!node || typeof node !== 'object') return;
  if (node.kind === 'block') {
    for (const c of node.children ?? []) collectVariableAssignments(c, map);
    return;
  }
  if (node.kind === 'expressionstatement' && node.expression?.kind === 'assign') {
    const left = node.expression.left;
    if (left?.kind === 'variable' && left.name) {
      map.set(left.name, node.expression.right);
    }
    return;
  }
  if (node.kind === 'if') {
    collectVariableAssignments(node.body, map);
    if (node.alternate) collectVariableAssignments(node.alternate, map);
  }
}

function inferSectionVisualKind(innermost: string, full: string): SectionVisualKind {
  const t = `${innermost} ${full}`.toLowerCase();
  if (t.includes('permission') || t.includes('allowed to see') || t.includes('gate::')) return 'permission';
  if (t.includes('tiktok') || (t.includes('platform') && t.includes('campaign'))) return 'platform';
  if (t.includes('viewer') || t.includes('staff') || t.includes('internal') || t.includes('regular app user'))
    return 'audience';
  if (
    t.includes('facebook') ||
    t.includes('ad platform') ||
    t.includes('campaign id') ||
    t.includes('published') ||
    t.includes('insights') ||
    t.includes('leads')
  )
    return 'published';
  if (t.includes('prediction') || t.includes('loaded and') || t.includes('relation')) return 'prediction';
  return 'other';
}

function flowLabelFromCondition(title: string, kind: SectionVisualKind): string {
  if (kind === 'always') return 'Core response';
  if (kind === 'permission') return 'Needs permission';
  if (kind === 'platform') return 'TikTok / platform';
  if (kind === 'audience') return 'Staff vs customer';
  if (kind === 'published') return 'Live on ads';
  if (kind === 'prediction') return 'Extra analytics';
  return title;
}

function isThisProperty(expr: AstNode | null | undefined, prop: string): boolean {
  return (
    expr?.kind === 'propertylookup' &&
    expr.what?.kind === 'variable' &&
    expr.what.name === 'this' &&
    expr.offset?.name === prop
  );
}

function matchesPublishedCampaignIds(expr: AstNode | null | undefined): boolean {
  const found = new Set<string>();
  const scan = (e: AstNode | null | undefined) => {
    if (!e) return;
    if (e.kind === 'bin' && (e.type === '||' || e.type === 'or')) {
      scan(e.left);
      scan(e.right);
      return;
    }
    if (isThisProperty(e, 'fb_campaign_id')) found.add('fb');
    if (isThisProperty(e, 'tiktok_campaign_id')) found.add('tt');
  };
  scan(expr);
  return found.has('fb') && found.has('tt');
}

function getCallPropertyName(call: AstNode | null | undefined): string | null {
  if (call?.kind !== 'call') return null;
  const what = call.what as AstNode;
  if (what?.kind === 'propertylookup' && what.offset?.name) return what.offset.name;
  return null;
}

function extractStringArrayArg(arg: AstNode | null | undefined): string[] {
  if (arg?.kind !== 'array') return [];
  const out: string[] = [];
  for (const item of arg.items ?? []) {
    const v = item.kind === 'entry' ? item.value : item;
    if (v?.kind === 'string' && v.value) out.push(v.value);
  }
  return out;
}

function humanizeGateString(perm: string | null): string {
  if (!perm) return 'Only if the viewer has a specific permission (see code).';
  const friendly = PERMISSION_FRIENDLY[perm];
  if (friendly) {
    return `Only if the viewer's account is allowed to see ${friendly} (${perm}).`;
  }
  return `Only if the viewer's account is allowed to see: ${perm}.`;
}

function humanizeGateAnyCall(test: AstNode): string | null {
  if (test.kind !== 'call') return null;
  const what = test.what as AstNode;
  if (what?.kind !== 'staticlookup' || what.what?.name !== 'Gate' || what.offset?.name !== 'any') return null;
  const perms = extractStringArrayArg(test.arguments?.[0]);
  if (perms.length === 0) return 'Only if the viewer has one of several permissions.';
  const bits = perms.map((p) => PERMISSION_FRIENDLY[p] ?? p);
  return `Only if the viewer has ${bits.join(' or ')}.`;
}

function humanizeRelationLoadedPattern(test: AstNode): string | null {
  if (test.kind !== 'bin' || (test.type !== '&&' && test.type !== 'and')) return null;
  const left = test.left as AstNode;
  const right = test.right as AstNode;
  if (getCallPropertyName(left) !== 'relationLoaded') return null;
  const relArg = left.arguments?.[0];
  if (relArg?.kind !== 'string') return null;
  const label = toDisplayLabel(relArg.value);
  if (
    right.kind === 'bin' &&
    (right.type === '!==' || right.type === '!=') &&
    isNullAst(right.right)
  ) {
    return `When “${label}” is loaded on this campaign and has a value.`;
  }
  return null;
}

function isNullAst(n: AstNode | null | undefined): boolean {
  return n?.kind === 'nullkeyword' || n?.kind === 'null';
}

function humanizeNotEqualNull(test: AstNode, assignMap: Map<string, AstNode>): string | null {
  if (test.kind !== 'bin' || (test.type !== '!==' && test.type !== '!=')) return null;
  if (!isNullAst(test.right)) return null;
  const left = test.left as AstNode;
  if (left.kind === 'variable') {
    const rhs = assignMap.get(left.name);
    if (rhs?.kind === 'call' && getCallPropertyName(rhs) === 'stopContinuePredictionPayload') {
      return 'When a stop vs continue prediction exists for this campaign.';
    }
  }
  if (left.kind === 'call' && getCallPropertyName(left) === 'stopContinuePredictionPayload') {
    return 'When a stop vs continue prediction exists for this campaign.';
  }
  return null;
}

function humanizeBinComparison(test: AstNode): string | null {
  if (test.kind !== 'bin') return null;
  const t = test.type;
  if (t !== '===' && t !== '==' && t !== 'eq') return null;
  const left = test.left as AstNode;
  const right = test.right as AstNode;
  const leftStr = exprToShortString(left);
  const rightStr = exprToShortString(right);
  if (isThisProperty(left, 'platform')) {
    if (rightStr.includes('TIKTOK') || rightStr.toLowerCase().includes('tiktok')) {
      return 'When this campaign is for TikTok (ad platform).';
    }
    if (rightStr.includes('Facebook') || rightStr.includes('FACEBOOK')) {
      return 'When this campaign is for Meta / Facebook (ad platform).';
    }
    return `When this campaign’s platform matches: ${rightStr}.`;
  }
  if (leftStr.includes('platform') && rightStr.includes('TIKTOK')) {
    return 'When this campaign is for TikTok (ad platform).';
  }
  return null;
}

function humanizeAuthAudience(test: AstNode): string | null {
  if (test.kind !== 'unary' || test.type !== '!') return null;
  const inner = test.what as AstNode;
  const chain = exprToShortString(inner);
  if (chain.includes('isUser') && (chain.includes('user') || chain.includes('auth'))) {
    return 'When the person viewing the API is internal staff (not a regular customer account).';
  }
  return null;
}

function humanizeExpressionMeaning(
  expr: AstNode | null | undefined,
  assignMap: Map<string, AstNode>,
  depth = 0,
): string | null {
  if (!expr || depth > 14) return null;

  if (matchesPublishedCampaignIds(expr)) {
    return 'the campaign already has a live ad on Facebook or TikTok (a platform campaign ID exists)';
  }

  if (expr.kind === 'bin' && (expr.type === '||' || expr.type === 'or')) {
    const a = humanizeExpressionMeaning(expr.left, assignMap, depth + 1);
    const b = humanizeExpressionMeaning(expr.right, assignMap, depth + 1);
    if (a && b) return `${a} or ${b}`;
    return a ?? b ?? null;
  }

  if (expr.kind === 'call') {
    const name = getCallPropertyName(expr);
    if (name === 'isPoolCampaign') return 'this campaign is a pool (shared) campaign';
    if (name === 'hasActivePool') return 'this campaign has an active related pool campaign';
    if (name === 'stopContinuePredictionPayload') return 'a stop vs continue prediction is available';
  }

  if (expr.kind === 'propertylookup' && expr.what?.kind === 'variable' && expr.what.name === 'this') {
    const prop = expr.offset?.name ?? '';
    const pretty = toDisplayLabel(prop.replace(/_/g, '_'));
    return `this campaign’s ${pretty} is set`;
  }

  return null;
}

function humanizeCondition(test: AstNode | null | undefined, assignMap: Map<string, AstNode>): string {
  if (!test) return 'When a condition in the code is true.';

  const gateAny = humanizeGateAnyCall(test);
  if (gateAny) return gateAny;

  if (test.kind === 'call') {
    const what = test.what as AstNode;
    if (what?.kind === 'staticlookup' && what.offset?.name === 'allows' && what.what?.name === 'Gate') {
      const arg0 = test.arguments?.[0];
      if (arg0?.kind === 'string') return humanizeGateString(arg0.value);
    }
    if (what?.kind === 'staticlookup' && what.offset?.name === 'any' && what.what?.name === 'Gate') {
      return humanizeGateAnyCall(test) ?? 'Only if the viewer has one of several permissions.';
    }
  }

  const rel = humanizeRelationLoadedPattern(test);
  if (rel) return rel;

  const nn = humanizeNotEqualNull(test, assignMap);
  if (nn) return nn;

  const cmp = humanizeBinComparison(test);
  if (cmp) return cmp;

  const auth = humanizeAuthAudience(test);
  if (auth) return auth;

  if (test.kind === 'unary' && test.type === '!') {
    const inner = test.what as AstNode;
    if (inner?.kind === 'variable') {
      const rhs = assignMap.get(inner.name);
      if (rhs) {
        const m = humanizeExpressionMeaning(rhs, assignMap);
        if (m) return `When it is not true that ${m}.`;
      }
    }
  }

  if (test.kind === 'bin' && (test.type === '&&' || test.type === 'and')) {
    const a = humanizeCondition(test.left, assignMap);
    const b = humanizeCondition(test.right, assignMap);
    const clause = (s: string) => s.replace(/^When\s+/i, '').replace(/\s*\.\s*$/, '').trim();
    return `When ${clause(a)} and ${clause(b)}.`;
  }

  if (test.kind === 'variable') {
    const rhs = assignMap.get(test.name);
    if (rhs) {
      const meaning = humanizeExpressionMeaning(rhs, assignMap);
      if (meaning) return `When ${meaning}.`;
    }
    const guess = test.name.replace(/_/g, ' ');
    return `When “${guess}” is true in the product logic (see code for how it is calculated).`;
  }

  if (test.kind === 'unary' && test.type === '!') {
    return `When this is false: ${exprToShortString(test.what)}.`;
  }

  if (test.kind === 'bin') {
    const left = exprToShortString(test.left);
    const right = exprToShortString(test.right);
    return `When this is true: ${left} ${test.type} ${right}.`;
  }

  return `When this is true: ${exprToShortString(test)}.`;
}

function exprToShortString(node: AstNode | null | undefined, depth = 0): string {
  if (!node || depth > 24) return '(complex expression)';
  if (node.kind === 'nullkeyword' || node.kind === 'null') return 'null';
  if (node.kind === 'string') return `'${node.value}'`;
  if (node.kind === 'number') return String(node.value);
  if (node.kind === 'boolean') return node.value ? 'true' : 'false';
  if (node.kind === 'variable') return '$' + node.name;
  if (node.kind === 'identifier') return node.name;
  if (node.kind === 'name') return node.name;
  if (node.kind === 'bin') {
    return `${exprToShortString(node.left, depth + 1)} ${node.type} ${exprToShortString(node.right, depth + 1)}`;
  }
  if (node.kind === 'propertylookup') {
    return `${exprToShortString(node.what, depth + 1)}->${node.offset?.name ?? '?'}`;
  }
  if (node.kind === 'staticlookup') {
    return `${exprToShortString(node.what, depth + 1)}::${node.offset?.name ?? '?'}`;
  }
  if (node.kind === 'call') {
    const args = (node.arguments ?? []).map((a: AstNode) => exprToShortString(a, depth + 1)).join(', ');
    const w = exprToShortString(node.what, depth + 1);
    return `${w}(${args})`;
  }
  if (node.kind === 'constref' || node.kind === 'classreference') {
    return node.name ?? '?';
  }
  return node.kind ?? '?';
}

function toDisplayLabel(apiKey: string): string {
  if (apiKey === '(dynamic key)') return 'Dynamic key';
  const words = apiKey.replace(/_/g, ' ').split(' ');
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function inferKind(value: AstNode | null | undefined): FieldKind {
  if (!value) return 'unknown';
  if (value.kind === 'array') {
    const items = value.items ?? [];
    if (items.length === 0) return 'list';
    const allEntry = items.every((i: AstNode) => i.kind === 'entry');
    return allEntry ? 'object' : 'list';
  }
  return 'scalar';
}

function extractArrayFields(arr: AstNode): BlueprintField[] {
  if (arr.kind !== 'array') return [];
  const fields: BlueprintField[] = [];
  for (const item of arr.items ?? []) {
    if (item.kind !== 'entry') continue;
    const keyNode = item.key;
    let apiKey: string | null = null;
    if (keyNode?.kind === 'string') apiKey = keyNode.value ?? null;
    else if (keyNode?.kind === 'identifier') apiKey = keyNode.name ?? null;
    if (!apiKey) {
      fields.push({
        apiKey: '(dynamic key)',
        displayLabel: 'Dynamic key',
        kind: 'unknown',
        note: 'The key is computed in code, not a fixed name.',
      });
      continue;
    }
    const kind = inferKind(item.value);
    const nested = item.value?.kind === 'array' && kind === 'object' ? extractArrayFields(item.value) : undefined;
    fields.push({
      apiKey,
      displayLabel: toDisplayLabel(apiKey),
      kind,
      nested,
      note: kind === 'scalar' ? undefined : undefined,
    });
  }
  return fields;
}
