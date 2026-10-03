import React, { useCallback, useEffect, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useAppNavigation } from '../../navigation/NavigationContext';
import { normalizeRole } from '../../navigation/navItems';
import {
  NOTIFICATIONS_CHANGED_EVENT,
  fetchUnreadCount,
  onNotificationsChanged,
} from '../../api/notifications';
import { fetchAnnouncements, type Announcement } from '../../api/announcements';
import { searchStudents, type Student } from '../../api/students';
import type { RouteId } from '../../navigation/types';
import { commonStyles, theme } from '../../theme';
import { Icon } from '../Icon';
import { Modal } from '../common/Modal';
import { initials } from '../../lib/format';

/** Staff-only search covers the student roster; learners search announcements. */
function roleCanSearchStudents(role: string | undefined | null): boolean {
  const normalized = normalizeRole(role);
  return normalized === 'Admin' || normalized === 'Teacher';
}

export function TopBar() {
  const { user, signOut } = useAuth();
  const { navigate, openDrawer } = useAppNavigation();
  const insets = useSafeAreaInsets();

  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const loadUnreadCount = useCallback(async () => {
    try {
      const data = await fetchUnreadCount();
      setUnreadCount(data?.UnreadCount ?? 0);
    } catch {
      /* the badge is decorative; a failure must not disturb the shell */
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
    const unsubscribe = onNotificationsChanged(loadUnreadCount);
    return unsubscribe;
  }, [loadUnreadCount, NOTIFICATIONS_CHANGED_EVENT]);

  return (
    <>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.row}>
          <Pressable
            onPress={openDrawer}
            accessibilityRole="button"
            accessibilityLabel="Open navigation menu"
            style={styles.iconButton}
          >
            <Icon name="menu" size={20} color={theme.colors.ink[600]} />
          </Pressable>

          <Pressable
            onPress={() => setSearchOpen(true)}
            accessibilityRole="search"
            accessibilityLabel="Search students, staff, classes"
            style={styles.searchField}
          >
            <Icon name="search" size={15} color={theme.colors.ink[400]} />
            <Text style={styles.searchPlaceholder} numberOfLines={1}>
              Search students, staff, classes…
            </Text>
          </Pressable>

          <Pressable
            onPress={() => navigate('communicate')}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.iconButton}
          >
            <Icon
              name="bell"
              size={19}
              color={unreadCount > 0 ? theme.colors.mint[600] : theme.colors.ink[500]}
            />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => navigate('profile')}
            accessibilityRole="button"
            accessibilityLabel="My profile"
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials(user?.username)}</Text>
          </Pressable>

          <Pressable
            onPress={() => setMenuOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="User menu"
            style={styles.chevronButton}
          >
            <Icon name="chevronDown" size={14} color={theme.colors.ink[400]} />
          </Pressable>
        </View>

        {menuOpen ? (
          <View style={styles.dropdown}>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                navigate('profile');
              }}
              style={styles.dropdownItem}
            >
              <Icon name="profile" size={16} color={theme.colors.ink[600]} />
              <Text style={styles.dropdownText}>My Profile</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setMenuOpen(false);
                void signOut();
              }}
              style={[styles.dropdownItem, styles.dropdownItemSeparated]}
            >
              <Icon name="logout" size={16} color={theme.colors.rose[600]} />
              <Text style={[styles.dropdownText, styles.dropdownTextDanger]}>Log out</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* Closes the user menu when the user taps anywhere else. */}
      {menuOpen ? (
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
      ) : null}

      <GlobalSearch
        visible={searchOpen}
        role={user?.role}
        onClose={() => {
          setSearchOpen(false);
          Keyboard.dismiss();
        }}
      />
    </>
  );
}

/**
 * Search sheet behind the top-bar field. Mirrors a real backend read rather than
 * a decorative input: staff query the student roster, everyone can match
 * announcements they are allowed to see.
 *
 * Results are actionable — a tap closes the sheet and opens the owning page.
 */
function GlobalSearch({
  visible,
  role,
  onClose,
}: {
  visible: boolean;
  role: string | undefined;
  onClose: () => void;
}) {
  const { navigate, closeDrawer } = useAppNavigation();
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSearchStudents = roleCanSearchStudents(role);

  /** Closes the sheet, then opens the page that owns the tapped result. */
  const open = (id: RouteId) => {
    onClose();
    closeDrawer();
    navigate(id);
  };

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setStudents([]);
      setAnnouncements([]);
      setError(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const handle = setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length < 2) {
        if (!cancelled) {
          setStudents([]);
          setAnnouncements([]);
        }
        return;
      }

      setSearching(true);
      setError(null);

      try {
        const [studentHits, allAnnouncements] = await Promise.all([
          canSearchStudents ? searchStudents({ query: trimmed }) : Promise.resolve([]),
          fetchAnnouncements(),
        ]);

        if (cancelled) return;

        const needle = trimmed.toLowerCase();
        setStudents(studentHits.slice(0, 12));
        setAnnouncements(
          allAnnouncements
            .filter(
              (item) =>
                item.Title.toLowerCase().includes(needle) ||
                item.Content.toLowerCase().includes(needle),
            )
            .slice(0, 8),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Search failed.');
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, visible, canSearchStudents]);

  const hasQuery = query.trim().length >= 2;
  const hasResults = students.length > 0 || announcements.length > 0;

  return (
    <Modal visible={visible} onClose={onClose} title="Search" subtitle="Students, staff and announcements">
      <TextInput
        value={query}
        onChangeText={setQuery}
        autoFocus
        placeholder="Type at least 2 characters…"
        placeholderTextColor={theme.colors.ink[400]}
        style={commonStyles.input}
        returnKeyType="search"
      />

      {!canSearchStudents ? (
        <Text style={styles.searchHint}>
          Student records are visible to staff accounts; showing announcement matches.
        </Text>
      ) : null}

      {error ? <Text style={styles.searchError}>{error}</Text> : null}

      <ScrollView style={styles.results} keyboardShouldPersistTaps="handled">
        {searching ? <Text style={styles.searchHint}>Searching…</Text> : null}

        {!searching && hasQuery && !hasResults ? (
          <Text style={styles.searchHint}>No matches found.</Text>
        ) : null}

        {students.length > 0 ? (
          <>
            <Text style={styles.resultHeading}>Students</Text>
            {students.map((student) => (
              <Pressable
                key={student.Id}
                onPress={() => open('students')}
                accessibilityRole="button"
                accessibilityLabel={`Open student list for ${student.Username}`}
                style={styles.resultRow}
              >
                <Icon name="student" size={16} color={theme.colors.ink[400]} />
                <View style={styles.resultText}>
                  <Text style={styles.resultTitle}>{student.Username}</Text>
                  <Text style={styles.resultMeta}>
                    Roll {student.RollNumber}
                    {student.ClassName ? ` · ${student.ClassName}` : ''}
                    {student.SectionName ? ` (${student.SectionName})` : ''}
                  </Text>
                </View>
                <Icon name="chevronRight" size={15} color={theme.colors.ink[400]} />
              </Pressable>
            ))}
          </>
        ) : null}

        {announcements.length > 0 ? (
          <>
            <Text style={styles.resultHeading}>Announcements</Text>
            {announcements.map((item) => (
              <Pressable
                key={item.Id}
                onPress={() => open('communicate')}
                accessibilityRole="button"
                accessibilityLabel={`Open announcement ${item.Title}`}
                style={styles.resultRow}
              >
                <Icon name="megaphone" size={16} color={theme.colors.ink[400]} />
                <View style={styles.resultText}>
                  <Text style={styles.resultTitle}>{item.Title}</Text>
                  <Text style={styles.resultMeta} numberOfLines={1}>
                    {item.Content}
                  </Text>
                </View>
                <Icon name="chevronRight" size={15} color={theme.colors.ink[400]} />
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Modal>
  );
}

const HEADER_HEIGHT = 60;

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
    zIndex: 20,
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.lineSoft,
    paddingHorizontal: theme.spacing[3],
    height: 38,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: theme.fontSize.base,
    color: theme.colors.ink[400],
  },
  badge: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 16,
    height: 16,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.mint[500],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing[1],
  },
  badgeText: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.white,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.mint[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.mint[600],
  },
  chevronButton: {
    width: 26,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdown: {
    position: 'absolute',
    right: theme.spacing[4],
    top: '100%',
    marginTop: theme.spacing[2],
    width: 176,
    borderRadius: theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[3.5],
    paddingVertical: theme.spacing[2.5],
  },
  dropdownItemSeparated: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.line,
  },
  dropdownText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[700],
  },
  dropdownTextDanger: {
    color: theme.colors.rose[600],
  },
  searchHint: {
    marginTop: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
  },
  searchError: {
    marginTop: theme.spacing[3],
    fontSize: theme.fontSize.sm,
    color: theme.colors.rose[600],
  },
  results: {
    marginTop: theme.spacing[3],
    maxHeight: 320,
  },
  resultHeading: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: theme.colors.ink[500],
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[1],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2.5],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  resultText: {
    flex: 1,
  },
  resultTitle: {
    flex: 1,
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.ink[900],
  },
  resultMeta: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
});
