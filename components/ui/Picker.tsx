// Powered by OnSpace.AI
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  disabled?: boolean;
};

export function PickerField({
  label,
  value,
  placeholder = 'اختر',
  onPress,
  icon = 'menu-down',
  iconColor = Colors.primary,
  iconBg = Colors.primarySoft,
  disabled,
}: Props) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.wrap,
        pressed && !disabled && { opacity: 0.85 },
        disabled && { opacity: 0.6 },
      ]}
    >
      <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.textMuted} />
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, !value && { color: Colors.textMuted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </View>
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 64,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs },
  value: {
    color: Colors.text,
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
