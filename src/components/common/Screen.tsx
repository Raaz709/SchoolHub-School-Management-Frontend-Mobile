import React from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { commonStyles, theme } from '../../theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Pull-to-refresh handler; omit for screens that never reload. */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Extra space at the bottom so the last card clears the drawer bar. */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Page shell: the mobile counterpart of the web layout's
 * `<main><div class="mx-auto max-w-[1560px] px-6 py-6">`.
 */
export function Screen({
  children,
  onRefresh,
  refreshing = false,
  bottomInset = theme.spacing[12],
  style,
  contentStyle,
}: ScreenProps) {
  return (
    <ScrollView
      style={[commonStyles.container, style]}
      contentContainerStyle={[
        commonStyles.scrollContent,
        { paddingBottom: bottomInset },
        contentStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.mint[500]}
            colors={[theme.colors.mint[500]]}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

/** Non-scrolling variant for screens that host their own FlatList. */
export function ScreenView({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[commonStyles.container, styles.flex, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
