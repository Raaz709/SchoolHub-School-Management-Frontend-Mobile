import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TouchableOpacity } from 'react-native';
import { commonStyles, theme } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Inner padding in dp; defaults to the web card's 20px. */
  padding?: number;
  onPress?: () => void;
}

/**
 * White, 1px `border-line`, `rounded-2xl` surface — the mobile equivalent of the
 * website's `<section class="rounded-2xl border border-line bg-white p-5">`.
 */
export function Card({ children, style, padding = theme.spacing[5], onPress }: CardProps) {
  const base = [commonStyles.card, { padding }, style];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={base}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={base}>{children}</View>;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardHeader({ title, subtitle, action, style }: CardHeaderProps) {
  return (
    <View style={[commonStyles.cardHeader, style]}>
      <View style={styles.headerText}>
        <Text style={commonStyles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={commonStyles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action}
    </View>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function CardContent({ children, style }: CardContentProps) {
  return <View style={[commonStyles.cardContent, style]}>{children}</View>;
}

/** A card whose header is flush with no divider — used by detail panels. */
export function Panel({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Card style={style}>
      {title ? <Text style={[commonStyles.sectionTitle, styles.panelTitle]}>{title}</Text> : null}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerText: {
    flex: 1,
  },
  panelTitle: {
    marginBottom: theme.spacing[3],
  },
});
