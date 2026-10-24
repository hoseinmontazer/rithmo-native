/**
 * Types for the reviewed contraception / sexual-health guide
 * (`/api/health-guide/`). The server serves only versions a named reviewer has
 * approved; the app renders them as given and writes none of the medical text.
 */
export type GuideArea = 'contraception' | 'sexual_health';
export type GuideKind = 'article' | 'comparison';

export type GuideBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'steps'; items: string[] }
  | { type: 'callout'; tone: 'info' | 'warning' | 'safety'; text: string }
  | { type: 'qa'; q: string; a: string };

export interface GuideSource {
  title: string;
  publisher: string;
  year: number | null;
  url: string;
}

export interface GuideMeta {
  slug: string;
  area: GuideArea;
  kind: GuideKind;
  topic: string;
  order: number;
  /** Time-sensitive / safety-critical guidance: always free, listed first. */
  is_essential_safety: boolean;
  title_fa: string;
  summary_fa: string;
  version: number;
  content_hash: string;
  reviewed_on: string | null;
  reviewer_credential: string;
  next_review_due: string | null;
  /** The review date has passed: still shown, and the app says so. */
  review_overdue: boolean;
}

export interface MethodInfo {
  code: string;
  name_fa: string;
  group: string;
  typical_use_per_100: number | null;
  perfect_use_per_100: number | null;
  reduces_sti_risk: boolean;
  provider_needed: boolean;
  how_used_fa: string;
  benefits_fa: string[];
  limitations_fa: string[];
  side_effects_fa: string[];
  cautions_fa: string[];
  note_fa?: string;
}

export interface GuideArticle extends GuideMeta {
  body: GuideBlock[];
  data: { methods?: MethodInfo[]; footnote_fa?: string };
  sources: GuideSource[];
}

export interface GuideIndexPayload {
  articles: GuideMeta[];
}
