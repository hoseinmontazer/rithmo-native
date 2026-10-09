/**
 * PartnerGuideEntry - the way into the Partner Guide, shown on Partner Home in
 * EVERY state (loading, error, no link, nothing shared, low data, usable): the
 * guide needs nothing from the owner or the server, so it is never gated on
 * them. Three plain rows, one per job (understand / talk / help). No counts, no
 * badges, no "new" dots: nothing here nags.
 */
import React, { memo } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { Card, PressScale } from '@components/ui';
import {
  GUIDE_INTRO_FA,
  GUIDE_TITLE_FA,
  PARTNER_GUIDE_SECTIONS,
  SECTION_META,
} from '../partnerGuideContent';
import { guideRoute } from '../partnerGuideNav';

export const PartnerGuideEntry = memo(function PartnerGuideEntry() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Card style={{ padding: 16, marginBottom: spacing[5] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
        {GUIDE_TITLE_FA}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.caption,
          lineHeight: 20,
          marginTop: spacing[1],
        }}
      >
        {GUIDE_INTRO_FA}
      </Text>
      <View style={{ marginTop: spacing[3], gap: 8 }}>
        {PARTNER_GUIDE_SECTIONS.map((section) => {
          const meta = SECTION_META[section];
          return (
            <PressScale
              key={section}
              onPress={() => { const r = guideRoute(section); navigation.navigate(r.name, r.params); }}
              accessibilityRole="button"
              accessibilityLabel={meta.title}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 12,
                paddingHorizontal: 12,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surfaceSecondary,
              }}
            >
              <Icon name={meta.icon} size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600' }}>
                  {meta.title}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: 2 }}>
                  {meta.subtitle}
                </Text>
              </View>
              <Icon name="chevron-left" size={20} color={colors.textTertiary} />
            </PressScale>
          );
        })}
      </View>
    </Card>
  );
});
