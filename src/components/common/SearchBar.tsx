import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Icon } from '../Icon';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
  style?: StyleProp<ViewStyle>;
  autoFocus?: boolean;
}

/** Bordered search field with a leading icon and a clear affordance. */
export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search…',
  onClear,
  style,
  autoFocus = false,
}: SearchBarProps) {
  return (
    <View style={[styles.wrapper, style]}>
      <Icon name="search" size={15} color={theme.colors.ink[400]} style={styles.icon} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.ink[400]}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        style={commonStyles.searchInput}
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => {
            onChangeText('');
            onClear?.();
          }}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clear}
        >
          <Icon name="close" size={15} color={theme.colors.ink[500]} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    position: 'absolute',
    left: theme.spacing[3],
    zIndex: 1,
  },
  clear: {
    position: 'absolute',
    right: theme.spacing[3],
    zIndex: 1,
    padding: theme.spacing[0.5],
  },
});
