import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import {
  useProfile,
  useInvitationCode,
  useGenerateInvitationCode,
  useAcceptInvitation,
  useGenerateRemoveCode,
  useRemovePartner,
} from '@hooks/queries/useProfile';
import { Button, Input, Icon, LoadingState } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';

export default function PartnerManageScreen() {
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

  const hasPartner = (profile?.partners?.length ?? 0) > 0;

  const handleGenerateCode = useCallback(async () => {
    try {
      await generateCode();
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [generateCode]);

  const handleShare = useCallback(async (code: string) => {
    try {
      await Share.share({
        message: `Join me on Rithmo! Use this code to link our accounts: ${code}`,
        title: 'Rithmo Partner Invitation',
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
      Alert.alert('Connected! 🎉', 'Your partner has been linked successfully.');
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [codeToAccept, acceptInvitation]);

  const handleStartRemove = useCallback(async () => {
    try {
      const result = await generateRemoveCode();
      setRemoveCode(result?.remove_code ?? '');
      setRemoveStep('confirm');
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [generateRemoveCode]);

  const handleConfirmRemove = useCallback(async () => {
    if (!removeCode.trim()) {return;}
    try {
      await removePartner({ remove_code: removeCode.trim() });
      setRemoveStep('idle');
      setRemoveCode('');
      Alert.alert('Done', 'Partner removed successfully.');
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [removeCode, removePartner]);

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
          <SectionLabel label="Connected Partner" colors={colors} spacing={spacing} typography={typography} />

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
                  key={p.id}
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
                      LINKED
                    </Text>
                  </View>
                </View>
              ))}

              {/* Remove flow */}
              {removeStep === 'idle' ? (
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
                    {genRemoving ? 'Generating code…' : 'Remove Partner'}
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
                    Enter the remove code to confirm unlinking:
                  </Text>
                  <Input
                    value={removeCode}
                    onChangeText={setRemoveCode}
                    placeholder="Remove code"
                    containerStyle={{ marginBottom: spacing[3] }}
                  />
                  <Button
                    label="Confirm Remove"
                    onPress={handleConfirmRemove}
                    variant="danger"
                    loading={removing}
                    fullWidth
                  />
                  <Button
                    label="Cancel"
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
          <SectionLabel label="Invite Your Partner" colors={colors} spacing={spacing} typography={typography} />

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
                    Generate an invitation code
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sm,
                      lineHeight: 20,
                    }}
                  >
                    Share the code with your partner so they can link their Rithmo account to yours.
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
                      Your Invitation Code
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
                      Expires in: {Math.floor(invitation.expires_in / 3600)}h {Math.floor((invitation.expires_in % 3600) / 60)}m
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
                      Share Code
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Button
                  label="Generate Code"
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
          <SectionLabel label="Accept Partner's Code" colors={colors} spacing={spacing} typography={typography} />

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
                    Have a code?
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.sm,
                      lineHeight: 20,
                    }}
                  >
                    Enter the invitation code your partner shared with you.
                  </Text>
                </View>
              </View>

              <Input
                label="Invitation Code"
                placeholder="Enter code"
                value={codeToAccept}
                onChangeText={setCodeToAccept}
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={{ marginBottom: spacing[3] }}
              />
              <Button
                label="Link Partner"
                onPress={handleAccept}
                loading={accepting}
                disabled={!codeToAccept.trim()}
                fullWidth
              />
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
