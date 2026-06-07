// Powered by OnSpace.AI
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  initialDate?: number | null;
  title?: string;
  onSelect: (timestamp: number) => void;
  endOfDay?: boolean;
};

export function CustomDatePicker({
  visible,
  onClose,
  initialDate,
  title = 'اختر التاريخ',
  onSelect,
  endOfDay = false,
}: Props) {
  const init = initialDate ? new Date(initialDate) : new Date();
  const [year, setYear] = useState<number>(init.getFullYear());
  const [month, setMonth] = useState<number>(init.getMonth());
  const [day, setDay] = useState<number>(init.getDate());

  useEffect(() => {
    if (visible) {
      const d = initialDate ? new Date(initialDate) : new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setDay(d.getDate());
    }
  }, [visible, initialDate]);

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 10; y <= currentYear + 1; y++) {
    years.push(y);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);

  function handleConfirm() {
    const d = new Date(
      year,
      month,
      safeDay,
      endOfDay ? 23 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 59 : 0,
      endOfDay ? 999 : 0
    );
    onSelect(d.getTime());
    onClose();
  }

  function handleToday() {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setDay(t.getDate());
  }

  return (
    <Modal visible={visible} onClose={onClose} title={title}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <MaterialCommunityIcons name="calendar-check" size={22} color={Colors.primary} />
          <Text style={styles.previewText}>
            {safeDay} {ARABIC_MONTHS[month]} {year}
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Pressable onPress={handleToday} style={styles.todayBtn} hitSlop={6}>
            <Text style={styles.todayBtnText}>اليوم</Text>
          </Pressable>
          <Text style={styles.sectionLabel}>السنة</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {years.map((y) => (
            <Pressable
              key={y}
              onPress={() => setYear(y)}
              style={[styles.chip, year === y && styles.chipActive]}
            >
              <Text style={[styles.chipText, year === y && styles.chipTextActive]}>{y}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>الشهر</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {ARABIC_MONTHS.map((m, idx) => (
            <Pressable
              key={m}
              onPress={() => setMonth(idx)}
              style={[styles.chip, month === idx && styles.chipActive]}
            >
              <Text style={[styles.chipText, month === idx && styles.chipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>اليوم</Text>
        <View style={styles.daysGrid}>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <Pressable
              key={d}
              onPress={() => setDay(d)}
              style={[styles.dayChip, safeDay === d && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, safeDay === d && styles.dayChipActiveText]}>
                {d}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable onPress={onClose} style={[styles.btn, styles.btnCancel]}>
            <Text style={styles.btnCancelText}>إلغاء</Text>
          </Pressable>
          <Pressable onPress={handleConfirm} style={[styles.btn, styles.btnConfirm]}>
            <MaterialCommunityIcons name="check" size={18} color={Colors.white} />
            <Text style={styles.btnConfirmText}>تأكيد</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  preview: {
    backgroundColor: Colors.primarySoft,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewText: {
    color: Colors.primary,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    textAlign: 'right',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  todayBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  todayBtnText: {
    color: Colors.white,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
  },
  row: {
    flexDirection: 'row-reverse',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 56,
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  chipTextActive: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 4,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayChipText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  dayChipActiveText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  btn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
  },
  btnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnCancelText: {
    color: Colors.text,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.md,
  },
  btnConfirm: {
    backgroundColor: Colors.primary,
  },
  btnConfirmText: {
    color: Colors.white,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.md,
  },
});
