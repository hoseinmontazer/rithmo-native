/**
 * AISuggestionsScreen — Premium AI Wellness Companion
 *
 * APIs used:
 *   GET  /api/ai/suggestions/          → today's suggestion
 *   GET  /api/ai/suggestion-history/   → past suggestions
 *   POST /api/ai/feedback/{id}/        → submit feedback / correction
 *   GET  /api/ai/model-status/         → model health
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
  Dimensions,
} from 'react-native';
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
import type { AISuggestion } from '@types/ai.types';

const { width: W } = Dimensions.get('window');

// ── helpers ───────────────────────────────────────────────────────────────────

function confidenceLabel(c?: number): string {
  if (!c) return '';
  if (c >= 0.85) return 'High confidence';
  if (c >= 0.6)  return 'Medium confidence';
  return 'Low confidence';
}

function confidenceColor(c: number, colors: any): string {
  if (c >= 0.85) return colors.success;
  if (c >= 0.6)  return colors.ovulationColor;
  return colors.error;
}

function labelEmoji(label: string): string {
  const l = label.toLowerCase();
  if (l.includes('sleep'))      return '😴';
  if (l.includes('stress'))     return '🧘';
  if (l.includes('exercise') || l.includes('activity')) return '🏃';
  if (l.includes('nutrition') || l.includes('diet'))    return '🥗';
  if (l.includes('mood'))       return '💆';
  if (l.includes('cycle'))      return '🌙';
  if (l.includes('ovulat'))     return '✨';
  if (l.includes('water') || l.includes('hydrat'))      return '💧';
  if (l.includes('energy'))     return '⚡';
  if (l.includes('pain'))       return '💊';
  return '🤖';
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Model status pill shown at the top */
function ModelStatusBadge() {
  const { colors, spacing, typography } = useTheme();
  const { data: status } = useAIModelStatus();

  if (!status) return null;

  const isReady = status.status === 'ready';
  const color   = isReady ? colors.success : colors.warning;
  const emoji   = isReady ? '🟢' : '🟡';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: color + '15',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: color + '30',
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[1],
        marginBottom: spacing[4],
        gap: spacing[1],
      }}
    >
      <Text style={{ fontSize: 10 }}>{emoji}</Text>
      <Text style={{ color, fontSize: typography.xs, fontWeight: '700' }}>
        AI {isReady ? 'Ready' : 'Loading'} · v{status.model_version}
      </Text>
    </View>
  );
}

/** Feedback buttons — inline thumbs up/down */
function FeedbackRow({
  item,
  onFeedback,
}: {
  item: AISuggestion;
  onFeedback: (id: number, positive: boolean) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  if (item.feedback === true) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] }}>
        <Text style={{ fontSize: 14 }}>👍</Text>
        <Text style={{ color: colors.success, fontSize: typography.xs, fontWeight: '600' }}>
          Marked as helpful
        </Text>
      </View>
    );
  }

  if (item.feedback === false) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] }}>
        <Text style={{ fontSize: 14 }}>👎</Text>
        <Text style={{ color: colors.error, fontSize: typography.xs, fontWeight: '600' }}>
          Marked as not helpful
        </Text>
        {item.corrected_label ? (
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
            · {item.corrected_label}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginTop: spacing[3] }}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
        Was this helpful?
      </Text>
      <TouchableOpacity
        onPress={() => onFeedback(item.id, true)}
        activeOpacity={0.75}
        style={{
          backgroundColor: colors.success + '18',
          borderRadius: 20,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          borderWidth: 1,
          borderColor: colors.success + '30',
        }}
        accessibilityLabel="Helpful"
      >
        <Text style={{ fontSize: 14 }}>👍</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onFeedback(item.id, false)}
        activeOpacity={0.75}
        style={{
          backgroundColor: colors.error + '18',
          borderRadius: 20,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[1],
          borderWidth: 1,
          borderColor: colors.error + '30',
        }}
        accessibilityLabel="Not helpful"
      >
        <Text style={{ fontSize: 14 }}>👎</Text>
      </TouchableOpacity>
    </View>
  );
}

/** History card */
function HistoryCard({
  item,
  onFeedback,
}: {
  item: AISuggestion;
  onFeedback: (id: number, positive: boolean) => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const emoji = labelEmoji(item.label);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing[3],
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Top accent */}
      <View style={{ height: 2, backgroundColor: colors.luteal + '60' }} />

      <View style={{ padding: spacing[4] }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[3] }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: colors.luteal + '15',
              borderWidth: 1,
              borderColor: colors.luteal + '25',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.sm,
                fontWeight: '700',
                marginBottom: 2,
              }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              {formatDate(item.created_at)}
            </Text>
          </View>

          {/* Confidence badge */}
          {item.confidence > 0 && (
            <View
              style={{
                backgroundColor: confidenceColor(item.confidence, colors) + '15',
                borderRadius: 8,
                paddingHorizontal: spacing[2],
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: confidenceColor(item.confidence, colors),
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {Math.round(item.confidence * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Body */}
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.sm,
            lineHeight: 20,
          }}
        >
          {item.response_text}
        </Text>

        {/* Feedback */}
        <FeedbackRow item={item} onFeedback={onFeedback} />
      </View>
    </View>
  );
}

// ── Negative feedback modal ───────────────────────────────────────────────────

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (correctedLabel: string, correctedText: string) => void;
  loading: boolean;
}

function NegativeFeedbackModal({ visible, onClose, onSubmit, loading }: FeedbackModalProps) {
  const { colors, spacing, typography } = useTheme();
  const [label, setLabel] = useState('');
  const [text,  setText]  = useState('');

  const handleSubmit = () => {
    onSubmit(label.trim(), text.trim());
    setLabel('');
    setText('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: spacing[5],
            paddingBottom: spacing[8],
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: colors.border,
              alignSelf: 'center',
              marginBottom: spacing[5],
            }}
          />

          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.lg,
              fontWeight: '800',
              marginBottom: spacing[1],
            }}
          >
            Help improve the AI 🤖
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              marginBottom: spacing[5],
              lineHeight: 20,
            }}
          >
            Optionally tell us what a better suggestion would look like.
          </Text>

          {/* Corrected label */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.xs,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: spacing[2],
            }}
          >
            Better category (optional)
          </Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g. High stress: meditation recommended"
            placeholderTextColor={colors.textDisabled}
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              color: colors.textPrimary,
              fontSize: typography.base,
              marginBottom: spacing[4],
            }}
          />

          {/* Corrected text */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.xs,
              fontWeight: '700',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              marginBottom: spacing[2],
            }}
          >
            Better suggestion (optional)
          </Text>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="e.g. Try 10 minutes of meditation instead"
            placeholderTextColor={colors.textDisabled}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: colors.background,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              paddingHorizontal: spacing[4],
              paddingVertical: spacing[3],
              color: colors.textPrimary,
              fontSize: typography.base,
              marginBottom: spacing[5],
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />

          {/* Buttons */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 14,
              paddingVertical: spacing[4],
              alignItems: 'center',
              marginBottom: spacing[3],
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontSize: typography.base, fontWeight: '700' }}>
              {loading ? 'Submitting…' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.75}
            style={{ alignItems: 'center', paddingVertical: spacing[2] }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
              Skip — just mark as not helpful
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function AISuggestionsScreen() {
  const { colors, spacing, typography } = useTheme();

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

  const [refreshing, setRefreshing]         = useState(false);
  const [modalVisible, setModalVisible]     = useState(false);
  const [pendingNegId, setPendingNegId]     = useState<number | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchHistory()]);
    setRefreshing(false);
  }, [refetch, refetchHistory]);

  const handleFeedback = useCallback(async (id: number, positive: boolean) => {
    if (!positive) {
      // Open correction modal for negative feedback
      setPendingNegId(id);
      setModalVisible(true);
      return;
    }
    try {
      await submitFeedback({ id, data: { feedback: true } });
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [submitFeedback]);

  const handleNegativeSubmit = useCallback(async (correctedLabel: string, correctedText: string) => {
    if (!pendingNegId) return;
    try {
      await submitFeedback({
        id: pendingNegId,
        data: {
          feedback: false,
          ...(correctedLabel && { corrected_label: correctedLabel }),
          ...(correctedText  && { response_text:   correctedText  }),
        },
      });
      setModalVisible(false);
      setPendingNegId(null);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [pendingNegId, submitFeedback]);

  const handleModalClose = useCallback(async () => {
    // Close modal and submit plain negative feedback without correction
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

  if (cLoading || hLoading) return <LoadingState fullScreen message="Loading AI insights…" />;
  if (cError) return <ErrorState fullScreen error={cErr} onRetry={refetch} />;

  const historyList: AISuggestion[] = Array.isArray(history) ? history : [];

  return (
    <>
      <ScrollView
        style={[styles.flex, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Model status ─────────────────────────────────────────────── */}
        <ModelStatusBadge />

        {/* ── Today's insight hero ─────────────────────────────────────── */}
        {current ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: colors.primary + '30',
              overflow: 'hidden',
              marginBottom: spacing[6],
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.1,
              shadowRadius: 16,
              elevation: 5,
            }}
          >
            {/* Gradient-like top bar */}
            <View style={{ height: 4, backgroundColor: colors.primary }} />

            <View style={{ padding: spacing[5] }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: colors.primary + '15',
                    borderWidth: 1,
                    borderColor: colors.primary + '25',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 26 }}>{labelEmoji(current.label)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.xs,
                      fontWeight: '700',
                      letterSpacing: 0.8,
                      textTransform: 'uppercase',
                      marginBottom: 3,
                    }}
                  >
                    Today's AI Insight
                  </Text>
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: typography.base,
                      fontWeight: '800',
                    }}
                    numberOfLines={2}
                  >
                    {current.label}
                  </Text>
                </View>

                {/* Confidence */}
                {current.confidence > 0 && (
                  <View style={{ alignItems: 'center' }}>
                    <Text
                      style={{
                        color: confidenceColor(current.confidence, colors),
                        fontSize: typography.xl,
                        fontWeight: '900',
                      }}
                    >
                      {Math.round(current.confidence * 100)}%
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: 9,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.3,
                      }}
                    >
                      confidence
                    </Text>
                  </View>
                )}
              </View>

              {/* Body text */}
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.base,
                  lineHeight: 24,
                  fontWeight: '500',
                  marginBottom: spacing[4],
                }}
              >
                {current.response_text}
              </Text>

              {/* Confidence label */}
              {current.confidence > 0 && (
                <Text
                  style={{
                    color: confidenceColor(current.confidence, colors),
                    fontSize: typography.xs,
                    fontWeight: '600',
                    marginBottom: spacing[4],
                  }}
                >
                  {confidenceLabel(current.confidence)}
                </Text>
              )}

              {/* Feedback */}
              <View
                style={{
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                  paddingTop: spacing[4],
                }}
              >
                <FeedbackRow item={current} onFeedback={handleFeedback} />
              </View>
            </View>
          </View>
        ) : (
          <EmptyState
            icon="🤖"
            title="No insight yet"
            description="Log your cycle and wellness data to receive personalised AI health insights."
          />
        )}

        {/* ── History ──────────────────────────────────────────────────── */}
        {historyList.length > 0 && (
          <>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.lg,
                fontWeight: '800',
                letterSpacing: -0.3,
                marginBottom: spacing[4],
              }}
            >
              Past Insights
            </Text>

            {historyList.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onFeedback={handleFeedback}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* ── Negative feedback modal ───────────────────────────────────── */}
      <NegativeFeedbackModal
        visible={modalVisible}
        onClose={handleModalClose}
        onSubmit={handleNegativeSubmit}
        loading={feedbackPending}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
