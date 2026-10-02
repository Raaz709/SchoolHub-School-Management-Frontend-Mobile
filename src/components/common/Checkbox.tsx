import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { theme } from '../../theme';
import { Icon } from '../Icon';

/** Square checkbox matching the website's `accent-mint-600` checkboxes. */
export function Checkbox({
  checked,
  onToggle,
  label,
  hint,
  disabled = false,
  style,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  hint?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      style={[styles.row, disabled && styles.disabled, style]}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Icon name="check" size={12} color={theme.colors.white} /> : null}
      </View>
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Scrollable multi-select. Used for subject allocation, where the whole list of
 * subjects is picked from and saving replaces the current allocation.
 */
export function CheckboxList<T>({
  items,
  selectedIds,
  onToggle,
  keyExtractor,
  labelExtractor,
  hintExtractor,
  emptyMessage = 'Nothing to choose from yet.',
  maxHeight = 220,
  style,
}: {
  items: T[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  keyExtractor: (item: T) => number;
  labelExtractor: (item: T) => string;
  hintExtractor?: (item: T) => string;
  emptyMessage?: string;
  maxHeight?: number;
  style?: StyleProp<ViewStyle>;
}) {
  if (items.length === 0) {
    return (
      <View style={[styles.emptyBox, style]}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.listBox, { maxHeight }, style]}>
      {items.map((item) => {
        const id = keyExtractor(item);
        return (
          <Checkbox
            key={id}
            checked={selectedIds.includes(id)}
            onToggle={() => onToggle(id)}
            label={labelExtractor(item)}
            hint={hintExtractor?.(item)}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2.5],
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    width: 18,
    height: 18,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.ink[300],
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    borderColor: theme.colors.mint[500],
    backgroundColor: theme.colors.mint[500],
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
  },
  hint: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
    marginTop: 1,
  },
  listBox: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[1.5],
  },
  emptyBox: {
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.line,
    padding: theme.spacing[4],
  },
  emptyText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[400],
    textAlign: 'center',
  },
});
