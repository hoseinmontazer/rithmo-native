/**
 * SupportScreen — the user's support tickets.
 *
 * Single screen, three internal views:
 *   1. List   — all of the user's tickets + "New request"
 *   2. Form   — subject / category / message
 *   3. Detail — message thread (staff + user) + reply box
 *
 * Backend: /api/support/tickets/ (JWT). Internal operator notes are
 * stripped server-side (UserTicketSerializer), so this screen never
 * renders is_internal messages.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ICON_SIZE } from '@design-system/iconography';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { useAuth } from '@hooks/useAuth';
import { Button, Input, LoadingState, ErrorState } from '@components/ui';
import {
  useTickets,
  useTicket,
  useCreateTicket,
  useReplyToTicket,
} from '@hooks/queries/useSupport';
import { extractErrorMessage } from '@utils/errorHandler';
import { faDateShort, toFa } from '@utils/persian';
import type { TicketCategory, TicketStatus } from '@types/support.types';

const CATEGORY_OPTIONS: { value: TicketCategory; label: string }[] = [
  { value: 'technical', label: 'فنی' },
  { value: 'billing',   label: 'هزینه‌ها' },
  { value: 'premium',   label: 'پرمیوم' },
  { value: 'partner',   label: 'شریک' },
  { value: 'account',   label: 'حساب کاربری' },
  { value: 'other',     label: 'سایر' },
];

// Jalali date + 24h time. `faDate` no longer accepts Intl options on
// purpose — accepting them is how Gregorian formatting kept coming back.
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) { return ''; }
  const hh = toFa(String(d.getHours()).padStart(2, '0'));
  const mm = toFa(String(d.getMinutes()).padStart(2, '0'));
  return `${faDateShort(d)} · ${hh}:${mm}`;
};

export default function SupportScreen() {
  const { colors, spacing, typography } = useTheme();
  const { user } = useAuth();
  const myUsername = user?.username ?? '';

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: tickets, isLoading, isError, error, refetch } = useTickets();
  const { data: ticket } = useTicket(selectedId);

  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<TicketCategory>('technical');
  const [message, setMessage] = useState('');
  const { mutateAsync: createTicket, isPending: creating } = useCreateTicket();

  const [reply, setReply] = useState('');
  const { mutateAsync: sendReply, isPending: replying } = useReplyToTicket();

  const statusInfo = (status: TicketStatus) => {
    switch (status) {
      case 'open':          return { label: 'باز',         color: colors.primary };
      case 'in_progress':   return { label: 'در حال بررسی',  color: colors.warning };
      case 'awaiting_user': return { label: 'در انتظار شما', color: colors.ovulationColor };
      case 'resolved':      return { label: 'حل شد',     color: colors.success };
      case 'closed':        return { label: 'بسته',       color: colors.textTertiary };
    }
  };

  const backToList = useCallback(() => {
    setSelectedId(null);
    setShowForm(false);
  }, []);

  const handleCreate = useCallback(async () => {
    if (!subject.trim() || !message.trim()) { return; }
    try {
      const created = await createTicket({
        subject: subject.trim(),
        category,
        message: message.trim(),
      });
      setSubject('');
      setMessage('');
      setCategory('technical');
      setShowForm(false);
      setSelectedId(created.id);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [subject, category, message, createTicket]);

  const handleReply = useCallback(async () => {
    if (!reply.trim() || ticket == null) { return; }
    try {
      await sendReply({ ticketId: ticket.id, body: reply.trim() });
      setReply('');
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [reply, ticket, sendReply]);

  // ── Detail view ─────────────────────────────────────────────────────────
  if (selectedId != null) {
    if (!ticket) { return <LoadingState fullScreen />; }
    const s = statusInfo(ticket.status);
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing[4],
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <TouchableOpacity
              onPress={backToList}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="بازگشت"
              style={{ marginRight: spacing[3] }}
            >
              {/* Vector back chevron — the literal ‹ was a bidi-mirrored glyph
                  with a font-dependent box, the same inconsistency removed from
                  the Profile rows. */}
              <Icon name="chevron-right" size={ICON_SIZE.lg} color={colors.primaryDark} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginRight: spacing[2] }}>
              <Text
                numberOfLines={1}
                style={{ color: colors.textPrimary, fontWeight: '800', fontSize: typography.base }}
              >
                {ticket.subject}
              </Text>
            </View>
            <View
              style={{
                backgroundColor: s.color + '18',
                borderRadius: 8,
                paddingHorizontal: spacing[2],
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: s.color, fontSize: typography.micro, fontWeight: '800' }}>{s.label}</Text>
            </View>
          </View>

          {(ticket.status === 'resolved' || ticket.status === 'closed') && (
            <View
              style={{
                backgroundColor: colors.success + '14',
                paddingVertical: spacing[2],
                paddingHorizontal: spacing[4],
              }}
            >
              <Text style={{ color: colors.success, fontSize: typography.xs, fontWeight: '700' }}>
                این گفتگو {ticket.status === 'resolved' ? 'حل' : 'بسته'} شده است.
                {' '}برای باز کردن مجدد، در ادامه پاسخ بده.
              </Text>
            </View>
          )}

          {/* Thread */}
          <ScrollView contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
         flexGrow: 1,
        }}>
            {ticket.messages.map((m) => {
              const mine = m.sender_username === myUsername;
              return (
                <View
                  key={m.id}
                  style={{
                    flexDirection: mine ? 'row-reverse' : 'row',
                    marginBottom: spacing[3],
                  }}
                >
                  <View
                    style={{
                      maxWidth: '82%',
                      backgroundColor: mine ? colors.primary + '18' : colors.surface,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: mine ? colors.primary + '30' : colors.border,
                      padding: spacing[3],
                    }}
                  >
                    <Text
                      style={{
                        color: mine ? colors.primaryDark : colors.textTertiary,
                        fontSize: typography.micro,
                        fontWeight: '800',
                        marginBottom: 4,
                      }}
                    >
                      {mine ? 'تو' : m.sender_username} · {fmtDate(m.created_at)}
                    </Text>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.sm,
                        lineHeight: 20,
                      }}
                    >
                      {m.body}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Reply box */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              padding: spacing[4],
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="پاسخ بنویس…"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.textPrimary,
                fontSize: typography.sm,
                padding: spacing[3],
                maxHeight: 120,
                marginRight: spacing[3],
              }}
            />
            <TouchableOpacity
              onPress={handleReply}
              style={{
                backgroundColor: colors.primary,
                borderRadius: 14,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                opacity: replying || !reply.trim() ? 0.5 : 1,
              }}
            >
              <Text style={{ color: colors.surface, fontWeight: '800', fontSize: typography.sm }}>
                ارسال
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Create form ─────────────────────────────────────────────────────────
  if (showForm) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={{ padding: spacing[5] }}
            keyboardShouldPersistTaps="handled"
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.lg,
                fontWeight: '800',
                marginBottom: spacing[1],
              }}
            >
              درخواست جدید
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                lineHeight: 20,
                marginBottom: spacing[4],
              }}
            >
              به ما بگو چه اتفاقی افتاده — یک صفحه، یک خطا، یا پرسشی درباره‌ی هزینه‌ها.
            </Text>

            <Input
              label="موضوع"
              value={subject}
              onChangeText={setSubject}
              placeholder="خلاصه‌ی کوتاه"
              autoCapitalize="sentences"
              autoCorrect={false}
              containerStyle={{ marginBottom: spacing[4] }}
            />

            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.sm,
                fontWeight: '700',
                marginBottom: spacing[2],
              }}
            >
              دسته
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing[4] }}>
              {CATEGORY_OPTIONS.map((c) => {
                const active = c.value === category;
                return (
                  <TouchableOpacity
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    style={{
                      paddingHorizontal: spacing[3],
                      paddingVertical: 8,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      backgroundColor: active ? colors.primary + '14' : colors.surface,
                      marginRight: spacing[2],
                      marginBottom: spacing[2],
                    }}
                  >
                    <Text
                      style={{
                        color: active ? colors.primaryDark : colors.textSecondary,
                        fontSize: typography.xs,
                        fontWeight: '700',
                      }}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.sm,
                fontWeight: '700',
                marginBottom: spacing[2],
              }}
            >
              پیام
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="مشکل را شرح بده — چه اتفاقی افتاد، کجا و از چه زمانی"
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.textPrimary,
                fontSize: typography.base,
                padding: spacing[3],
                minHeight: 140,
                marginBottom: spacing[4],
              }}
            />

            <View style={{ marginBottom: spacing[6] }}>
              <Button
                label={creating ? 'در حال ارسال…' : 'ارسال درخواست'}
                onPress={handleCreate}
                loading={creating}
                fullWidth
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── List view ───────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing[5] }}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.lg,
            fontWeight: '800',
            marginBottom: spacing[1],
          }}
        >
          پشتیبانی
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.sm,
            lineHeight: 20,
            marginBottom: spacing[4],
          }}
        >
          پرسش‌هایی درباره‌ی هزینه‌ها، حریم خصوصی، شریک یا مسائل فنی —
          معمولا در کمتر از یک روز پاسخ می‌دهیم.
        </Text>

        <View style={{ marginBottom: spacing[4] }}>
          <Button
            label="درخواست جدید"
            onPress={() => setShowForm(true)}
            fullWidth
          />
        </View>

        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : tickets && tickets.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[8] }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
              هنوز درخواستی نیست
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.sm,
                lineHeight: 20,
                marginTop: spacing[1],
                textAlign: 'center',
              }}
            >
              اگر چیزی غیرعادی به نظر می‌رسد یا به دست‌کمکی نیاز داری، اولین درخواستت را باز کن.
            </Text>
          </View>
        ) : (
          <View>
            {tickets!.map((t) => {
              const s = statusInfo(t.status);
              const last = t.messages.length > 0 ? t.messages[t.messages.length - 1] : null;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelectedId(t.id)}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing[4],
                    marginBottom: spacing[3],
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        color: colors.textPrimary,
                        fontWeight: '700',
                        fontSize: typography.base,
                        marginRight: spacing[2],
                      }}
                    >
                      {t.subject}
                    </Text>
                    <View
                      style={{
                        backgroundColor: s.color + '18',
                        borderRadius: 8,
                        paddingHorizontal: spacing[2],
                        paddingVertical: 3,
                      }}
                    >
                      <Text style={{ color: s.color, fontSize: typography.micro, fontWeight: '800' }}>
                        {s.label}
                      </Text>
                    </View>
                  </View>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.xs,
                      marginTop: 4,
                    }}
                  >
                    {CATEGORY_OPTIONS.find((c) => c.value === t.category)?.label ?? t.category}
                    {last ? ` • ${fmtDate(last.created_at)}` : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
