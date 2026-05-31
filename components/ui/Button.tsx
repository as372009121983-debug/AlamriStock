// Powered by OnSpace.AI
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  size = 'md',
  style,
  fullWidth,
}: Props) {
  const palette = getPalette(variant);
  const sizing = getSizing(size);

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          paddingVertical: sizing.paddingV,
          paddingHorizontal: sizing.paddingH,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          width: fullWidth ? '100%' : undefined,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.text, { color: palette.text, fontSize: sizing.font }]}>
            {title}
          </Text>
          {icon ? (
            <MaterialCommunityIcons
              name={icon}
              size={sizing.font + 4}
              color={palette.text}
              style={{ marginRight: 8 }}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function getPalette(variant: Variant) {
  switch (variant) {
    case 'primary':
      return { bg: Colors.primary, text: Colors.white, border: Colors.primary };
    case 'secondary':
      return { bg: Colors.primarySoft, text: Colors.primaryDark, border: Colors.primarySoft };
    case 'danger':
      return { bg: Colors.danger, text: Colors.white, border: Colors.danger };
    case 'outline':
      return { bg: Colors.surface, text: Colors.primary, border: Colors.primary };
    case 'ghost':
    default:
      return { bg: 'transparent', text: Colors.primary, border: 'transparent' };
  }
}

function getSizing(size: 'sm' | 'md' | 'lg') {
  switch (size) {
    case 'sm':
      return { paddingV: 8, paddingH: 12, font: FontSize.sm };
    case 'lg':
      return { paddingV: 16, paddingH: 20, font: FontSize.lg };
    case 'md':
    default:
      return { paddingV: 12, paddingH: 16, font: FontSize.md };
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: FontWeight.semibold,
  },
});
