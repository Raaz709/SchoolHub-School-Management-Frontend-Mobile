import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Icon } from '../Icon';
import { Modal } from './Modal';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
  hint?: string;
}

interface SelectProps<T extends string | number> {
  label?: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T | null) => void;
  placeholder?: string;
  /** Adds a leading "All"/"None" row that clears the value. */
  clearLabel?: string;
  disabled?: boolean;
  error?: string | null;
  style?: StyleProp<ViewStyle>;
  title?: string;
  searchable?: boolean;
}

/**
 * Native dropdown that reads like the website's `<select>`: a bordered field
 * showing the current label, opening a searchable list when tapped.
 */
export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select…',
  clearLabel,
  disabled = false,
  error,
  style,
  title,
  searchable = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((option) => option.value === value) ?? null;

  const visibleOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={commonStyles.label}>{label}</Text> : null}

      <Pressable
        onPress={disabled ? undefined : () => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? placeholder}
        style={[
          styles.field,
          error ? styles.fieldError : null,
          disabled ? commonStyles.inputDisabled : null,
        ]}
      >
        <Text
          style={[styles.value, !selected ? styles.placeholder : null]}
          numberOfLines={1}
        >
          {selected ? selected.label : placeholder}
        </Text>
        <Icon name="chevronDown" size={16} color={theme.colors.ink[400]} />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal visible={open} onClose={close} title={title ?? label ?? 'Select'} scrollable={false}>
        {searchable ? (
          <View style={styles.searchRow}>
            <Icon name="search" size={15} color={theme.colors.ink[400]} style={styles.searchIcon} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search…"
              placeholderTextColor={theme.colors.ink[400]}
              style={[commonStyles.input, styles.searchInput]}
            />
          </View>
        ) : null}

        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {clearLabel ? (
            <Pressable
              onPress={() => {
                onChange(null);
                close();
              }}
              style={[styles.option, value === null ? styles.optionActive : null]}
            >
              <Text style={styles.optionLabel}>{clearLabel}</Text>
              {value === null ? <Icon name="check" size={16} color={theme.colors.mint[600]} /> : null}
            </Pressable>
          ) : null}

          {visibleOptions.length === 0 ? (
            <Text style={styles.noOptions}>No matches</Text>
          ) : (
            visibleOptions.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={String(option.value)}
                  onPress={() => {
                    onChange(option.value);
                    close();
                  }}
                  style={[styles.option, active ? styles.optionActive : null]}
                >
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, active ? styles.optionLabelActive : null]}>
                      {option.label}
                    </Text>
                    {option.hint ? <Text style={styles.optionHint}>{option.hint}</Text> : null}
                  </View>
                  {active ? <Icon name="check" size={16} color={theme.colors.mint[600]} /> : null}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </Modal>
    </View>
  );
}

/** Segmented control used for role switches and small tab sets. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; icon?: React.ComponentProps<typeof Icon>['name'] }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.chipGroup, style]}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            style={[styles.chip, active ? styles.chipActive : null]}
          >
            {option.icon ? (
              <Icon
                name={option.icon}
                size={14}
                color={active ? theme.colors.ink[900] : theme.colors.ink[500]}
              />
            ) : null}
            <Text style={[styles.chipLabel, active ? styles.chipLabelActive : null]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
    minHeight: 40,
  },
  fieldError: {
    borderColor: theme.colors.rose[500],
  },
  value: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.ink[900],
  },
  placeholder: {
    color: theme.colors.ink[400],
  },
  errorText: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.rose[600],
    marginTop: theme.spacing[1],
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  searchIcon: {
    position: 'absolute',
    left: theme.spacing[3],
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    paddingLeft: theme.spacing[9],
  },
  list: {
    maxHeight: 380,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    borderRadius: theme.borderRadius.lg,
  },
  optionActive: {
    backgroundColor: theme.colors.mint[50],
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: theme.fontSize.base,
    color: theme.colors.ink[700],
  },
  optionLabelActive: {
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  optionHint: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  noOptions: {
    padding: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
  },
  chipGroup: {
    flexDirection: 'row',
    gap: theme.spacing[1],
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.lineSoft,
    padding: theme.spacing[1],
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[1.5],
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing[2],
  },
  chipActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.xs,
  },
  chipLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[500],
  },
  chipLabelActive: {
    color: theme.colors.ink[900],
  },
});
