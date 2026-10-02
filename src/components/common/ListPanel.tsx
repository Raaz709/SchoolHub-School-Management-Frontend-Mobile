import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { commonStyles, theme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Button } from './Button';
import { EmptyPanel } from './EmptyPanel';
import { ErrorState } from './ErrorState';
import { Skeleton } from './Skeleton';

interface ListPanelProps<T> {
  title?: string;
  subtitle?: string;
  /** Right-hand header slot: count pill, "New" button, etc. */
  action?: React.ReactNode;
  /** Filter/search controls rendered above the list inside the card. */
  toolbar?: React.ReactNode;
  items: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  status?: number | null;
  onRetry?: () => void;
  onSignIn?: () => void;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyIcon?: IconName;
  emptyAction?: React.ReactNode;
  /** Skeleton rows to draw while loading. */
  skeletonRows?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The one list surface every module uses: card shell, toolbar, loading skeleton,
 * error, empty state and rows. Keeps each screen to its actual data logic.
 */
export function ListPanel<T>({
  title,
  subtitle,
  action,
  toolbar,
  items,
  keyExtractor,
  renderItem,
  loading = false,
  error = null,
  status = null,
  onRetry,
  onSignIn,
  emptyMessage = 'No records found.',
  emptyTitle,
  emptyIcon = 'inbox',
  emptyAction,
  skeletonRows = 4,
  style,
}: ListPanelProps<T>) {
  const showEmpty = !loading && !error && items.length === 0;

  return (
    <View style={[commonStyles.card, style]}>
      {title ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={commonStyles.sectionTitle}>{title}</Text>
            {subtitle ? <Text style={commonStyles.sectionSubtitle}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}

      {toolbar ? <View style={styles.toolbar}>{toolbar}</View> : null}

      {loading ? (
        <View style={styles.skeletons}>
          {Array.from({ length: skeletonRows }).map((_, index) => (
            <Skeleton key={index} height={44} />
          ))}
        </View>
      ) : error ? (
        <View style={styles.padded}>
          <ErrorState
            message={error.message}
            status={status}
            onRetry={onRetry}
            onSignIn={onSignIn}
          />
        </View>
      ) : showEmpty ? (
        <View style={styles.padded}>
          <EmptyPanel
            title={emptyTitle}
            message={emptyMessage}
            icon={emptyIcon}
            action={emptyAction}
            compact
          />
        </View>
      ) : (
        <View>
          {items.map((item, index) => (
            <View key={keyExtractor(item, index)}>{renderItem(item, index)}</View>
          ))}
        </View>
      )}
    </View>
  );
}

/** `label · value` chip row under a list item's primary line. */
export function MetaLine({ parts }: { parts: (string | null | undefined)[] }) {
  const text = parts.filter(Boolean).join('  ·  ');
  if (!text) return null;
  return (
    <Text style={styles.meta} numberOfLines={1}>
      {text}
    </Text>
  );
}

interface ListRowProps {
  leading?: React.ReactNode;
  title: string;
  meta?: string;
  /** Free-form right-hand content: a badge, a value, an actions menu. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  selected?: boolean;
  /** Removes the divider — the parent draws it between rows. */
  divided?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** A single record row: leading avatar, two lines of text, trailing content. */
export function ListRow({
  leading,
  title,
  meta,
  trailing,
  onPress,
  selected = false,
  divided = true,
  style,
}: ListRowProps) {
  const content = (
    <View style={[styles.row, divided && styles.rowDivided, selected && styles.rowSelected, style]}>
      {leading}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {content}
    </Pressable>
  );
}

/** Circular initials tile used as the leading slot of person rows. */
export function Avatar({ text, tone = 'mint' }: { text: string; tone?: 'mint' | 'blue' | 'violet' }) {
  const palette = {
    mint: { bg: theme.colors.mint[100], fg: theme.colors.mint[600] },
    blue: { bg: theme.colors.blue[100], fg: theme.colors.blue[500] },
    violet: { bg: theme.colors.violet[100], fg: theme.colors.violet[500] },
  }[tone];

  return (
    <View style={[styles.avatar, { backgroundColor: palette.bg }]}>
      <Text style={[styles.avatarText, { color: palette.fg }]}>{text}</Text>
    </View>
  );
}

/** Small "N records" pill for list headers. */
export function CountPill({ count, label = 'records' }: { count: number; label?: string }) {
  return (
    <View style={styles.countPill}>
      <Text style={styles.countText}>
        {count} {label}
      </Text>
    </View>
  );
}

/** Inline busy indicator for actions that refresh a panel. */
export function ListBusy() {
  return (
    <View style={styles.busy}>
      <ActivityIndicator size="small" color={theme.colors.mint[500]} />
    </View>
  );
}

export { Button as ListButton };

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  headerText: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.lineSoft,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  skeletons: {
    padding: theme.spacing[4],
    gap: theme.spacing[3],
  },
  padded: {
    padding: theme.spacing[4],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
  },
  rowDivided: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  rowSelected: {
    backgroundColor: theme.colors.mint[50],
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  meta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.bold,
  },
  countPill: {
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.lineSoft,
    paddingHorizontal: theme.spacing[2.5],
    paddingVertical: theme.spacing[1],
  },
  countText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[700],
  },
  busy: {
    padding: theme.spacing[2],
  },
});
