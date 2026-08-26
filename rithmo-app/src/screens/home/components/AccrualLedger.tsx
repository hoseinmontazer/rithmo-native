/**
 * AccrualLedger — «چرا دوباره ثبت کنم؟»
 *
 * The audit's finding was that the loop breaks at feedback: logging produces
 * no observable consequence, so nothing tells the user her picture is
 * getting clearer. The backend has always known — maturity, days logged,
 * cycles observed, which signals have a baseline and which are still being
 * learned — and the client showed none of it.
 *
 * This is a **personal evidence ledger, not a reward system**. It reports
 * what is known and what is nearly known. There is no score, no streak, no
 * level, no currency: a number that rises whatever happens would obscure the
 * only thing worth reinforcing, which is whether the picture actually
 * improved.
 *
 * Every value is read from `/api/intelligence/today/` (already fetched by
 * Home). Nothing is estimated. A signal with no reported progress renders
 * no bar rather than an empty one, because a zero-width bar still asserts
 * "we are measuring this" — and if the payload omits per-signal progress
 * entirely, the component falls back to naming the signals without bars.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { signalLabel } from '@i18n';
import type { PersonalStatePayload } from '@types/intelligence.types';

interface Props {
  state?: PersonalStatePayload | null;
}

function Stat({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '800' }}>
        {value}
      </Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

/** One still-learning signal, with a truthful fill. */
function LearningRow({
  signal,
  observations,
  required,
}: {
  signal: string;
  observations: number | null;
  required: number | null;
}) {
  const { colors, typography, spacing } = useTheme();

  const hasProgress =
    typeof observations === 'number' && typeof required === 'number' && required > 0;
  const pct = hasProgress ? Math.min(1, Math.max(0, observations / required)) : 0;
  const remaining = hasProgress ? Math.max(required - observations, 0) : null;

  return (
    <View
      style={{ marginTop: spacing[3] }}
      accessible
      accessibilityLabel={
        hasProgress
          ? `${signalLabel(signal)}: ${observations} از ${required} روز ثبت‌شده`
          : `${signalLabel(signal)}: در حال یادگیری`
      }
    >
      <View style={styles.learningHead}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, fontWeight: '600' }}>
          {signalLabel(signal)}
        </Text>
        {hasProgress ? (
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
            {remaining === 0
              ? 'به‌زودی'
              : `${toFa(remaining!)} روز دیگر`}
          </Text>
        ) : null}
      </View>

      {/* Only drawn when there is a real ratio behind it. */}
      {hasProgress ? (
        <View
          style={[styles.track, { backgroundColor: colors.borderSubtle, marginTop: spacing[1] }]}
        >
          <View
            style={[
              styles.fill,
              { width: `${pct * 100}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export const AccrualLedger = memo(function AccrualLedger({ state }: Props) {
  const { colors, typography, spacing, borderRadius } = useTheme();

  if (!state) { return null; }

  const evidence = state.evidence;
  const established = state.baselines?.baselines ?? {};
  const learning = state.baselines?.learning ?? [];
  const learningProgress = state.baselines?.learning_progress ?? {};

  const establishedCount = Object.keys(established).length;

  // Cap the list so the ledger stays calmer than the story above it.
  const learningToShow = learning.slice(0, 3);

  const isLearning = state.maturity === 'learning';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderRadius: borderRadius.lg,
          padding: spacing[4],
        },
      ]}
    >
      {/* Coloured top edge. Bled to the card's padding edge with negative
          margins rather than `borderTopColor`, because Android drops per-side
          border colours as soon as `borderRadius` is set — that version
          compiled, passed every gate, and rendered nothing at all. */}
      <View
        style={{
          height: 3,
          backgroundColor: colors.luteal,
          marginTop: -spacing[4],
          marginHorizontal: -spacing[4],
          marginBottom: spacing[4],
        }}
      />
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.bodySmall,
          fontWeight: '700',
        }}
      >
        {isLearning ? 'در حال شناختن تو' : 'آنچه تا حالا یاد گرفته‌ام'}
      </Text>

      {/* ── Facts ───────────────────────────────────────────────────── */}
      <View style={[styles.statRow, { marginTop: spacing[3] }]}>
        <Stat value={toFa(evidence.total_logs)} label="روز ثبت" />
        <Stat value={toFa(evidence.usable_cycles)} label="چرخه" />
        <Stat value={toFa(establishedCount)} label="الگوی پایه" />
      </View>

      {/* ── What is nearly known ────────────────────────────────────── */}
      {learningToShow.length > 0 ? (
        <View style={{ marginTop: spacing[4] }}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
            نزدیک به شناخته‌شدن
          </Text>
          {learningToShow.map((signal) => {
            const p = learningProgress[signal];
            return (
              <LearningRow
                key={signal}
                signal={signal}
                observations={typeof p?.observations === 'number' ? p.observations : null}
                required={typeof p?.required === 'number' ? p.required : null}
              />
            );
          })}
        </View>
      ) : null}

      {/* ── Why it matters, stated once ─────────────────────────────── */}
      {isLearning && learningToShow.length === 0 ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.caption,
            lineHeight: 18,
            marginTop: spacing[3],
          }}
        >
          هر روز که ثبت می‌کنی، تصویر شخصی‌ات کامل‌تر می‌شود.
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { flex: 1, alignItems: 'center' },
  learningHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  track: { height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
});
