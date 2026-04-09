export type FieldKind = 'scalar' | 'object' | 'list' | 'unknown';

export type BlueprintField = {
  apiKey: string;
  displayLabel: string;
  kind: FieldKind;
  nested?: BlueprintField[];
  note?: string;
};

export type SectionVisualKind =
  | 'always'
  | 'permission'
  | 'platform'
  | 'audience'
  | 'published'
  | 'prediction'
  | 'other';

export type BlueprintSection = {
  id: string;
  title: string;
  /** Full path of conditions (for nested rules). */
  plainConditionSummary: string;
  /** Short label for the flow map (non-coders). */
  flowLabel: string;
  /** Grouping for colors in the UI. */
  visualKind: SectionVisualKind;
  technicalHint?: string;
  fields: BlueprintField[];
};

export type ResourceBlueprint = {
  className: string;
  displayTitle: string;
  sections: BlueprintSection[];
};

export type AnalyzePhpResult = {
  blueprint: ResourceBlueprint | null;
  error: string | null;
  warnings: string[];
};
