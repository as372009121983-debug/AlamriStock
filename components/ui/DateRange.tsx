// Powered by OnSpace.AI
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { formatDate } from '@/services/format';
import { CustomDatePicker } from './CustomDatePicker';

type Props = {
  fromDate: number | null;
  toDate: number | null;
  onChange: (from: number | null, to: number | null) => void;
};

export function DateRange({ fromDate, toDate, onChange }: Props) {
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const presets = [
    { key: 'today', label: 'اليوم', from: startOfDay(Date.now()), to: endOfDay(Date.now()) },
    {
      key: 'yesterday',
      label: 'أمس',
      from: startOfDay(Date.now() - 86400000),
      to: endOfDay(Date.now() - 86400000),
    },
    {
      key: '7days',
      label: 'آخر 7 أيام',
      from: startOfDay(Date.now() - 6 * 86400000),
      to: endOfDay(Date.now()),
    },
    {
      key: 'thisMonth',
      label: 'هذا الشهر',
      from: startOfMonth(Date.now()),
      to: endOfDay(Date.now()),
    },
    {
      key: 'lastMonth',
      label: 'الشهر الماضي',
      from: startOfPrevMonth(Date.now()),
      to: endOfPrevMonth(Date.now()),
    },
    {
      key: 'thisYear',
      label: 'هذا العام',
      from: startOfYear(Date.now()),
      to: endOfDay(Date.now()),
    },
    { key: 'all', label: 'الكل', from: null, to: null },
  ];

  const isActive = (preset: { from: number | null; to: number | null }) => {
    if (preset.from === null && preset.to === null) return !fromDate && !toDate;
    return fromDate === preset.from && toDate === preset.to;
  };

  const isCustom = !!(fromDate || toDate) && !presets.some(isActive);

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
              key={p.key}
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
        <Pressable
          onPress={() => setShowFromPicker(true)}
          style={({ pressed }) => [
            styles.chip,
            styles.chipCustom,
            isCustom && styles.chipActive,
            pressed && { opacity: 0.85 },
          ]}
        >
          <MaterialCommunityIcons
            name="calendar-edit"
            size={14}
            color={isCustom ? Colors.white : Colors.primary}
          />
          <Text
            style={[
              styles.chipText,
              isCustom && styles.chipTextActive,
              { marginRight: 4 },
            ]}
          >
            تخصيص
          </Text>
        </Pressable>
      </View>

      {fromDate || toDate ? (
        <View style={styles.rangeRow}>
          <Pressable onPress={() => setShowFromPicker(true)} style={styles.dateBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.primary} />
            <Text style={styles.dateBtnText}>من: {fromDate ? formatDate(fromDate) : '—'}</Text>
          </Pressable>
          <Pressable onPress={() => setShowToPicker(true)} style={styles.dateBtn}>
            <MaterialCommunityIcons name="pencil-outline" size={14} color={Colors.primary} />
            <Text style={styles.dateBtnText}>إلى: {toDate ? formatDate(toDate) : '—'}</Text>
          </Pressable>
        </View>
      ) : null}

      <CustomDatePicker
        visible={showFromPicker}
        onClose={() => setShowFromPicker(false)}
        initialDate={fromDate || Date.now()}
        title="من تاريخ"
        onSelect={(ts) => onChange(startOfDay(ts), toDate || endOfDay(ts))}
      />
      <CustomDatePicker
        visible={showToPicker}
        onClose={() => setShowToPicker(false)}
        initialDate={toDate || Date.now()}
        title="إلى تاريخ"
        endOfDay
        onSelect={(ts) => onChange(fromDate || startOfDay(ts), endOfDay(ts))}
      />
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
function startOfPrevMonth(ts: number): number {
  const d = new Date(ts);
  d.setMonth(d.getMonth() - 1, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfPrevMonth(ts: number): number {
  const d = new Date(ts);
  d.setDate(0); // last day of previous month
  d.setHours(23, 59, 59, 999);
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
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  chipCustom: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryTint,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { color: Colors.text, fontWeight: FontWeight.medium, fontSize: FontSize.sm },
  chipTextActive: { color: Colors.white, fontWeight: FontWeight.bold },
  rangeRow: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  dateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    backgroundColor: Colors.primaryTint,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primarySoft,
  },
  dateBtnText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
  },
});
