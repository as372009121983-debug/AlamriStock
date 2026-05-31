// Powered by OnSpace.AI
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/services/format';

type Props = {
  fromDate: number | null;
  toDate: number | null;
  onChange: (from: number | null, to: number | null) => void;
};

export function DateRange({ fromDate, toDate, onChange }: Props) {
  const presets = [
    { label: 'اليوم', from: startOfDay(Date.now()), to: Date.now() },
    { label: 'أمس', from: startOfDay(Date.now() - 86400000), to: endOfDay(Date.now() - 86400000) },
    {
      label: 'آخر 7 أيام',
      from: startOfDay(Date.now() - 6 * 86400000),
      to: Date.now(),
    },
    {
      label: 'هذا الشهر',
      from: startOfMonth(Date.now()),
      to: Date.now(),
    },
    {
      label: 'هذا العام',
      from: startOfYear(Date.now()),
      to: Date.now(),
    },
    { label: 'الكل', from: null, to: null },
  ];
  const isActive = (preset: { from: number | null; to: number | null }) => {
    if (preset.from === null && preset.to === null) return !fromDate && !toDate;
    return fromDate === preset.from && toDate === preset.to;
  };

  return (
    <View>
      <View style={styles.header}>
        <MaterialCommunityIcons name="calendar-range" size={18} color={Colors.primary} />
        <Text style={styles.headerText}>الفترة الزمنية</Text>
      </View>
      <View style={styles.chips}>
        {presets.map((p) => {
          const active = isActive(p);
          return (
            <Pressable
              key={p.label}
              onPress={() => onChange(p.from, p.to)}
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {(fromDate || toDate) && (
        <Text style={styles.hint}>
          من {fromDate ? formatDate(fromDate) : '—'} إلى {toDate ? formatDate(toDate) : '—'}
        </Text>
      )}
    </View>
  );
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function startOfMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfYear(ts: number): number {
  const d = new Date(ts);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  headerText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  chips: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.white },
  hint: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
});
