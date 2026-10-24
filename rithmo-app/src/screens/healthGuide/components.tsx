/**
 * Small presentation pieces shared by the guide screens. They render exactly
 * the reviewed content they are given; none of them writes medical wording.
 */
import React from 'react';
import { Linking, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import type { GuideBlock, GuideSource } from '@types/healthGuide.types';

export function Callout({ tone, text }: { tone: 'info' | 'warning' | 'safety'; text: string }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const palette = {
    info: { bg: colors.infoBg, fg: colors.info, icon: 'information-outline' },
    warning: { bg: colors.warningBg, fg: colors.warning, icon: 'alert-circle-outline' },
    safety: { bg: colors.errorBg, fg: colors.error, icon: 'alert-circle-outline' },
  }[tone];
  return (
    <View
      accessibilityRole={tone === 'info' ? undefined : 'alert'}
      style={{
        flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderRadius: borderRadius.md,
        backgroundColor: palette.bg, marginVertical: spacing[2],
      }}
    >
      <Icon name={palette.icon} size={20} color={palette.fg} />
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22 }}>{text}</Text>
    </View>
  );
}

export function BlockView({ block }: { block: GuideBlock }) {
  const { colors, spacing, typography } = useTheme();
  switch (block.type) {
    case 'heading':
      return (
        <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '800', marginTop: spacing[4], marginBottom: spacing[1] }}>
          {block.text}
        </Text>
      );
    case 'paragraph':
      return <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 24, marginVertical: spacing[1] }}>{block.text}</Text>;
    case 'list':
    case 'steps':
      return (
        <View style={{ marginVertical: spacing[1], gap: spacing[2] }}>
          {block.items.map((item, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Text style={{ color: colors.primary, fontSize: typography.bodySmall, lineHeight: 24, minWidth: 18, textAlign: 'center' }}>
                {block.type === 'steps' ? `${toFa(i + 1)}.` : '•'}
              </Text>
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 24 }}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'callout':
      return <Callout tone={block.tone} text={block.text} />;
    case 'qa':
      return (
        <View style={{ marginVertical: spacing[2] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', lineHeight: 24 }}>{block.q}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 24, marginTop: spacing[1] }}>{block.a}</Text>
        </View>
      );
    default:
      return null;
  }
}

export function SourceList({ sources }: { sources: GuideSource[] }) {
  const { colors, spacing, typography } = useTheme();
  if (!sources.length) { return null; }
  return (
    <View style={{ marginTop: spacing[5] }}>
      <Text accessibilityRole="header" style={{ color: colors.textTertiary, fontSize: typography.xs, fontWeight: '700', marginBottom: spacing[2] }}>
        منبع‌ها
      </Text>
      {sources.map((s, i) => (
        <TouchableOpacity
          key={i}
          disabled={!s.url}
          onPress={() => s.url && Linking.openURL(s.url)}
          accessibilityRole={s.url ? 'link' : 'text'}
          accessibilityLabel={`${s.publisher}: ${s.title}`}
          style={{ minHeight: 40, justifyContent: 'center' }}
        >
          <Text style={{ color: s.url ? colors.primary : colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>
            {s.publisher}{s.year ? `، ${toFa(s.year)}` : ''}: {s.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '800', marginTop: spacing[6], marginBottom: spacing[2] }}>
      {children}
    </Text>
  );
}

/** A bottom sheet for the small forms (method, reminder, check). */
export function FormSheet({ visible, title, onClose, children }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ maxHeight: '90%', backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing[4], borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '800', flex: 1 }}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن" hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Icon name="chevron-down" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={{ padding: spacing[4], paddingBottom: spacing[8] }}>{children}</View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** One selectable chip (radio semantics). */
export function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={{
        minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing[3], borderRadius: borderRadius.pill,
        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
        borderWidth: active ? 1.5 : 1, borderColor: active ? colors.primary : colors.border,
      }}
    >
      <Text style={{ color: active ? colors.primary : colors.textPrimary, fontSize: typography.bodySmall, fontWeight: active ? '700' : '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}
