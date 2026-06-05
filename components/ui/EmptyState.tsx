// Powered by OnSpace.AI
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, FontSize, FontWeight, Radius, Spacing } from '@/constants/theme';

type Props = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  description?: string;
};

export function EmptyState({ icon = 'magnify-scan', title, description }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.scene}>
        <View style={styles.bgCircleLeft} />
        <View style={styles.bgCircleRight} />
        <View style={styles.figure}>
          <View style={styles.head}>
            <View style={styles.questionWrap}>
              <Text style={styles.question}>?</Text>
            </View>
          </View>
          <View style={styles.body}>
            <View style={styles.paper}>
              <View style={styles.paperLine} />
              <View style={[styles.paperLine, { width: '50%' }]} />
              <View style={styles.paperAccent} />
            </View>
            <View style={styles.magnifierStem} />
            <View style={styles.magnifier}>
              <MaterialCommunityIcons name={icon} size={26} color={Colors.info} />
            </View>
          </View>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  scene: {
    width: 220,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  bgCircleLeft: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    left: 8,
    top: 30,
  },
  bgCircleRight: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    right: 0,
    top: 24,
    opacity: 0.6,
  },
  figure: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 6,
  },
  head: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  questionWrap: {
    position: 'absolute',
    top: -22,
    right: -10,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  question: { fontSize: 20, color: Colors.textSecondary, fontWeight: '600' as const },
  body: {
    width: 150,
    height: 110,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    marginTop: -10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  paper: {
    position: 'absolute',
    bottom: 8,
    right: 18,
    width: 70,
    height: 84,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.borderStrong,
    borderRadius: 4,
    padding: 8,
    gap: 6,
  },
  paperLine: { height: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 2, width: '85%' },
  paperAccent: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    width: 18,
    height: 6,
    backgroundColor: Colors.warning,
    borderRadius: 2,
  },
  magnifierStem: {
    position: 'absolute',
    top: 28,
    left: 38,
    width: 4,
    height: 28,
    backgroundColor: '#1F2937',
    transform: [{ rotate: '40deg' }],
    borderRadius: 2,
  },
  magnifier: {
    position: 'absolute',
    top: 12,
    left: 22,
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
});
