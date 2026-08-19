/**
 * AISuggestionsScreen — Premium AI Wellness Companion
 *
 * Premium landing-system redesign.
 * All styles in StyleSheet.create — zero inline styles.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import {
  useAISuggestion,
  useAISuggestionHistory,
  useAIModelStatus,
  useSubmitAIFeedback,
} from '@hooks/queries/useAI';
import { LoadingState, ErrorState, EmptyState } from '@components/ui';
import { formatDate } from '@utils/dateUtils';
import { extractErrorMessage } from '@utils/errorHandler';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import { PremiumGate } from '@components/PremiumGate';
import type { AISuggestion } from '../../types/ai.types';

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────
function confidenceLabel(c?: number): string {
  if (!c) { return ''; }
  if (c >= 0.85) { return 'High confidence'; }
  if (c >= 0.6)  { return 'Medium confidence'; }
  return 'Low confidence';
}

function confidenceColor(c: number, colors: ReturnType<typeof useTheme>['colors']): string {
  if (c >= 0.85) { return colors.success; }
  if (c >= 0.6)  { return colors.warning; }
  return colors.error;
}

function labelEmoji(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('sleep'))                          { return '😴'; }
  if (l.includes('stress'))                         { return '🧘'; }
  if (l.includes('exercise') || l.includes('activity')) { return '🏃'; }
  if (l.includes('nutrition') || l.includes('diet'))    { return '🥗'; }
  if (l.includes('mood'))                           { return '💆'; }
  if (l.includes('cycle'))                          { return '🌙'; }
  if (l.includes('ovulat'))                         { return '✨'; }
  if (l.includes('water') || l.includes('hydrat'))  { return '💧'; }
  if (l.includes('energy'))                         { return '⚡'; }
  if (l.includes('pain'))                           { return '💊'; }
  return '🤖';
}

// ─────────────────────────────────────────────────────────────────────────────
// Eyebrow
// ─────────────────────────────────────────────────────────────────────────────
function Eyebrow({ label, color }: { label: string; color?: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={[
        s.eyebrow,
        { color: color ?? colors.textTertiary, fontSize: typography.xs },
      ]}
    >
      {label}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ModelStatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function ModelStatusBadge() {
  const { colors, spacing, typography } = useTheme();
  const { data: status } = useAIModelStatus();
  if (!status) { return null; }

  const isReady = status.status === 'ready';
  const color   = isReady ? colors.success : colors.warning;

  return (
    <View
      style={[
        s.modelBadge,
        {
          backgroundColor: color + '15',
          borderColor: color + '30',
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
        },
      ]}
    >
      <View style={[s.modelBadgeDot, { backgroundColor: color }]} />
      <Text style={[s.modelBadgeText, { color, fontSize: typography.xs }]}>
        AI {isReady ? 'Ready' : 'Loading'} · v{status.model_version}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AIDisclaimer
// ─────────────────────────────────────────────────────────────────────────────
function AIDisclaimer() {
  const { colors, typography, spacing, borderRadius } = useTheme();
  return (
    <View
      style={[
        s.disclaimer,
        {
          backgroundColor: colors.infoBg,
          borderRadius: borderRadius.md,
          borderColor: colors.info + '25',
          padding: spacing[3],
          marginTop: spacing[3],
          marginBottom: spacing[5],
        },
      ]}
    >
      <Icon name="information-outline" size={15} color={colors.info} style={s.disclaimerIcon} />
      <Text style={[s.disclaimerText, { color: colors.textSecondary, fontSize: typography.xs }]}>
        راهنمای سلامتی بر اساس داده‌های ثبت‌شده‌ات — تشخیص پزشکی نیست. برای موارد جدی با پزشک مشورت کن.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfidenceRing
// ─────────────────────────────────────────────────────────────────────────────
function ConfidenceRing({ confidence, size = 52 }: { confidence: number; size?: number }) {
  const { colors } = useTheme();
  const color = confidenceColor(confidence, colors);
  const pct   = Math.round(confidence * 100);

  return (
    <View
      style={[
        s.confRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color + '30',
          backgroundColor: color + '12',
        },
      ]}
    >
      <Text style={[s.confRingValue, { color }]}>{pct}</Text>
      <Text style={[s.confRingPct, { color }]}>%</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FeedbackRow
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackRow({
  item,
  onFeedback,
  dark = false,
}: {
  item: AISuggestion;
  onFeedback: (id: number, positive: boolean) => void;
  dark?: boolean;
}) {
  const { colors, spacing, typography } = useTheme();

  const mutedText  = dark ? 'rgba(255,255,255,0.5)' : colors.textSecondary;

  if (item.feedback === true) {
    return (
      <View style={[s.feedbackRow, { marginTop: spacing[3] }]}>
        <View style={[s.feedbackPill, { backgroundColor: colors.success + '18' }]}>
          <Text style={s.feedbackEmoji}>👍</Text>
          <Text style={[s.feedbackPillText, { color: colors.success, fontSize: typography.xs }]}>
            Helpful
          </Text>
        </View>
      </View>
    );
  }

  if (item.feedback === false) {
    return (
      <View style={[s.feedbackRow, { marginTop: spacing[3] }]}>
        <View style={[s.feedbackPill, { backgroundColor: colors.error + '18' }]}>
          <Text style={s.feedbackEmoji}>👎</Text>
          <Text style={[s.feedbackPillText, { color: colors.error, fontSize: typography.xs }]}>
            Not helpful
          </Text>
        </View>
        {item.corrected_label ? (
          <Text style={[s.feedbackCorrected, { color: mutedText, fontSize: typography.xs }]}>
            · {item.corrected_label}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[s.feedbackRow, { marginTop: spacing[3] }]}>
      <Text style={[s.feedbackPrompt, { color: mutedText, fontSize: typography.xs }]}>
        Was this helpful?
      </Text>
      <TouchableOpacity
        onPress={() => onFeedback(item.id, true)}
        activeOpacity={0.75}
        style={[
          s.feedbackBtn,
          {
            backgroundColor: colors.success + '18',
            borderColor: colors.success + '25',
            paddingHorizontal: spacing[3],
          },
        ]}
        accessibilityLabel="Helpful"
      >
        <Text style={s.feedbackEmoji}>👍</Text>
        <Text style={[s.feedbackBtnText, { color: colors.success, fontSize: typography.xs }]}>
          Yes
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onFeedback(item.id, false)}
        activeOpacity={0.75}
        style={[
          s.feedbackBtn,
          {
            backgroundColor: colors.error + '18',
            borderColor: colors.error + '25',
            paddingHorizontal: spacing[3],
          },
        ]}
        accessibilityLabel="Not helpful"
      >
        <Text style={s.feedbackEmoji}>👎</Text>
        <Text style={[s.feedbackBtnText, { color: colors.error, fontSize: typography.xs }]}>
          No
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HistoryCard
// ─────────────────────────────────────────────────────────────────────────────
function HistoryCard({
  item,
  onFeedback,
}: {
  item: AISuggestion;
  onFeedback: (id: number, positive: boolean) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const emoji = labelEmoji(item.label);

  return (
    <View
      style={[
        s.historyCard,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.md,
          borderColor: colors.border,
          marginBottom: spacing[3],
        },
      ]}
    >
      {/* Accent side bar */}
      <View style={[s.historyAccentBar, { backgroundColor: colors.luteal }]} />

      <View style={[s.historyContent, { padding: spacing[4] }]}>
        {/* Header row */}
        <View style={[s.historyHeader, { marginBottom: spacing[3] }]}>
          <View
            style={[
              s.historyEmojiBox,
              {
                backgroundColor: colors.lutealBg,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Text style={s.historyEmoji}>{emoji}</Text>
          </View>

          <View style={s.historyMeta}>
            <Text
              style={[s.historyLabel, { color: colors.textPrimary, fontSize: typography.sm }]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <Text style={[s.historyDate, { color: colors.textTertiary, fontSize: typography.xs }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          {item.confidence > 0 && (
            <View
              style={[
                s.confBadge,
                { backgroundColor: confidenceColor(item.confidence, colors) + '15' },
              ]}
            >
              <Text
                style={[
                  s.confBadgeText,
                  { color: confidenceColor(item.confidence, colors) },
                ]}
              >
                {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Body */}
        <Text style={[s.historyBody, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {item.response_text}
        </Text>

        {/* Rationale */}
        {!!item.rationale && (
          <Text style={[s.historyRationale, { color: colors.textTertiary, fontSize: typography.xs }]}>
            {item.rationale}
          </Text>
        )}

        <FeedbackRow item={item} onFeedback={onFeedback} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NegativeFeedbackModal
// ─────────────────────────────────────────────────────────────────────────────
interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (correctedLabel: string, correctedText: string) => void;
  loading: boolean;
}

function NegativeFeedbackModal({ visible, onClose, onSubmit, loading }: FeedbackModalProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [label, setLabel] = useState('');
  const [text,  setText]  = useState('');

  const handleSubmit = () => {
    onSubmit(label.trim(), text.trim());
    setLabel('');
    setText('');
  };

  const inputBase = [
    s.modalInput,
    {
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      borderColor: colors.border,
      paddingHorizontal: spacing[4],
      paddingVertical: spacing[3],
      color: colors.textPrimary,
      fontSize: typography.base,
    },
  ] as const;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={s.flex1}
      >
        <TouchableOpacity style={s.modalScrim} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            s.modalSheet,
            {
              backgroundColor: colors.surface,
              padding: spacing[5],
              paddingBottom: spacing[10],
            },
          ]}
        >
          {/* Handle */}
          <View style={[s.modalHandle, { backgroundColor: colors.border }]} />

          <Eyebrow label="Feedback" />
          <Text style={[s.modalTitle, { color: colors.textPrimary, fontSize: typography.xl }]}>
            Help improve the AI 🤖
          </Text>
          <Text style={[s.modalSub, { color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[5] }]}>
            Optionally tell us what a better suggestion would look like.
          </Text>

          {/* Category field */}
          <Text style={[s.modalFieldLabel, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
            Better category (optional)
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. High stress: meditation recommended"
            placeholderTextColor={colors.textDisabled}
            style={[...inputBase, { marginBottom: spacing[4] }]}
          />

          {/* Suggestion field */}
          <Text style={[s.modalFieldLabel, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
            Better suggestion (optional)
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. Try 10 minutes of meditation instead"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            style={[...inputBase, s.modalTextarea, { marginBottom: spacing[5] }]}
          />

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={[
              s.modalSubmitBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.md,
                paddingVertical: spacing[4],
                marginBottom: spacing[3],
              },
              loading && s.modalSubmitBtnDisabled,
            ]}
            accessibilityState={{ disabled: loading }}
          >
            <Text style={[s.modalSubmitText, { color: colors.textOnPrimary, fontSize: typography.base }]}>
              {loading ? 'Submitting…' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} activeOpacity={0.75} style={s.modalSkipBtn}>
            <Text style={[s.modalSkipText, { color: colors.textTertiary, fontSize: typography.sm }]}>
              Skip — just mark as not helpful
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroSuggestionCard
// ─────────────────────────────────────────────────────────────────────────────
function HeroSuggestionCard({
  current,
  onFeedback,
}: {
  current: AISuggestion;
  onFeedback: (id: number, positive: boolean) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const emoji         = labelEmoji(current.label);
  const isSafetyAlert = !!current.safety_override;
  const accentColor   = isSafetyAlert ? colors.error : colors.follicular;

  return (
    <View
      style={[
        s.heroCard,
        {
          backgroundColor: colors.surfaceDark,
          borderRadius: borderRadius.md,
          marginBottom: spacing[8],
          shadowColor: accentColor,
        },
      ]}
    >
      {/* Decorative orbs */}
      <View style={[s.heroOrbTopRight,   { backgroundColor: accentColor + '18' }]} />
      <View style={[s.heroOrbBottomLeft, { backgroundColor: colors.menstrual + '12' }]} />

      {/* Top accent bar */}
      <View style={[s.heroAccentBar, { backgroundColor: accentColor }]} />

      <View style={[s.heroCardInner, { padding: spacing[5] }]}>
        {/* Eyebrow row */}
        <View style={[s.heroEyebrowRow, { marginBottom: spacing[5] }]}>
          <View style={s.heroEyebrowLeft}>
            <View style={[s.heroBadge, { backgroundColor: accentColor + '25' }]}>
              <Text style={[s.heroBadgeText, { color: accentColor }]}>
                {isSafetyAlert ? '⚠ Safety Alert' : current.fallback ? 'Wellness Tip' : "Today's AI Insight"}
              </Text>
            </View>
          </View>
          {current.confidence > 0 && <ConfidenceRing confidence={current.confidence} />}
        </View>

        {/* Emoji + label */}
        <View style={[s.heroLabelRow, { gap: spacing[4], marginBottom: spacing[4] }]}>
          <View
            style={[
              s.heroEmojiBox,
              {
                backgroundColor: accentColor + '20',
                borderRadius: borderRadius.md,
              },
            ]}
          >
            <Text style={s.heroEmojiText}>{emoji}</Text>
          </View>
          <View style={s.heroLabelMeta}>
            <Text style={s.heroConfidenceLabel}>
              {confidenceLabel(current.confidence)}
            </Text>
            <Text
              style={[s.heroLabelTitle, { color: colors.textOnDark, fontSize: typography.lg }]}
              numberOfLines={3}
            >
              {current.label}
            </Text>
          </View>
        </View>

        {/* Body */}
        <Text style={[s.heroBody, { marginBottom: spacing[4] }]}>
          {current.response_text}
        </Text>

        {/* Rationale */}
        {!!current.rationale && (
          <View
            style={[
              s.heroRationaleBox,
              {
                borderRadius: borderRadius.md,
                borderLeftColor: accentColor + '60',
                marginBottom: spacing[4],
              },
            ]}
          >
            <Text style={s.heroRationaleText}>{current.rationale}</Text>
          </View>
        )}

        {/* Safety note */}
        {isSafetyAlert && (
          <View
            style={[
              s.heroSafetyBox,
              {
                backgroundColor: colors.error + '20',
                borderRadius: borderRadius.md,
                marginBottom: spacing[4],
              },
            ]}
          >
            <Text style={[s.heroSafetyText, { color: colors.error }]}>
              بر اساس داده‌های ثبت‌شده، یک پیام ایمنی ثابت نمایش می‌دهیم. اگر چیزی فوری است با پزشک تماس بگیر.
            </Text>
          </View>
        )}

        {/* Feedback */}
        <View style={[s.heroDivider, { paddingTop: spacing[4] }]}>
          <FeedbackRow item={current} onFeedback={onFeedback} dark />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AISuggestionsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { isPremium } = usePremiumStatus();

  const {
    data: current,
    isLoading: cLoading,
    isError: cError,
    error: cErr,
    refetch,
  } = useAISuggestion();

  const {
    data: history,
    isLoading: hLoading,
    refetch: refetchHistory,
  } = useAISuggestionHistory();

  const { mutateAsync: submitFeedback, isPending: feedbackPending } = useSubmitAIFeedback();

  const [refreshing,    setRefreshing]    = useState(false);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [pendingNegId,  setPendingNegId]  = useState<number | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchHistory()]);
    setRefreshing(false);
  }, [refetch, refetchHistory]);

  const handleFeedback = useCallback(
    async (id: number, positive: boolean) => {
      if (!positive) {
        setPendingNegId(id);
        setModalVisible(true);
        return;
      }
      try {
        await submitFeedback({ id, data: { feedback: true } });
      } catch (err) {
        Alert.alert('Error', extractErrorMessage(err));
      }
    },
    [submitFeedback],
  );

  const handleNegativeSubmit = useCallback(
    async (correctedLabel: string, correctedText: string) => {
      if (!pendingNegId) { return; }
      try {
        await submitFeedback({
          id: pendingNegId,
          data: {
            feedback: false,
            ...(correctedLabel && { corrected_label: correctedLabel }),
            ...(correctedText  && { response_text: correctedText }),
          },
        });
        setModalVisible(false);
        setPendingNegId(null);
      } catch (err) {
        Alert.alert('Error', extractErrorMessage(err));
      }
    },
    [pendingNegId, submitFeedback],
  );

  const handleModalClose = useCallback(async () => {
    if (pendingNegId) {
      try {
        await submitFeedback({ id: pendingNegId, data: { feedback: false } });
      } catch {
        /* silent */
      }
    }
    setModalVisible(false);
    setPendingNegId(null);
  }, [pendingNegId, submitFeedback]);

  if (cLoading || hLoading) {
    return <LoadingState fullScreen message="Loading AI insights…" />;
  }
  if (cError) {
    return <ErrorState fullScreen error={cErr} onRetry={refetch} />;
  }

  const historyList: AISuggestion[] = Array.isArray(history) ? history : [];

  return (
    <>
      <SafeAreaView
        style={[s.flex1, { backgroundColor: colors.background }]}
        edges={['top', 'left', 'right']}
      >
        <ScrollView
          contentContainerStyle={[
            s.scrollContent,
            { paddingHorizontal: spacing[5], paddingBottom: spacing[12] },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* ══ HERO HEADER ══════════════════════════════════════════════ */}
          <View style={[s.pageHeader, { paddingTop: spacing[6], marginBottom: spacing[5] }]}>
            <View style={[s.pageHeaderTop, { marginBottom: spacing[3] }]}>
              <View style={s.flex1}>
                <Eyebrow label="ریتمو · هوش مصنوعی" />
                <Text
                  style={[
                    s.pageTitle,
                    { color: colors.textPrimary, fontSize: typography['2xl'] },
                  ]}
                >
                  AI Companion
                </Text>
              </View>
              <ModelStatusBadge />
            </View>
            <Text style={[s.pageSub, { color: colors.textSecondary, fontSize: typography.sm }]}>
              پیشنهادهای سلامتی شخصی‌سازی‌شده بر اساس داده‌های خودت
            </Text>
            <AIDisclaimer />
          </View>

          {/* ══ TODAY'S INSIGHT ══════════════════════════════════════════ */}
          {current ? (
            <HeroSuggestionCard current={current} onFeedback={handleFeedback} />
          ) : (
            <View style={[s.emptyWrap, { marginBottom: spacing[8] }]}>
              <EmptyState
                icon="🤖"
                title="No insight yet"
                description="Log your cycle and wellness data to receive personalised AI health insights."
              />
            </View>
          )}

          {/* ══ HISTORY ══════════════════════════════════════════════════ */}
          {historyList.length > 0 && (
            <>
              {!isPremium && (
                <View style={[s.premiumGateWrap, { marginBottom: spacing[5] }]}>
                  <PremiumGate featureName="AI confidence & rationale" />
                </View>
              )}

              <View style={[s.historyHeadingRow, { marginBottom: spacing[4] }]}>
                <View>
                  <Eyebrow label="Archive" />
                  <Text
                    style={[
                      s.historyHeadingTitle,
                      { color: colors.textPrimary, fontSize: typography.lg },
                    ]}
                  >
                    Past Insights
                  </Text>
                </View>
                <View
                  style={[
                    s.historyCountBadge,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[s.historyCountText, { color: colors.textSecondary, fontSize: typography.xs }]}>
                    {historyList.length}
                  </Text>
                </View>
              </View>

              {historyList.map((item) => (
                <HistoryCard key={item.id} item={item} onFeedback={handleFeedback} />
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <NegativeFeedbackModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSubmit={handleNegativeSubmit}
        loading={feedbackPending}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex1:        { flex: 1 },
  scrollContent: {},

  // Eyebrow
  eyebrow: {
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // ModelStatusBadge
  modelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 99,
    borderWidth: 1,
    gap: 6,
  },
  modelBadgeDot:  { width: 6, height: 6, borderRadius: 3 },
  modelBadgeText: { fontWeight: '700' },

  // AIDisclaimer
  disclaimer: {
    flexDirection: 'row',
    borderWidth: 1,
  },
  disclaimerIcon: { marginTop: 1 },
  disclaimerText: { flex: 1, lineHeight: 17 },

  // ConfidenceRing
  confRing: {
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confRingValue: { fontSize: 13, fontWeight: '900', letterSpacing: -0.5 },
  confRingPct:   { fontSize: 8,  fontWeight: '700' },

  // FeedbackRow
  feedbackRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedbackPill:     { flexDirection: 'row', alignItems: 'center', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, gap: 5 },
  feedbackPillText: { fontWeight: '700' },
  feedbackCorrected:{},
  feedbackPrompt:   { fontWeight: '500' },
  feedbackBtn:      { borderRadius: 99, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5 },
  feedbackBtnText:  { fontWeight: '600' },
  feedbackEmoji:    { fontSize: 12 },

  // HistoryCard
  historyCard: {
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  historyAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  historyContent:   {},
  historyHeader:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  historyEmojiBox:  { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  historyEmoji:     { fontSize: 20 },
  historyMeta:      { flex: 1 },
  historyLabel:     { fontWeight: '700', marginBottom: 2 },
  historyDate:      {},
  confBadge:        { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  confBadgeText:    { fontSize: 11, fontWeight: '800' },
  historyBody:      { lineHeight: 21 },
  historyRationale: { lineHeight: 16, fontStyle: 'italic', marginTop: 8 },

  // NegativeFeedbackModal
  modalScrim:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle:       { fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  modalSub:         { lineHeight: 20 },
  modalFieldLabel:  { fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  modalInput: {
    borderWidth: 1,
  },
  modalTextarea:    { minHeight: 80, textAlignVertical: 'top' },
  modalSubmitBtn:        { alignItems: 'center' },
  modalSubmitBtnDisabled:{ opacity: 0.6 },
  modalSubmitText:  { fontWeight: '700' },
  modalSkipBtn:     { alignItems: 'center', paddingVertical: 8 },
  modalSkipText:    {},

  // HeroSuggestionCard
  heroCard: {
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 18,
    elevation: 6,
  },
  heroOrbTopRight: {
    position: 'absolute',
    top: -48,
    right: -48,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  heroOrbBottomLeft: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  heroAccentBar:   { height: 3 },
  heroCardInner:   {},
  heroEyebrowRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroEyebrowLeft: { flexDirection: 'row', alignItems: 'center' },
  heroBadge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  heroBadgeText:   { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  heroLabelRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  heroEmojiBox:    { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  heroEmojiText:   { fontSize: 28 },
  heroLabelMeta:   { flex: 1, paddingTop: 4 },
  heroConfidenceLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  heroLabelTitle:  { fontWeight: '900', letterSpacing: -0.4, lineHeight: 26 },
  heroBody: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 25,
    fontWeight: '400',
  },
  heroRationaleBox: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 12,
    borderLeftWidth: 2,
  },
  heroRationaleText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  heroSafetyBox:  { padding: 12 },
  heroSafetyText: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
  heroDivider:    { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.12)' },

  // Main screen — page header
  pageHeader:    {},
  pageHeaderTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  pageTitle:     { fontWeight: '900', letterSpacing: -1, lineHeight: 38 },
  pageSub:       { lineHeight: 20 },
  emptyWrap:     {},
  premiumGateWrap: {},

  // History section heading
  historyHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyHeadingTitle: { fontWeight: '800', letterSpacing: -0.4 },
  historyCountBadge: {
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
  },
  historyCountText: { fontWeight: '700' },
});
