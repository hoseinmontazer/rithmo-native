/**
 * Collapsible - a titled section whose body opens and closes with one short,
 * native layout animation. The end state is reached instantly under reduced
 * motion, and the header announces expanded/collapsed to screen readers.
 */
import React, { memo, useState } from 'react';
import { LayoutAnimation, Platform, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useReducedMotion } from '@hooks/useReducedMotion';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleProps {
  title: string;
  /** Shown beside the title, e.g. how many items are inside. */
  count?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Collapsible = memo(function Collapsible({ title, count, defaultOpen = false, children }: CollapsibleProps) {
  const { colors, spacing, typography } = useTheme();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    if (!reduced) { LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity')); }
    setOpen((v) => !v);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.72}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={count ? `${title}، ${count}` : title}
        style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing[2] }}
      >
        <Text accessibilityRole="header" style={{ flex: 1, color: colors.textPrimary, fontSize: typography.base, fontWeight: '800' }}>{title}</Text>
        {count ? <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>{count}</Text> : null}
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textTertiary} />
      </TouchableOpacity>
      {open ? children : null}
    </View>
  );
});
