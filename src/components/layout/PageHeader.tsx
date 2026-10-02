import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonStyles } from '../../theme';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Page title + subtitle + optional right-hand action, as on the website. */
export function PageHeader({ title, subtitle, action, style }: PageHeaderProps) {
  return (
    <View style={[commonStyles.screenHeader, style]}>
      <View style={styles.text}>
        <Text style={commonStyles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={commonStyles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  text: {
    flex: 1,
  },
  action: {
    flexShrink: 0,
  },
});
