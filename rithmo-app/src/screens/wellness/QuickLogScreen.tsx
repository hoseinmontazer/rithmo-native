/**
 * QuickLogScreen — ثبت امروز
 *
 * A beautiful one-minute check-in (mission: "How do you feel today?").
 * Flow: mood (illustrated scale) → energy → pain → sleep → symptoms → notes → save
 * → completion celebration with an honest personal observation.
 *
 * Preserves ALL payload fields, scales, prefill, and observation logic.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { textRoles } from '@theme/typography';
import {
  useCreateOrUpdateWellnessLog,
  useWellnessLog,
  useTodayWellnessLog,
  useWellnessAnalytics,
  useWellnessStreaks,
  useWellnessLogs,
} from '@hooks/queries/useWellness';
import { usePeriods, useCycleAnalysis } from '@hooks/queries/usePeriods';
import { useCreateContextEntry } from '@hooks/queries/useContextEntries';
import { TodayFeedbackBlock } from '@components/TodayFeedbackBlock';
import { Button, Card, Badge, CelebrationAnimation, AppIcon, SliderMetric, ErrorState } from '@components/ui';
import { focusScrollY, parseQuickLogFocus, type QuickLogFocus } from './quickLogFocus';
import {
  EMPTY_QUICK_BASELINE,
  QUICK_DEFAULTS,
  QUICK_METRICS,
  QUICK_SLEEP_MAX,
  QUICK_SLEEP_MIN,
  buildQuickLogPayload,
  canSaveWellness,
  dayLoadState,
  contextEntriesFor,
  contextEntryKey,
  pendingContextEntries,
  quickLogDayState,
  quickLogBaseline,
  reportedMetricCount,
  shouldResetQuickLog,
  storedSymptoms,
  type QuickLogBaseline,
} from './wellnessEdits';
import { extractErrorMessage } from '@utils/errorHandler';
import { toFa, faDate } from '@utils/persian';
import { todayISO } from '@utils/dateUtils';
import { track } from '@analytics';
import { MOODS } from '@utils/insightsEngine';
import { quickSymptomsFor } from '@constants/symptoms';
import { usePregnancyStatus } from '@hooks/queries/usePregnancy';
import { CONTEXT_TAGS } from '@constants/contextTags';
import { symptomIcon, ICON_SIZE } from '@design-system/iconography';
import icons, { type AppIconName } from '@assets/icons';
import { QUICK_LOG_MOOD_HEADING } from './quickLogLabels';
import type { WellnessScreenProps } from '@navigation/types';
import type { WellnessLog } from '@types/wellness.types';
import type { ContextTag } from '@types/contextEntry.types';

type Props = WellnessScreenProps<'QuickLog'>;

/**
 * The mood scale's artwork, by level.
 *
 * Was the theme-recoloured illustrated set, which made all five faces the
 * same brand green — the least useful place in the product for one colour,
 * since mood is exactly what the user is being asked to distinguish. These
 * are the flat-colour faces from `assets/icons`, so each step reads as its
 * own expression.
 *
 * Level 3 is the weakest fit: there is no truly neutral face in the set, so
 * `dissapointment` (flat, unimpressed) stands in for «معمولی». A neutral
 * face would be the one addition worth making here.
 */
const MOOD_ICON: Record<number, AppIconName> = {
  1: 'moodExhausted',     // سنگین  — drained
  2: 'moodCute',          // کمی بد — soft, pleading
  3: 'moodDisappointed',  // معمولی — flat / unimpressed (placeholder)
  4: 'moodAngel',         // خوب    — content
  5: 'moodHappy',         // عالی   — open grin
};

// ── Rating option sets (energy / pain — mood now uses the shared MOODS) ─────

interface RatingOption {
  value: number;
  label: string;
  shortLabel: string;
  /** Monoline glyph — the fallback when there is no artwork for the step. */
  iconName?: string;
  /**
   * Full-colour artwork from `assets/icons`, preferred over `iconName`.
   * It keeps its own colours, so selection is carried by the tile's border
   * and the number beneath it, plus opacity on the unselected steps.
   */
  art?: AppIconName;
}

const ENERGY_OPTIONS: RatingOption[] = [
  { value: 1, label: 'بی‌حال', shortLabel: '۱', art: 'energy1' },
  { value: 2, label: 'کم', shortLabel: '۲', art: 'energy2' },
  { value: 3, label: 'متوسط', shortLabel: '۳', art: 'energy3' },
  { value: 4, label: 'خوب', shortLabel: '۴', art: 'energy4' },
  { value: 5, label: 'پرانرژی', shortLabel: '۵', art: 'energy5' },
];

const PAIN_OPTIONS: RatingOption[] = [
  { value: 0, label: 'بدون درد', shortLabel: '۰', iconName: 'check' },
  { value: 1, label: 'کم', shortLabel: '۱', iconName: 'circle-small' },
  { value: 2, label: 'متوسط', shortLabel: '۲', iconName: 'circle-medium' },
  { value: 3, label: 'زیاد', shortLabel: '۳', iconName: 'alert-circle-outline' },
  { value: 4, label: 'خیلی زیاد', shortLabel: '۴', iconName: 'alert-octagon-outline' },
];

// Symptom chips come from the canonical codes + Persian labels shared with the
// server's vocabulary (`quickSymptomsFor` in @constants/symptoms). This screen
// used to hold its own private list of raw Persian display strings; the server
// now stores stable codes, so "سردرد" logged here and "headache" logged from
// the period screen count as the SAME symptom in the pattern engine instead of
// two unrelated ones.

/** Window the "your usual" baseline describes. */
const BASELINE_WINDOW_DAYS = 30;

// ── Rating Segmented Picker ───────────────────────────────────────────────────

interface RatingPickerProps {
  label: string;
  options: RatingOption[];
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}

function RatingPicker({ label, options, value, onChange, accentColor }: RatingPickerProps) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const selected = options.find(o => o.value === value);

  return (
    <View style={{ marginBottom: spacing[4] }}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerLabel, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {label}
        </Text>
        {selected && (
          <Badge label={selected.label} variant="neutral" />
        )}
      </View>

      <View style={[styles.optionsRow, { gap: spacing[2] }]}>
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.75}
              style={[
                styles.ratingOptionBtn,
                {
                  borderRadius: borderRadius.md,
                  backgroundColor: isSelected ? accentColor + '18' : colors.surfaceSecondary,
                  borderColor: isSelected ? accentColor : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  paddingVertical: spacing[2],
                },
              ]}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              {opt.art ? (
                <View style={{ opacity: isSelected ? 1 : 0.55 }}>
                  <AppIcon source={icons[opt.art]} size={24} />
                </View>
              ) : opt.iconName ? (
                <Icon
                  name={opt.iconName}
                  size={20}
                  color={isSelected ? accentColor : colors.textTertiary}
                />
              ) : null}
              <Text
                style={[
                  styles.ratingValueText,
                  {
                    color: isSelected ? accentColor : colors.textSecondary,
                    fontSize: typography.xs,
                    fontWeight: isSelected ? '700' : '500',
                    marginTop: 2,
                  },
                ]}
              >
                {opt.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Post-log observation ──────────────────────────────────────────────────────

type DataState = 'empty' | 'building' | 'one_cycle' | 'multi_cycle';

function deriveDataState(periodCount: number, logCount: number): DataState {
  if (periodCount === 0 && logCount < 3) { return 'empty'; }
  if (logCount < 5 || periodCount === 0) { return 'building'; }
  if (periodCount === 1) { return 'one_cycle'; }
  return 'multi_cycle';
}

/**
 * The most recent PRIOR day's mood/energy, for the 'building'-state
 * day-over-day comparison — or null per field when that field was never
 * actually entered on that log.
 *
 * `reported_fields` is the server's provenance record (see
 * `wellness.types.ts`). A field absent from it was never entered by the
 * user, whatever the column holds — this mirrors the backend's own
 * `signals.reported_value` provenance rule, but deliberately more
 * conservative for the one case that rule handles by guessing (a legacy
 * row with no `reported_fields` at all): that rule falls back to "differs
 * from the model default", which needs the model's default value to
 * replicate faithfully; this returns null instead — losing a data point
 * is safe, inventing one is not.
 */
export interface PriorSameSignal {
  mood: number | null;
  energy: number | null;
}

function reportedOrNull(log: WellnessLog, field: 'mood_level' | 'energy_level'): number | null {
  const reported = log.reported_fields;
  if (!Array.isArray(reported) || !reported.includes(field)) { return null; }
  return log[field];
}

function derivePriorSameSignal(recentLogs: WellnessLog[] | undefined, today: string): PriorSameSignal | null {
  if (!Array.isArray(recentLogs)) { return null; }
  const prior = recentLogs.find((l) => l.date !== today);
  if (!prior) { return null; }
  const moodVal = reportedOrNull(prior, 'mood_level');
  const energyRaw = reportedOrNull(prior, 'energy_level');
  if (moodVal === null && energyRaw === null) { return null; }
  // The picker scale is 1-5; `energy_level` is stored 0-10 (picker * 2) —
  // same halving convention already used for `personalAvgEnergy` below.
  return { mood: moodVal, energy: energyRaw !== null ? energyRaw / 2 : null };
}

function buildPostLogObservation(
  dataState: DataState,
  todayMood: number,
  todayEnergy: number,
  avgMood: number | null,
  avgEnergy: number | null,
  priorSameSignal?: PriorSameSignal | null,
): string | null {
  if (dataState === 'empty') {
    return 'ریتمو شروع می‌کنه به شناخت تو.';
  }
  if (dataState === 'building') {
    if (priorSameSignal && (priorSameSignal.mood !== null || priorSameSignal.energy !== null)) {
      const moodDiff = priorSameSignal.mood !== null ? todayMood - priorSameSignal.mood : null;
      const energyDiff = priorSameSignal.energy !== null ? todayEnergy - priorSameSignal.energy : null;

      if (moodDiff !== null && energyDiff !== null && moodDiff !== 0 && energyDiff !== 0) {
        const same = (moodDiff > 0) === (energyDiff > 0);
        if (same) {
          return `امروز خلق و انرژی‌ات نسبت به ثبت قبلی‌ات ${moodDiff > 0 ? 'بالاتر' : 'پایین‌تر'} بود.`;
        }
      }
      if (energyDiff !== null && energyDiff !== 0) {
        return `امروز انرژی‌ات نسبت به ثبت قبلی‌ات ${energyDiff > 0 ? 'بالاتر' : 'پایین‌تر'} بود.`;
      }
      if (moodDiff !== null && moodDiff !== 0) {
        return `امروز خلقت نسبت به ثبت قبلی‌ات ${moodDiff > 0 ? 'بالاتر' : 'پایین‌تر'} بود.`;
      }
      return 'خلق و انرژی‌ات مثل ثبت قبلی‌ات بود.';
    }
    return 'داریم الگو را می‌سازیم — چند روز دیگر صبر کن.';
  }

  const observations: string[] = [];

  if (avgMood !== null && avgEnergy !== null) {
    const moodDiff = todayMood - avgMood;
    const energyDiff = todayEnergy - avgEnergy;

    if (moodDiff <= -1.5 && energyDiff <= -1.5) {
      observations.push('امروز خلق و انرژی‌ات پایین‌تر از میانگین شخصی‌ات بود.');
    } else if (moodDiff >= 1.5 && energyDiff >= 1.5) {
      observations.push('امروز خلق و انرژی‌ات بالاتر از میانگین شخصی‌ات بود.');
    } else if (energyDiff <= -1.5) {
      observations.push('امروز انرژی‌ات پایین‌تر از میانگین اخیرت بود.');
    } else if (moodDiff <= -1.5) {
      observations.push('امروز خلقت پایین‌تر از میانگین اخیرت بود.');
    }
  }

  if (observations.length === 0) {
    return 'امروز هم ثبت شد.';
  }

  return observations[0];
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function QuickLogScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const logId = route.params?.logId;
  // Home's quick check-in chips name the section to open at; anything else is
  // the top. The hint is consumed once (cleared below), so a later open from
  // another entry point is not scrolled by a stale value, and tapping the same
  // chip again works because the screen stays mounted in its tab.
  const focus = parseQuickLogFocus(route.params?.initialCategory);
  const scrollRef = useRef<ScrollView>(null);
  const sectionY = useRef<Partial<Record<QuickLogFocus, number>>>({ mood: 0 });
  const consumeFocus = useCallback(() => {
    if (!focus) { return; }
    const y = sectionY.current[focus];
    if (y === undefined) { return; } // not laid out yet; its onLayout calls this again
    scrollRef.current?.scrollTo({ y: focusScrollY(y), animated: false });
    navigation.setParams({ initialCategory: undefined });
  }, [focus, navigation]);
  useEffect(() => { consumeFocus(); }, [consumeFocus]);
  const noteSection = useCallback((section: QuickLogFocus, y: number) => {
    sectionY.current[section] = y;
    consumeFocus();
  }, [consumeFocus]);

  /*
   * The one local calendar day this form is for: fixed when the form is
   * loaded and used for both the read and the save, so a form opened before
   * local midnight is never prefilled from, or saved onto, a different day.
   * Re-taken from the device clock whenever the form resets (see the focus
   * effect below). Never a user-chosen date — QuickLog only logs "today".
   */
  const [formDate, setFormDate] = useState(todayISO);
  const { data: existing, isError: existingError, isFetching: existingFetching, refetch: refetchExisting } =
    useWellnessLog(logId ?? 0);
  const {
    data: todayLog, isError: todayError, error: todayLoadError,
    isFetching: todayFetching, refetch: refetchToday,
  } = useTodayWellnessLog(formDate);
  /*
   * Personal baselines for the "today vs your usual" line.
   *
   * This used to fetch the last 30 full log rows — 15 827 bytes — and reduce
   * them client-side to two averages and a count. `/api/wellness/analytics/`
   * computes exactly those averages in SQL and answers in 907 bytes, and
   * `/api/wellness/streaks/` carries the honest lifetime total in 114 bytes.
   * Same numbers, ~94% less transferred, and no metric maths duplicated
   * between the client and the server.
   *
   * One deliberate semantic change: the baseline is now the last 30 *days*
   * rather than the last 30 *entries*. For a daily logger they are the same
   * window; for a sparse logger "your usual" should mean recent life, not a
   * span that might reach back a year. With no logs in the window the
   * endpoint returns 200 with `averages: null` (an empty state, not an
   * error) — `hasBaseline` below already treats that the same as
   * `analytics` being absent.
   */
  const { data: analytics } = useWellnessAnalytics(BASELINE_WINDOW_DAYS);
  const { data: streaks } = useWellnessStreaks();
  const { data: periods } = usePeriods();
  const { data: cycleAnalysis } = useCycleAnalysis();
  const { mutateAsync: saveLog, isPending } = useCreateOrUpdateWellnessLog();
  const { mutateAsync: createContextEntry } = useCreateContextEntry();
    /**
   * The one prior real observation the 'building'-state day-over-day
   * comparison needs. Bounded to 2 so this stays a small, existing-shape
   * request (the same `useWellnessLogs` hook `DeepInsightsScreen`/
   * `WellnessDashboardScreen` already use, just with `limit` instead of
   * `days`) — enough to cover "today's log already exists, the prior one
   * is the entry before it" without fetching anything unbounded.
   */
  const { data: recentLogs } = useWellnessLogs({ limit: 2 });

  // Only ever the log for the day being saved: an explicit log by id, or
  // the server's log for `formDate` (re-checked here so a response for any
  // other day can never prefill this form).
  const prefillSource: WellnessLog | null | undefined = logId
    ? existing
    : (todayLog && todayLog.date === formDate ? todayLog : null);
  const saveDate: string | undefined = logId ? existing?.date : formDate;
  /*
   * Whether the stored day is known (see wellnessEdits.dayLoadState for why
   * this, and not isSuccess / !isFetching, is the right predicate). Until it
   * is 'ready', saving is blocked and symptoms/notes cannot be edited: both
   * are written by replacement, so a save or edit made against an unknown
   * day could silently erase what is stored. 'failed' shows a retry; the
   * draft is kept. After a good load, a failed background refetch keeps the
   * last good log and stays 'ready'.
   */
  const dayLoad = logId
    ? dayLoadState({ data: existing, isError: existingError }, { requireRecord: true })
    : quickLogDayState({ data: todayLog, isError: todayError }, formDate);
  const dayReady = dayLoad === 'ready';
  const dayReadyRef = useRef(dayReady);
  dayReadyRef.current = dayReady;
  const dayRefetching = logId ? existingFetching : todayFetching;
  const retryDayLoad = useCallback(() => {
    if (logId) { refetchExisting(); } else { refetchToday(); }
  }, [logId, refetchExisting, refetchToday]);

  // Behavioural only: whether this is an edit, never what is being logged.
  useEffect(() => {
    track('daily_log_opened', { is_edit: Boolean(logId) });
  }, [logId]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mood, setMood] = useState(QUICK_DEFAULTS.mood);
  const [energy, setEnergy] = useState(QUICK_DEFAULTS.energy);
  const [pain, setPain] = useState(QUICK_DEFAULTS.pain);
  const [sleep, setSleep] = useState(QUICK_DEFAULTS.sleep);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  // «لکه‌بینی» joins the chips while pregnant (see quickSymptomsFor).
  const { data: pregnancyStatus } = usePregnancyStatus();
  const quickSymptoms = quickSymptomsFor(Boolean(pregnancyStatus?.has_active_pregnancy), selectedSymptoms);
  const [notes, setNotes] = useState('');

  // Today 2.0: "امروز چیز متفاوتی بود؟" — separate from the WellnessLog
  // notes above (which flow to Today AI Feedback as the approved
  // user_note). A tag here describes a surrounding circumstance, never a
  // symptom (those stay in selectedSymptoms/SymptomEntry, unchanged).
  const [selectedContextTags, setSelectedContextTags] = useState<ContextTag[]>([]);
  const [contextNote, setContextNote] = useState('');

  /**
   * Which of the four metric pickers the user has actually touched this
   * session — the fix for the empty-submit/provenance bug: every picker
   * starts at a plausible default the user never has to touch, so
   * without this, a zero-interaction Save fabricated a full, indistinguishable-
   * from-genuine WellnessLog row. Only touched fields are sent, so the
   * server's own reported_fields provenance (see cycle_tracker/views/
   * wellness_log.py) can finally tell "the user reported this" from
   * "never asked" for THIS screen too — LogWellnessScreen's other metrics
   * already had this distinction; QuickLog's four never did.
   */
  const [touched, setTouched] = useState({ mood: false, energy: false, pain: false, sleep: false });
  const markTouched = useCallback((field: keyof typeof touched) => {
    setTouched(prev => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);
  /*
   * What the form loaded for `formDate` — the comparison point for "the user
   * changed this". A touched picker is sent only when its value differs from
   * here, so a stored value the coarse pickers cannot represent (energy 7,
   * pain 4) is never rewritten by a save that did not change it.
   */
  const [baseline, setBaseline] = useState<QuickLogBaseline>(EMPTY_QUICK_BASELINE);
  // Read by the prefill effect without re-running it: a (re)loaded log fills
  // only what the user has not edited yet, so a late or refetched response
  // can never overwrite input already on screen.
  const editedRef = useRef({ ...touched, symptoms: false, notes: false });
  editedRef.current = { ...editedRef.current, ...touched };
  const onNotesChange = useCallback((text: string) => {
    if (!dayReadyRef.current) { return; }
    editedRef.current.notes = true;
    setNotes(text);
  }, []);
  // Context entries this form session already created, so a retry after a
  // partial failure (or a second tap) never writes the same event twice.
  const createdContextKeys = useRef(new Set<string>());
  const submittingRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  // Bumped on reset so the prefill effect re-applies the (unchanged) source.
  const [prefillKey, setPrefillKey] = useState(0);

  // ── Post-save observation state ─────────────────────────────────────────────
  const [observation, setObservation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  // Separate from `saved`: the celebration is a brief overlay, not the
  // screen's whole post-save state — its dismiss handler used to call
  // goBack() directly, which meant tapping it (or its 2.2s auto-dismiss)
  // navigated straight back before the AI Feedback CTA below it was ever
  // reachable. Now it only hides itself; goBack() is reached only via
  // the explicit "بستن" button.
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pre-fill from the loaded day. Pickers show the nearest value they can
  // display (sleep keeps its half hour); the stored value itself is kept by
  // the server unless the user changes that picker. Reported fields are NOT
  // marked touched: an omitted field keeps its value and its provenance
  // server-side, so nothing is lost by not resending it.
  useEffect(() => {
    if (!prefillSource) { return; }
    const loaded = quickLogBaseline(prefillSource);
    setBaseline(loaded);
    const edited = editedRef.current;
    const setters = { mood: setMood, energy: setEnergy, pain: setPain, sleep: setSleep };
    QUICK_METRICS.forEach((metric) => {
      if (edited[metric]) { return; }
      setters[metric](loaded.metrics[metric] ?? QUICK_DEFAULTS[metric]);
    });
    if (!edited.notes) { setNotes(loaded.notes); }
    if (!edited.symptoms) { setSelectedSymptoms(storedSymptoms(prefillSource)); }
  }, [prefillSource, prefillKey]);

  // ── Derived data-state ──────────────────────────────────────────────────────
  const periodCount = Array.isArray(periods) ? (periods as unknown[]).length : 0;

  /** Every log the user has, not just those inside the baseline window. */
  const logCount = typeof streaks?.total_logs === 'number' ? streaks.total_logs : 0;
  const dataState = deriveDataState(periodCount, logCount);

  /*
   * The comparison is only shown once there is enough of a baseline to be
   * worth comparing against — the same >= 5 threshold as before, but now
   * counted over the logs the averages were actually computed from, so the
   * sentence and its evidence describe the same set of days.
   */
  const baselineCount = analytics?.period?.logs_count ?? 0;
  const hasBaseline = baselineCount >= 5;

  const personalAvgMood = hasBaseline && typeof analytics?.averages?.mood_level === 'number'
    ? analytics.averages.mood_level
    : null;
  // The picker works on a 1-5 scale; the stored metric is 0-10.
  const personalAvgEnergy = hasBaseline && typeof analytics?.averages?.energy_level === 'number'
    ? analytics.averages.energy_level / 2
    : null;

  const priorSameSignal = useMemo(
    () => derivePriorSameSignal(recentLogs, formDate),
    [recentLogs, formDate],
  );

  const cycleDay: number | null = (cycleAnalysis as any)?.current_status?.cycle_day ?? null;

  const toggleSymptom = useCallback((sym: string) => {
    if (!dayReadyRef.current) { return; }
    editedRef.current.symptoms = true;
    setSelectedSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  }, []);

  const toggleContextTag = useCallback((tag: ContextTag) => {
    setSelectedContextTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // ── Fresh form on reopen ──────────────────────────────────────────────────
  // Tabs stay mounted, so without this a completed save left the success
  // view up for the next visit. Reset happens only on regaining focus, and
  // only after a save or a local-day rollover; an unsaved draft survives tab
  // switches. Nothing is persisted beyond this mounted screen.
  const resetForm = useCallback((day: string) => {
    setFormDate(day);
    setMood(QUICK_DEFAULTS.mood);
    setEnergy(QUICK_DEFAULTS.energy);
    setPain(QUICK_DEFAULTS.pain);
    setSleep(QUICK_DEFAULTS.sleep);
    setTouched({ mood: false, energy: false, pain: false, sleep: false });
    editedRef.current = { mood: false, energy: false, pain: false, sleep: false, symptoms: false, notes: false };
    setSelectedSymptoms([]);
    setNotes('');
    setSelectedContextTags([]);
    setContextNote('');
    setBaseline(EMPTY_QUICK_BASELINE);
    createdContextKeys.current = new Set();
    setObservation(null);
    setSaved(false);
    setCelebrationVisible(false);
    fadeAnim.setValue(0);
    setPrefillKey(k => k + 1);
  }, [fadeAnim]);

  const lifecycleRef = useRef({ saved, formDate });
  lifecycleRef.current = { saved, formDate };
  useFocusEffect(
    useCallback(() => {
      const today = todayISO();
      if (shouldResetQuickLog({ ...lifecycleRef.current, today })) {
        resetForm(today);
      }
    }, [resetForm]),
  );

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (submittingRef.current || !saveDate || !dayReadyRef.current) { return; }
    submittingRef.current = true;
    setSubmitting(true);
    try {
      // Only what the user changed, always for the day the form loaded
      // (see wellnessEdits.buildQuickLogPayload). The server keeps every
      // omitted field, value and provenance alike.
      const payload = buildQuickLogPayload(
        {
          date: saveDate,
          values: { mood, energy, pain, sleep },
          touched,
          symptoms: selectedSymptoms,
          notes,
        },
        baseline,
      );
      await saveLog(payload);

      // Today 2.0: one ContextEntry per selected tag (note on the first
      // only; a lone note becomes 'other'), never merged into the
      // WellnessLog notes above. Created one at a time and remembered on
      // success, so retrying after a partial failure creates only the
      // missing ones.
      const entries = contextEntriesFor<ContextTag>(saveDate, selectedContextTags, contextNote, 'other');
      for (const entry of pendingContextEntries(entries, createdContextKeys.current)) {
        await createContextEntry(entry);
        createdContextKeys.current.add(contextEntryKey(entry));
      }

      // COUNT of fields and a boolean for symptoms — never the values.
      // The whole point of the contract is that telemetry can answer "did
      // she finish the log" without knowing anything about her body.
      track('daily_log_submitted', {
        field_count: reportedMetricCount(payload) + ('notes' in payload && notes ? 1 : 0),
        had_symptoms: selectedSymptoms.length > 0,
        had_context: entries.length > 0,
      });

      const obs = buildPostLogObservation(
        dataState,
        mood,
        energy,
        personalAvgMood,
        personalAvgEnergy,
        priorSameSignal,
      );
      setObservation(obs);
      setSaved(true);
      setCelebrationVisible(true);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        setCelebrationVisible(false);
      }, 2200);
    } catch (err) {
      Alert.alert('ذخیره نشد', `${extractErrorMessage(err)}\nاطلاعاتت هنوز اینجاست؛ دوباره امتحان کن.`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    saveDate, mood, energy, pain, sleep, touched, selectedSymptoms, notes, baseline,
    selectedContextTags, contextNote, createContextEntry,
    saveLog, dataState, personalAvgMood, personalAvgEnergy, priorSameSignal,
    fadeAnim,
  ]);

  // ── Saved state UI (with completion celebration) ────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <CelebrationAnimation
          visible={celebrationVisible}
          onDismiss={() => setCelebrationVisible(false)}
          title="ثبت شد"
          message={observation ?? undefined}
          type="success"
        />
        <View style={styles.savedContainer}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <View style={[styles.savedIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="check" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.savedTitle, { color: colors.textPrimary, fontSize: typography.xl, marginTop: spacing[3] }]}>
              ثبت شد
            </Text>
            {observation && (
              <Text style={[styles.savedObs, { color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2] }]}>
                {observation}
              </Text>
            )}

            <TodayFeedbackBlock />

            <TouchableOpacity
              onPress={goBack}
              style={{
                alignItems: 'center',
                borderWidth: 1,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                marginTop: spacing[4],
                paddingHorizontal: spacing[5],
                paddingVertical: spacing[2],
              }}
              accessibilityLabel="بستن"
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                بستن
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Date header ─────────────────────────────────────────────────────────────
  const dateStr = faDate(new Date());

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottomTab,
        }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: spacing[3], marginBottom: spacing[4] }]}>
            <View>
              <Text style={[styles.dateText, { color: colors.textTertiary, fontSize: typography.xs }]}>
                {dateStr}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                ثبت امروز
              </Text>
              <Text style={[styles.subTitle, { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: 2 }]}>
                فقط یک دقیقه — امروز چطور احساس می‌کنی؟
              </Text>
              {cycleDay != null && (
                <View
                  style={[
                    styles.cycleChip,
                    {
                      backgroundColor: colors.primaryLighter,
                      borderColor: colors.primaryLight,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700' }}>
                    روز {toFa(cycleDay)} چرخه
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={goBack}
              accessibilityRole="button"
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              accessibilityLabel="بستن"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Mood: illustrated scale ──────────────────────────────── */}
          <Card elevated={false} style={{ padding: spacing[4], paddingTop: spacing[4] + 8, marginBottom: spacing[6] }}>
            <Text style={[styles.pickerLabel, { color: colors.textPrimary, fontSize: textRoles.cardTitle.fontSize, fontWeight: textRoles.cardTitle.fontWeight, lineHeight: textRoles.cardTitle.lineHeight, marginBottom: spacing[3] }]}>
              {QUICK_LOG_MOOD_HEADING}
            </Text>
            {/* Circular badges, the selected one enlarged and lifted above
                the row — the artwork already carries its own colour per
                face, so selection stays on background/border/scale rather
                than adding a second, competing colour system on top of it. */}
            <View style={[styles.moodRow, { gap: spacing[2], alignItems: 'flex-end' }]}>
              {MOODS.map((m) => {
                const isSelected = m.level === mood;
                const circleSize = isSelected ? 68 : 56;
                return (
                  <TouchableOpacity
                    key={m.level}
                    onPress={() => { setMood(m.level); markTouched('mood'); }}
                    activeOpacity={0.75}
                    style={styles.moodItem}
                    accessibilityLabel={`خلق: ${m.label}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View
                      style={[
                        styles.moodCircle,
                        {
                          width: circleSize,
                          height: circleSize,
                          borderRadius: circleSize / 2,
                          backgroundColor: isSelected ? colors.primaryLighter : colors.surfaceSecondary,
                          borderColor: isSelected ? colors.primary : 'transparent',
                          borderWidth: isSelected ? 2 : 0,
                          transform: [{ translateY: isSelected ? -8 : 0 }],
                        },
                      ]}
                    >
                      <AppIcon
                        source={icons[MOOD_ICON[m.level]]}
                        size={isSelected ? 38 : 30}
                      />
                    </View>
                    <Text
                      style={[
                        styles.moodLabel,
                        {
                          color: isSelected ? colors.primary : colors.textTertiary,
                          fontSize: typography.overline,
                          fontWeight: isSelected ? '700' : '500',
                          marginTop: 6,
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* ── Energy: continuous slider, live label ──────────────────
              Pain stays a discrete picker — it already matches the design
              mockup's own spec (labeled 0–4 buttons), and its steps are
              genuinely discrete/named, not a continuous quantity the way
              energy is. */}
          <View onLayout={(e) => noteSection('energy', e.nativeEvent.layout.y)}>
          <Card elevated={false} style={{ padding: spacing[4], marginBottom: spacing[6] }}>
            <SliderMetric
              icon="lightning-bolt-outline"
              label="انرژی"
              value={energy}
              min={1}
              max={5}
              onChange={(v) => { setEnergy(v); markTouched('energy'); }}
              iconColor={colors.primary}
              unit={ENERGY_OPTIONS[energy - 1]?.label}
            />

            <RatingPicker
              label="درد"
              options={PAIN_OPTIONS}
              value={pain}
              onChange={(v) => { setPain(v); markTouched('pain'); }}
              accentColor={colors.primary}
            />
          </Card>
          </View>

          {/* ── Sleep: +/- stepper, half-hour steps ─────────────────── */}
          <Card elevated={false} style={{ padding: spacing[4], marginBottom: spacing[6] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textPrimary, fontSize: textRoles.cardTitle.fontSize, fontWeight: textRoles.cardTitle.fontWeight }}>
                خواب دیشب
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <TouchableOpacity
                  onPress={() => { setSleep(s => Math.max(QUICK_SLEEP_MIN, Math.round((s - 0.5) * 2) / 2)); markTouched('sleep'); }}
                  disabled={sleep <= QUICK_SLEEP_MIN}
                  style={[
                    styles.sleepStepBtn,
                    { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.pill, opacity: sleep <= QUICK_SLEEP_MIN ? 0.4 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="کاهش ساعت خواب"
                >
                  <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '500' }}>−</Text>
                </TouchableOpacity>
                <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', minWidth: 64, textAlign: 'center' }}>
                  {toFa(sleep)} ساعت
                </Text>
                <TouchableOpacity
                  onPress={() => { setSleep(s => Math.min(QUICK_SLEEP_MAX, Math.round((s + 0.5) * 2) / 2)); markTouched('sleep'); }}
                  disabled={sleep >= QUICK_SLEEP_MAX}
                  style={[
                    styles.sleepStepBtn,
                    { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill, opacity: sleep >= QUICK_SLEEP_MAX ? 0.4 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="افزایش ساعت خواب"
                >
                  <Text style={{ color: colors.primary, fontSize: typography.base, fontWeight: '500' }}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Card>

          {/* ── Symptom chips (with emoji) ──────────────────────────── */}
          <View
            style={{ marginBottom: spacing[6] }}
            onLayout={(e) => noteSection('symptoms', e.nativeEvent.layout.y)}
          >
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: textRoles.cardTitle.fontSize, fontWeight: textRoles.cardTitle.fontWeight, lineHeight: textRoles.cardTitle.lineHeight, marginBottom: spacing[2] }]}>
              علائم شایع امروز
            </Text>
            <View style={[styles.chipWrap, { gap: spacing[2] }]}>
              {quickSymptoms.map(sym => {
                const active = selectedSymptoms.includes(sym.code);
                return (
                  <TouchableOpacity
                    key={sym.code}
                    onPress={() => toggleSymptom(sym.code)}
                    disabled={!dayReady}
                    activeOpacity={0.7}
                    style={[
                      styles.symptomChip,
                      {
                        borderRadius: borderRadius.pill,
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: active ? 1.5 : 1,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[1],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: !dayReady }}
                    accessibilityLabel={sym.label}
                  >
                    {/*
                      Icon + label, never icon alone. Selection is carried by
                      border weight, background and font weight as well as
                      colour, so the state does not depend on colour vision.
                    */}
                    <Icon
                      name={symptomIcon(sym.code)}
                      size={ICON_SIZE.xs}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.symptomChipText,
                        {
                          color: active ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: active ? '700' : '500',
                          // Logical, not physical: `marginRight` pinned this
                          // gap to the physical right and did not mirror.
                          marginEnd: 6,
                        },
                      ]}
                    >
                      {sym.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Today 2.0: context tags (optional) ──────────────────── */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: textRoles.cardTitle.fontSize, fontWeight: textRoles.cardTitle.fontWeight, lineHeight: textRoles.cardTitle.lineHeight, marginBottom: spacing[2] }]}>
              امروز چیز متفاوتی بود؟ <Text style={{ color: colors.textTertiary }}>(اختیاری)</Text>
            </Text>
            <View style={[styles.chipWrap, { gap: spacing[2] }]}>
              {CONTEXT_TAGS.map(ctx => {
                const active = selectedContextTags.includes(ctx.code);
                return (
                  <TouchableOpacity
                    key={ctx.code}
                    onPress={() => toggleContextTag(ctx.code)}
                    activeOpacity={0.7}
                    style={[
                      styles.symptomChip,
                      {
                        borderRadius: borderRadius.pill,
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: active ? 1.5 : 1,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[1],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={ctx.label}
                  >
                    <Text
                      style={[
                        styles.symptomChipText,
                        {
                          color: active ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {ctx.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Always visible — never hidden behind selecting "مورد دیگری". */}
            <TextInput
              style={[
                styles.notesInputArea,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  color: colors.textPrimary,
                  fontSize: typography.sm,
                  padding: spacing[3],
                  marginTop: spacing[2],
                  minHeight: 44,
                },
              ]}
              placeholder="توضیح کوتاه (اختیاری)"
              placeholderTextColor={colors.textTertiary}
              value={contextNote}
              onChangeText={setContextNote}
              multiline
              maxLength={500}
            />
          </View>

          {/* ── Notes (optional, compact) ───────────────────────────── */}
          <View style={{ marginBottom: spacing[6] }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: textRoles.cardTitle.fontSize, fontWeight: textRoles.cardTitle.fontWeight, lineHeight: textRoles.cardTitle.lineHeight, marginBottom: spacing[2] }]}>
              یادداشت <Text style={{ color: colors.textTertiary }}>(اختیاری)</Text>
            </Text>
            <TextInput
              style={[
                styles.notesInputArea,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  color: colors.textPrimary,
                  fontSize: typography.sm,
                  padding: spacing[3],
                },
              ]}
              placeholder="یادداشت در مورد روزت..."
              placeholderTextColor={colors.textTertiary}
              value={notes}
              onChangeText={onNotesChange}
              editable={dayReady}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* The day could not be loaded: nothing can be saved until it is,
              and the retry keeps everything already entered. */}
          {dayLoad === 'failed' && !dayRefetching && (
            <ErrorState error={logId ? undefined : todayLoadError} onRetry={retryDayLoad} />
          )}

          {/* ── Save Button ───────────────────────────────────────────── */}
          {/* Held until the stored day is known and while it refetches, so a
              save is never composed against a form that has not shown what
              is stored. */}
          <Button
            label={
              isPending || submitting ? 'در حال ذخیره...'
                : dayLoad === 'loading' ? 'در حال بارگذاری...'
                  : 'ثبت گزارش امروز'
            }
            onPress={handleSave}
            loading={isPending || submitting || (dayLoad !== 'ready' && dayRefetching)}
            disabled={!canSaveWellness({ load: dayLoad, saving: isPending || submitting, refetching: dayRefetching }) || !saveDate}
            size="lg"
            fullWidth
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontWeight: '800',
  },
  subTitle: {
    marginTop: 4,
    lineHeight: 18,
  },
  cycleChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerLabel: {
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
  },
  ratingOptionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ratingValueText: {
    textAlign: 'center',
  },

  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodItem: {
    flex: 1,
    alignItems: 'center',
  },
  moodCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodLabel: {
    textAlign: 'center',
  },

  sectionSubtitle: {
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sleepStepBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
    textAlign: 'center',
  },

  notesInputArea: {
    borderWidth: 1,
    minHeight: 70,
  },

  // Saved state
  savedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  savedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTitle: {
    fontWeight: '800',
  },
  savedObs: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
