import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Share,
  Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useRole } from '@hooks/useRole';
import {
  useProfile,
  useInvitationCode,
  useGenerateInvitationCode,
  useAcceptInvitation,
  useGenerateRemoveCode,
  useRemovePartner,
  useShareSettings,
  useUpdateShareSettings,
  useSelfRevokePartner,
} from '@hooks/queries/useProfile';
import { Button, Input, Icon, LoadingState } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import { toFa } from '@utils/persian';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'PartnerManage'>;

type ShareSettingKey =
  | 'share_period_status'
  | 'share_upcoming_period'
  | 'share_mood'
  | 'share_wellness_status';

const SHARE_SETTING_ROWS: { key: ShareSettingKey; label: string; hint: string }[] = [
  { key: 'share_period_status', label: 'وضعیت و فاز چرخه', hint: 'روز چرخه، فاز فعلی و تاریخ‌های ثبت‌شده‌ی دوره' },
  { key: 'share_upcoming_period', label: 'دوره‌ی پیش‌رو', hint: 'تاریخ پیش‌بینی‌شده‌ی دوره‌ی بعدی' },
  { key: 'share_mood', label: 'خلق‌وخو', hint: 'ثبت‌های روزانه‌ی خلق‌وخو' },
  { key: 'share_wellness_status', label: 'جزئیات سلامت', hint: 'انرژی، شدت درد و علائم' },
];

export default function PartnerManageScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: invitation } = useInvitationCode();
  const { mutateAsync: generateCode,    isPending: generating  } = useGenerateInvitationCode();
  const { mutateAsync: acceptInvitation, isPending: accepting  } = useAcceptInvitation();
  const { mutateAsync: generateRemoveCode, isPending: genRemoving } = useGenerateRemoveCode();
  const { mutateAsync: removePartner,   isPending: removing    } = useRemovePartner();

  const [codeToAccept, setCodeToAccept] = useState('');
  const [removeCode,   setRemoveCode]   = useState('');
  const [removeStep,   setRemoveStep]   = useState<'idle' | 'confirm'>('idle');

  const { isPartner } = useRole();
  const { data: shareSettings } = useShareSettings();
  const { mutateAsync: updateShareSettings, isPending: updatingSettings } = useUpdateShareSettings();
  const { mutateAsync: selfRevoke, isPending: revoking } = useSelfRevokePartner();

  const hasPartner = (profile?.partners?.length ?? 0) > 0;

  const handleGenerateCode = useCallback(async () => {
    try {
      await generateCode();
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [generateCode]);

  const handleShare = useCallback(async (code: string) => {
    try {
      await Share.share({
        message: `به ریتمو بپیوند! با این کد حساب‌های ما را پیوند کن: ${code}`,
        title: 'دعوت‌نامه‌ی شریک ریتمو',
      });
    } catch {
      /* user cancelled */
    }
  }, []);

  const handleAccept = useCallback(async () => {
    if (!codeToAccept.trim()) {return;}
    try {
      await acceptInvitation({ code_to_accept: codeToAccept.trim() });
      setCodeToAccept('');
      Alert.alert('اتصال برقرار شد! 🎉', 'شریکت با موفقیت پیوند خورد.');
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [codeToAccept, acceptInvitation]);

  const handleStartRemove = useCallback(async () => {
    try {
      const result = await generateRemoveCode();
      setRemoveCode(result?.remove_code ?? '');
      setRemoveStep('confirm');
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [generateRemoveCode]);

  const handleConfirmRemove = useCallback(async () => {
    if (!removeCode.trim()) {return;}
    try {
      await removePartner({ remove_code: removeCode.trim() });
      setRemoveStep('idle');
      setRemoveCode('');
      Alert.alert('تمام شد', 'شریک با موفقیت حذف شد.');
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [removeCode, removePartner]);

  const handleToggleSetting = useCallback(
    async (key: ShareSettingKey, value: boolean) => {
      try {
        await updateShareSettings({ [key]: value });
      } catch (err) {
        Alert.alert('خطا', extractErrorMessage(err));
      }
    },
    [updateShareSettings],
  );

  const handleSelfRevoke = useCallback(() => {
    Alert.alert(
      'پایان پیوند؟',
      'از شریکت جدا می‌شوی. این عمل بلافاصله اجرا شده و قابل بازگشت نیست.',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'پایان پیوند',
          style: 'destructive',
          onPress: async () => {
            try {
              await selfRevoke();
              Alert.alert('تمام شد', 'دیگر به شریکت متصل نیستی.');
            } catch (err) {
              Alert.alert('خطا', extractErrorMessage(err));
            }
          },
        },
      ],
    );
  }, [selfRevoke]);

  if (profileLoading) {return <LoadingState fullScreen />;}

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12] }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Connected partner ──────────────────────────────────────────── */}
      {hasPartner && (
        <View style={{ marginBottom: spacing[5] }}>
          <SectionLabel label={isPartner ? 'شریکت' : 'شریک متصل'} colors={colors} spacing={spacing} typography={typography} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 20,
                overflow: 'hidden',
              },
            ]}
          >
            {/* Top accent */}
            <View style={{ height: 3, backgroundColor: colors.follicular }} />

            <View style={{ padding: spacing[4] }}>
              {profile!.partners!.map((p) => (
                <View
                  key={p.partner_user_id ?? p.username}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: spacing[4],
                  }}
                >
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      backgroundColor: colors.follicular + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing[3],
                      borderWidth: 2,
                      borderColor: colors.follicular + '40',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.follicular,
                        fontSize: typography.xl,
                        fontWeight: '800',
                      }}
                    >
                      {p.username[0].toUpperCase()}
                    </Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.lg,
                        fontWeight: '700',
                      }}
                    >
                      {p.username}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
                      {p.email}
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: colors.success + '18',
                      borderRadius: 10,
                      paddingHorizontal: spacing[2],
                      paddingVertical: 4,
                      borderWidth: 1,
                      borderColor: colors.success + '30',
                    }}
                  >
                    <Text style={{ color: colors.success, fontSize: 10, fontWeight: '800' }}>
                      متصل
                    </Text>
                  </View>
                </View>
              ))}

              {/* Open Messages button */}
              <TouchableOpacity
                onPress={() => navigation.navigate('PartnerMessages' as any)}
                activeOpacity={0.8}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing[2],
                  paddingVertical: spacing[3],
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  marginBottom: spacing[3],
                }}
              >
                <Icon name="message-text-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: typography.sm, fontWeight: '700' }}>
                  باز کردن پیام‌ها
                </Text>
              </TouchableOpacity>

              {/* Remove flow */}
              {isPartner ? (
                <View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sm,
                      marginBottom: spacing[3],
                      lineHeight: 20,
                    }}
                  >
                    آنچه شریکت انتخاب کند با تو به اشتراک بگذارد، می‌بینی.
                    در هر لحظه می‌توانی پیوند را قطع کنی.
                  </Text>
                  <Button
                    label={revoking ? 'در حال قطع…' : 'قطع پیوند'}
                    onPress={handleSelfRevoke}
                    loading={revoking}
                    variant="danger"
                    fullWidth
                  />
                </View>
              ) : removeStep === 'idle' ? (
                <TouchableOpacity
                  onPress={handleStartRemove}
                  disabled={genRemoving}
                  activeOpacity={0.8}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: spacing[2],
                    paddingVertical: spacing[3],
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.error + '40',
                    backgroundColor: colors.error + '08',
                  }}
                >
                  <Icon name="account-remove-outline" size={18} color={colors.error} />
                  <Text style={{ color: colors.error, fontSize: typography.sm, fontWeight: '600' }}>
                    {genRemoving ? 'در حال ساخت کد…' : 'حذف شریک'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sm,
                      marginBottom: spacing[3],
                      lineHeight: 20,
                    }}
                  >
                    کد حذف را برای تأیید قطع پیوند وارد کن:
                  </Text>
                  <Input
                    value={removeCode}
                    onChangeText={setRemoveCode}
                    placeholder="کد حذف"
                    containerStyle={{ marginBottom: spacing[3] }}
                  />
                  <Button
                    label="تأیید حذف"
                    onPress={handleConfirmRemove}
                    variant="danger"
                    loading={removing}
                    fullWidth
                  />
                  <Button
                    label="انصراف"
                    onPress={() => { setRemoveStep('idle'); setRemoveCode(''); }}
                    variant="ghost"
                    fullWidth
                    style={{ marginTop: spacing[2] }}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── Invite a partner ───────────────────────────────────────────── */}
      {!hasPartner && (
        <View style={{ marginBottom: spacing[5] }}>
          <SectionLabel label="دعوت از شریک" colors={colors} spacing={spacing} typography={typography} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 20,
                overflow: 'hidden',
              },
            ]}
          >
            <View style={{ height: 3, backgroundColor: colors.primary }} />
            <View style={{ padding: spacing[4] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: spacing[3],
                  marginBottom: spacing[4],
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    backgroundColor: colors.primary + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="account-plus-outline" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.base,
                      fontWeight: '700',
                      marginBottom: spacing[1],
                    }}
                  >
                    ساخت کد دعوت
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sm,
                      lineHeight: 20,
                    }}
                  >
                    کد را با شریکت به اشتراک بگذار تا حساب ریتموی خودش را به حساب تو پیوند کند.
                  </Text>
                </View>
              </View>

              {invitation?.invitation_code ? (
                <View>
                  <View
                    style={{
                      backgroundColor: colors.primaryLighter,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: colors.primary + '30',
                      padding: spacing[4],
                      alignItems: 'center',
                      marginBottom: spacing[3],
                    }}
                  >
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        fontWeight: '700',
                        letterSpacing: 0.8,
                        textTransform: 'uppercase',
                        marginBottom: spacing[2],
                      }}
                    >
                      کد دعوت شما
                    </Text>
                    <Text
                      style={{
                        color: colors.primary,
                        fontSize: typography['3xl'],
                        fontWeight: '900',
                        letterSpacing: 6,
                      }}
                    >
                      {invitation.invitation_code}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        marginTop: spacing[2],
                      }}
                    >
                      انقضا: {toFa(Math.floor(invitation.expires_in / 3600))} ساعت {toFa(Math.floor((invitation.expires_in % 3600) / 60))} دقیقه
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleShare(invitation.invitation_code)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: spacing[2],
                      paddingVertical: spacing[3],
                      borderRadius: 12,
                      backgroundColor: colors.primary,
                    }}
                  >
                    <Icon name="share-outline" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: typography.sm, fontWeight: '700' }}>
                      اشتراک‌گذاری کد
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button
                  label="ساخت کد"
                  onPress={handleGenerateCode}
                  loading={generating}
                  fullWidth
                />
              )}
            </View>
          </View>
        </View>
      )}

      {/* ── Accept a partner's code ────────────────────────────────────── */}
      {!hasPartner && (
        <View style={{ marginBottom: spacing[5] }}>
          <SectionLabel label="پذیرش کد شریک" colors={colors} spacing={spacing} typography={typography} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 20,
                overflow: 'hidden',
              },
            ]}
          >
            <View style={{ height: 3, backgroundColor: colors.follicular }} />
            <View style={{ padding: spacing[4] }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: spacing[3],
                  marginBottom: spacing[4],
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    backgroundColor: colors.follicular + '15',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="link-variant" size={22} color={colors.follicular} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.base,
                      fontWeight: '700',
                      marginBottom: spacing[1],
                    }}
                  >
                    کدی داری؟
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sm,
                      lineHeight: 20,
                    }}
                  >
                    کد دعوتی که شریکت برای تو فرستاده را وارد کن.
                  </Text>
                </View>
              </View>

              <Input
                label="کد دعوت"
                placeholder="کد را وارد کن"
                value={codeToAccept}
                onChangeText={setCodeToAccept}
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={{ marginBottom: spacing[3] }}
              />
              <Button
                label="پیوند شریک"
                onPress={handleAccept}
                loading={accepting}
                disabled={!codeToAccept.trim()}
                fullWidth
              />
            </View>
          </View>
        </View>
      )}
      {/* ── Sharing consent (owner controls what partner sees) ─────────── */}
      {hasPartner && !isPartner && shareSettings && (
        <View style={{ marginBottom: spacing[5] }}>
          <SectionLabel label="آنچه شریکت می‌بیند" colors={colors} spacing={spacing} typography={typography} />

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: 20,
                overflow: 'hidden',
              },
            ]}
          >
            <View style={{ height: 3, backgroundColor: colors.success }} />
            <View style={{ padding: spacing[4] }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  lineHeight: 20,
                  marginBottom: spacing[3],
                }}
              >
                انتخاب کن شریکت چه بخش‌هایی از داده‌هایت را ببیند.
                تغییرات بلافاصله اعمال و از سمت سرور اجرا می‌شوند.
              </Text>

              {SHARE_SETTING_ROWS.map((row, index) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing[2],
                    borderBottomWidth:
                      index < SHARE_SETTING_ROWS.length - 1
                        ? StyleSheet.hairlineWidth
                        : 0,
                    borderBottomColor: colors.borderSubtle,
                  }}
                >
                  <View style={{ flex: 1, marginRight: spacing[3] }}>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.sm,
                        fontWeight: '700',
                        marginBottom: 2,
                      }}
                    >
                      {row.label}
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        lineHeight: 16,
                      }}
                    >
                      {row.hint}
                    </Text>
                  </View>
                  <Switch
                    value={shareSettings[row.key]}
                    onValueChange={(value) => handleToggleSetting(row.key, value)}
                    disabled={updatingSettings}
                    trackColor={{ true: colors.primary, false: colors.borderSubtle }}
                    thumbColor={colors.surface}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function SectionLabel({
  label,
  colors,
  spacing,
  typography,
}: {
  label: string;
  colors: any;
  spacing: any;
  typography: any;
}) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: typography.xs,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: spacing[2],
      }}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});
