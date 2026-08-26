/**
 * iconography.ts — the semantic icon map.
 *
 * Icon choice used to be made at each call site, from two competing sources:
 * a set of colour PNGs in `assets/icons` and `react-native-vector-icons`.
 * That is how two different tab destinations (چرخه and الگوها) ended up
 * passing the same `icons.search` asset and became visually
 * indistinguishable, and how the profile tab ended up as a solid blob —
 * `TabIcon` applies `tintColor` to colour artwork, so a detailed PNG
 * flattens into a silhouette.
 *
 * The rule this file establishes: **a navigation destination is named, not
 * drawn.** Call sites ask for `TAB_ICONS.cycle`, and what that looks like is
 * decided once, here. Adding a destination without a semantic entry is a type
 * error, and two destinations resolving to the same glyph is caught by a test
 * rather than by someone noticing on a device.
 *
 * Family: MaterialCommunityIcons, already a dependency and already used for
 * every non-tab icon in the app (StoryCard, CycleContextStrip, Profile rows).
 * No new icon package. The tab bar itself has since moved BACK to the
 * full-colour PNG set (see `TAB_ICON_ART` below) — rendered untinted via
 * `AppIcon`, with opacity carrying selection instead of hue, because tinting
 * is what destroyed that artwork before. The monoline maps below are still
 * used for the centre action button and every non-tab surface.
 */

/**
 * Bottom-tab artwork, as full-colour PNGs from `assets/icons`.
 *
 * The tab bar used tinted monoline glyphs, which made the whole bar one
 * colour. These keep their own colours instead (rendered via `AppIcon`, which
 * applies no `tintColor` — `TabIcon` would flatten them into silhouettes).
 *
 * Because the icon can no longer change hue to show selection, MainNavigator
 * carries that state with opacity plus the label's colour and weight.
 */
export const TAB_ICON_ART = {
  home:     'home',
  cycle:    'menstruation',
  log:      'edit',
  patterns: 'search',
  profile:  'profile',
} as const;

/** Bottom-tab destinations (monoline — retained for non-tab surfaces). */
export const TAB_ICONS = {
  home: 'home-variant-outline',
  cycle: 'calendar-heart',
  log: 'plus-circle-outline',
  patterns: 'chart-timeline-variant',
  profile: 'account-circle-outline',
} as const;

/**
 * Filled counterparts for the active tab.
 *
 * Weight, not hue, carries selection: colour alone is not a sufficient state
 * indicator, and the tab bar previously used the same tint for active and
 * inactive so the only cue was the label's font weight.
 */
export const TAB_ICONS_ACTIVE = {
  home: 'home-variant',
  cycle: 'calendar-heart',
  log: 'plus-circle',
  patterns: 'chart-timeline-variant',
  profile: 'account-circle',
} as const;

export type TabKey = keyof typeof TAB_ICONS;

/**
 * Account / settings rows.
 *
 * These replace untinted 3-D sticker PNGs that sat beside flat vector
 * chevrons in the same row — the loudest "assembled from a template" signal
 * in the product.
 */
export const PROFILE_ICONS = {
  cycleLength: 'calendar-sync-outline',
  periodLength: 'water-outline',
  partners: 'account-heart-outline',
  partnerManage: 'account-cog-outline',
  editProfile: 'account-edit-outline',
  password: 'lock-outline',
  settings: 'cog-outline',
  premium: 'crown-outline',
  support: 'lifebuoy',
  logout: 'logout-variant',
  deleteAccount: 'account-remove-outline',
  history: 'history',
  medications: 'pill',
  pregnancy: 'human-pregnant',
} as const;

export type ProfileIconKey = keyof typeof PROFILE_ICONS;

/** Standard icon sizes, so call sites stop inventing their own. */
export const ICON_SIZE = {
  /** Inline with caption text. */
  xs: 14,
  /** Row affordances, chips. */
  sm: 16,
  /** Default: row leading icons, card headers. */
  md: 20,
  /** Bottom-tab glyphs. */
  tab: 24,
  /** Feature bubbles. */
  lg: 26,
} as const;

/**
 * Symptom glyphs — the icon half of the canonical symptom vocabulary.
 *
 * Symptom chips used to be emoji, which broke three ways: emoji render in the
 * system font rather than the app's icon language, they carry culture-specific
 * connotations the Persian UI never chose, and the unknown-code fallback was
 * `🔸` — a meaningless orange diamond standing in for a real symptom the user
 * had typed themselves.
 *
 * Codes are the server's canonical vocabulary (`cycle_tracker/utils/
 * symptoms.py`). A symptom the user invents is still valid data, so anything
 * not listed here falls back to `SYMPTOM_FALLBACK_ICON` — a deliberately
 * neutral dot that claims nothing about what the symptom is. That is the
 * documented fallback strategy: never guess a semantically wrong glyph, and
 * never let the icon be the only carrier of meaning — the Persian label is
 * always rendered beside it.
 *
 * MaterialCommunityIcons has no anatomical vocabulary, so several of these are
 * necessarily figurative (`balloon` for bloating, `weather-lightning` for mood
 * swings). They are chosen to be *evocative but not misleading*, and each is
 * paired with its Persian label in every surface that renders it.
 */
export const SYMPTOM_ICONS: Record<string, string> = {
  cramps:            'flash-outline',
  headache:          'head-flash-outline',
  fatigue:           'battery-low',
  bloating:          'balloon',
  backache:          'human-handsdown',
  breast_tenderness: 'flower-outline',
  insomnia:          'sleep-off',
  anxiety:           'heart-pulse',
  mood_swings:       'weather-lightning',
  irritability:      'flash-alert-outline',
  nausea:            'emoticon-sick-outline',
  dizziness:         'rotate-3d-variant',
  cravings:          'food-apple-outline',
  acne:              'dots-hexagon',
  spotting:          'water-outline',
  diarrhea:          'water-alert-outline',
  constipation:      'block-helper',
  hot_flashes:       'thermometer',
  heartburn:         'fire',
  swelling:          'arrow-expand-all',
};

/** Neutral stand-in for a symptom outside the curated vocabulary. */
export const SYMPTOM_FALLBACK_ICON = 'circle-medium';

/** Glyph for a symptom code; never guesses, falls back to a neutral dot. */
export function symptomIcon(code: string): string {
  return SYMPTOM_ICONS[code] ?? SYMPTOM_FALLBACK_ICON;
}

// ── Mood (F-07) ──────────────────────────────────────────────────────────────
/**
 * The five mood steps, as icons rather than emoji.
 *
 * Mood shipped as literal emoji (😔 😕 😐 🙂 😊) held in `utils/insightsEngine`.
 * Three problems, in order of how much they cost the user:
 *
 *  1. **The glyphs are not ours.** An emoji is drawn by whatever emoji font the
 *     handset ships, so the app's most affect-laden control looked different on
 *     a Samsung than on a Pixel, and changed shape under an OS update. This is
 *     the same class of problem as having no text font: the product could not
 *     say what its own screens looked like.
 *  2. **They ignore the theme.** An emoji carries its own colour, so it cannot
 *     respond to light/dark or to a disabled state, and it sits outside every
 *     contrast guarantee F-03 and F-06 established.
 *  3. **They are inconsistent with the app's own vocabulary.** Symptoms were
 *     already migrated to this exact pattern in F-04 (`SYMPTOM_ICONS`), so mood
 *     was the last core health metric still drawn from a different system.
 *
 * The ordering is deliberately monotonic — sad → confused → neutral → happy →
 * excited — so the row reads as a scale even before the labels are parsed, and
 * the Persian label is still rendered beside every one of them. Shape carries
 * the meaning; colour never carries it alone.
 */
export const MOOD_ICONS: Record<number, string> = {
  1: 'emoticon-sad-outline',
  2: 'emoticon-confused-outline',
  3: 'emoticon-neutral-outline',
  4: 'emoticon-happy-outline',
  5: 'emoticon-excited-outline',
};

/** Neutral stand-in for a mood level outside the 1–5 scale. */
export const MOOD_FALLBACK_ICON = 'emoticon-outline';

/** Glyph for a mood level; never guesses, falls back to a neutral face. */
export function moodIcon(level: number): string {
  return MOOD_ICONS[level] ?? MOOD_FALLBACK_ICON;
}

// ── Product domain concepts (F-07) ───────────────────────────────────────────
/**
 * The health concepts the product talks about, named once.
 *
 * Same rule as `TAB_ICONS`: a concept is *named*, not drawn at the call site.
 * This exists so that "medication" looks the same in Profile, in the wellness
 * dashboard and in a notification, instead of three authors each picking a
 * plausible pill glyph.
 *
 * Kept deliberately small. The brief that prompted this gate warned against
 * turning every control into an illustration, and against a different
 * illustration style per screen — so this is one family
 * (MaterialCommunityIcons, already the app's only icon dependency), covering
 * only concepts the product actually surfaces.
 */
export const DOMAIN_ICONS = {
  cycle:      'calendar-heart',
  period:     'water',
  mood:       'emoticon-outline',
  energy:     'battery-high',
  pain:       'flash-outline',
  sleep:      'sleep',
  medication: 'pill',
  insight:    'lightbulb-on-outline',
  progress:   'chart-line',
  partner:    'account-multiple-outline',
  wellness:   'heart-pulse',
  privacy:    'shield-lock-outline',
} as const;

export type DomainConcept = keyof typeof DOMAIN_ICONS;

// ── Conversational / action icons (F-07) ─────────────────────────────────────
/**
 * `send` replaces a raw `➤` (U+27A4) that `ConversationScreen` rendered as
 * text. That glyph was deferred at the end of F-06 and is fixed here: it came
 * from no icon family, took no theme colour, and — being a text arrow — pointed
 * right in an interface that reads right-to-left.
 *
 * Directional icons must be mirrored under RTL; see `ICON_FLIP_RTL`.
 */
export const ACTION_ICONS = {
  send:     'send',
  messages: 'message-text-outline',
} as const;

/**
 * Icons whose meaning depends on reading direction and must be mirrored in RTL.
 * A send arrow points *towards* the outgoing direction; in a right-to-left
 * conversation that is left. Non-directional icons must never be flipped.
 */
export const ICON_FLIP_RTL: readonly string[] = ['send'];

/** Whether `name` should be horizontally mirrored when the layout is RTL. */
export function shouldFlipForRTL(name: string): boolean {
  return ICON_FLIP_RTL.includes(name);
}

