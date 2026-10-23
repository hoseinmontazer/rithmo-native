/**
 * JalaliDatePicker — pick one day from a month grid (Persian calendar).
 *
 * Direct selection, not a long list: the month the value is in opens first,
 * the arrows move month by month, and days outside [min, max] are shown but
 * disabled. It uses the same Jalali helpers as the cycle calendar, so the
 * weekday columns (Saturday-first, RTL) and month lengths agree with it.
 */
import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from '@components/ui';
import {
  JALALI_GRID_WEEKDAYS,
  JALALI_MONTHS,
  fromJalali,
  jalaliMonthLength,
  jalaliWeekColumn,
  toJalali,
} from '@utils/jalali';
import { formatDateISO, todayISO } from '@utils/dateUtils';
import { faDate, toFa } from '@utils/persian';

interface Props {
  /** Selected day, ISO yyyy-mm-dd. */
  value: string;
  /** Earliest selectable day (inclusive), ISO. */
  min?: string;
  /** Latest selectable day (inclusive), ISO. */
  max: string;
  onSelect: (iso: string) => void;
}

const ord = (jy: number, jm: number) => jy * 12 + (jm - 1);

export const JalaliDatePicker = memo(function JalaliDatePicker({ value, min, max, onSelect }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const today = todayISO();

  const startJ = toJalali(new Date(value + 'T00:00:00'));
  const [cursor, setCursor] = useState({ jy: startJ.jy, jm: startJ.jm });

  const maxJ = toJalali(new Date(max + 'T00:00:00'));
  const minJ = min ? toJalali(new Date(min + 'T00:00:00')) : null;
  const canNext = ord(cursor.jy, cursor.jm) < ord(maxJ.jy, maxJ.jm);
  const canPrev = !minJ || ord(cursor.jy, cursor.jm) > ord(minJ.jy, minJ.jm);

  const move = (delta: 1 | -1) =>
    setCursor((c) => {
      let jm = c.jm + delta;
      let jy = c.jy;
      if (jm > 12) { jm = 1; jy += 1; }
      if (jm < 1) { jm = 12; jy -= 1; }
      return { jy, jm };
    });

  const cells = useMemo(() => {
    const length = jalaliMonthLength(cursor.jy, cursor.jm);
    const first = fromJalali(cursor.jy, cursor.jm, 1);
    const days: (Date | null)[] = [];
    for (let i = 0; i < jalaliWeekColumn(first); i++) {days.push(null);}
    for (let d = 1; d <= length; d++) {days.push(fromJalali(cursor.jy, cursor.jm, d));}
    while (days.length % 7 !== 0) {days.push(null);}
    return days;
  }, [cursor]);

  return (
    <View>
      <View style={styles.header}>
        {/* RTL: the first child is on the right, so it goes to the EARLIER month. */}
        <TouchableOpacity
          onPress={() => move(-1)}
          disabled={!canPrev}
          accessibilityRole="button"
          accessibilityLabel="ماه قبلی"
          accessibilityState={{ disabled: !canPrev }}
          style={[styles.navBtn, { opacity: canPrev ? 1 : 0.3 }]}
        >
          <Icon name="chevron-right" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
          {`${JALALI_MONTHS[cursor.jm]} ${toFa(cursor.jy)}`}
        </Text>
        <TouchableOpacity
          onPress={() => move(1)}
          disabled={!canNext}
          accessibilityRole="button"
          accessibilityLabel="ماه بعدی"
          accessibilityState={{ disabled: !canNext }}
          style={[styles.navBtn, { opacity: canNext ? 1 : 0.3 }]}
        >
          <Icon name="chevron-left" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        {JALALI_GRID_WEEKDAYS.map((w) => (
          // One letter per weekday: the full names collide in a 7-column grid
          // on narrow screens and with large text. The full name stays for
          // screen readers.
          <View key={w} style={styles.cell} accessible accessibilityLabel={w}>
            <Text style={{ color: colors.textTertiary, fontSize: typography.xs, fontWeight: '600' }}>
              {w.charAt(0)}
            </Text>
          </View>
        ))}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <View key={r} style={styles.row}>
          {cells.slice(r * 7, r * 7 + 7).map((day, c) => {
            if (!day) {return <View key={`e${r}${c}`} style={styles.cell} />;}
            const iso = formatDateISO(day);
            const disabled = iso > max || (!!min && iso < min);
            const selected = iso === value;
            const isToday = iso === today;
            return (
              <TouchableOpacity
                key={iso}
                onPress={() => onSelect(iso)}
                disabled={disabled}
                activeOpacity={0.75}
                style={styles.cell}
                accessibilityRole="button"
                accessibilityLabel={`${faDate(day, { weekday: true, year: true })}${isToday ? '، امروز' : ''}${selected ? '، انتخاب‌شده' : ''}`}
                accessibilityState={{ disabled, selected }}
              >
                <View
                  style={[
                    styles.dayCircle,
                    { borderRadius: borderRadius.pill },
                    selected && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: typography.sm,
                      fontWeight: selected || isToday ? '700' : '500',
                      color: selected
                        ? colors.textOnPrimary
                        : disabled
                        ? colors.textDisabled
                        : colors.textPrimary,
                    }}
                  >
                    {toFa(toJalali(day).jd)}
                  </Text>
                </View>
                {isToday && !selected ? <View style={[styles.todayBar, { backgroundColor: colors.primary }]} /> : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <View style={{ height: spacing[1] }} />
    </View>
  );
});

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' },
  dayCircle: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  todayBar: { position: 'absolute', bottom: 3, width: 14, height: 3, borderRadius: 2 },
});
