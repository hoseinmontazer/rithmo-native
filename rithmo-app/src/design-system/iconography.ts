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
 * No new icon package. The PNG set stays for decorative artwork that is
 * *meant* to be full-colour; it is simply no longer used for navigation,
 * where tinting destroys it.
 */

/** Bottom-tab destinations. */
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
};

/** Neutral stand-in for a symptom outside the curated vocabulary. */
export const SYMPTOM_FALLBACK_ICON = 'circle-medium';

/** Glyph for a symptom code; never guesses, falls back to a neutral dot. */
export function symptomIcon(code: string): string {
  return SYMPTOM_ICONS[code] ?? SYMPTOM_FALLBACK_ICON;
}
