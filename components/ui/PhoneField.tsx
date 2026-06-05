// Powered by OnSpace.AI
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
};

export function PhoneField({ value, onChangeText, label, placeholder = '01234...', error }: Props) {
  return (
    <View style={{ width: '100%' }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.row, error ? { borderColor: Colors.danger } : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType="phone-pad"
          style={styles.input}
        />
        <View style={styles.divider} />
        <View style={styles.flagBox}>
          <Text style={styles.code}>+20</Text>
          <Text style={styles.flag}>🇪🇬</Text>
        </View>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: 8,
    fontWeight: FontWeight.medium,
    textAlign: 'right',
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  flagBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 6,
  },
  flag: { fontSize: 22 },
  code: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  divider: { width: 1, height: 28, backgroundColor: Colors.border },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'right',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    writingDirection: 'rtl',
  },
  error: {
    fontSize: FontSize.xs,
    color: Colors.danger,
    marginTop: 4,
    textAlign: 'right',
  },
});
