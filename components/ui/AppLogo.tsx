// Powered by OnSpace.AI
import React from 'react';
import { Image } from 'expo-image';
import { useStore } from '@/hooks/useStore';

const defaultLogo = require('../../assets/app-icon.jpg');

type Props = {
  size?: number;
  rounded?: boolean;
  style?: any;
};

export function AppLogo({ size = 64, rounded = true, style }: Props) {
  const { settings } = useStore();
  const radius = rounded ? size * 0.22 : 0;

  const source = settings.logo ? { uri: settings.logo } : defaultLogo;

  return (
    <Image
      source={source}
      style={[{ width: size, height: size, borderRadius: radius }, style]}
      contentFit="cover"
      transition={200}
    />
  );
}
