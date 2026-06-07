// Powered by OnSpace.AI
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Modal } from './Modal';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';
import { PrintAction } from '@/services/print';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAction: (action: PrintAction) => void;
  showCsvOption?: boolean;
  onCsv?: () => void;
  onExcel?: () => void;
};

export function PrintMenu({ visible, onClose, onAction, showCsvOption, onCsv, onExcel }: Props) {
  const items: {
    key: PrintAction | 'csv' | 'excel';
    label: string;
    desc: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    bg: string;
  }[] = [
    {
      key: 'print',
      label: 'طباعة مباشرة',
      desc: 'إرسال إلى الطابعة (نافذة جديدة على المتصفح)',
      icon: 'printer',
      color: Colors.primary,
      bg: Colors.primarySoft,
    },
    {
      key: 'pdf',
      label: 'حفظ PDF',
      desc: 'تصدير ومشاركة كملف PDF',
      icon: 'file-pdf-box',
      color: Colors.danger,
      bg: Colors.dangerSoft,
    },
    {
      key: 'preview',
      label: 'معاينة',
      desc: 'فتح في نافذة جديدة قبل الطباعة',
      icon: 'eye-outline',
      color: Colors.info,
      bg: Colors.infoSoft,
    },
  ];

  if (onExcel) {
    items.push({
      key: 'excel',
      label: 'تصدير Excel',
      desc: 'تصدير الجدول كملف Excel (.xls)',
      icon: 'microsoft-excel',
      color: Colors.success,
      bg: Colors.successSoft,
    });
  }

  if (showCsvOption && onCsv) {
    items.push({
      key: 'csv',
      label: 'تصدير CSV',
      desc: 'تصدير الجدول كملف CSV',
      icon: 'file-delimited-outline',
      color: Colors.warning,
      bg: Colors.warningSoft,
    });
  }

  return (
    <Modal visible={visible} onClose={onClose} title="خيارات الطباعة">
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={() => {
            onClose();
            if (it.key === 'csv') {
              onCsv && onCsv();
            } else if (it.key === 'excel') {
              onExcel && onExcel();
            } else {
              onAction(it.key as PrintAction);
            }
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
        >
          <MaterialCommunityIcons name="chevron-left" size={20} color={Colors.textMuted} />
          <View style={{ flex: 1, alignItems: 'flex-end', marginRight: Spacing.md }}>
            <Text style={styles.label}>{it.label}</Text>
            <Text style={styles.desc}>{it.desc}</Text>
          </View>
          <View style={[styles.iconBox, { backgroundColor: it.bg }]}>
            <MaterialCommunityIcons name={it.icon} size={22} color={it.color} />
          </View>
        </Pressable>
      ))}
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  desc: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
});
