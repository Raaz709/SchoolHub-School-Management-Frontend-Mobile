import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  createAnnouncement,
  deleteAnnouncement,
  fetchAnnouncements,
  updateAnnouncement,
  TARGET_ROLES,
  type Announcement,
  type TargetRole,
} from '../../api/announcements';
import {
  deleteNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type Notification,
} from '../../api/notifications';
import { fetchClasses, type ClassItem } from '../../api/academic';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge, type BadgeTone } from '../../components/common/Badge';
import { Button, IconButton } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { Input } from '../../components/common/Input';
import { ChipGroup, Select } from '../../components/common/Select';
import { Avatar, CountPill, ListPanel } from '../../components/common/ListPanel';
import { Icon } from '../../components/Icon';
import { formatDate } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function audienceTone(role: TargetRole): BadgeTone {
  switch (role) {
    case 'Student':
      return 'blue';
    case 'Parent':
      return 'amber';
    case 'Teacher':
      return 'violet';
    case 'Admin':
      return 'rose';
    default:
      return 'mint';
  }
}

export function CommunicateScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isStaff = role === 'Admin' || role === 'Teacher';

  const [activeTab, setActiveTab] = useState<'announcements' | 'notifications'>('announcements');
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | 'new' | null>(null);

  // Queries
  const announcementsQuery = useAsync((signal) => fetchAnnouncements(signal), []);
  const notificationsQuery = useAsync((signal) => fetchNotifications(signal), []);
  const classesQuery = useAsync(
    (signal) => (isStaff ? fetchClasses(signal) : Promise.resolve([])),
    [isStaff],
  );

  const announcements = useMemo(() => announcementsQuery.data ?? [], [announcementsQuery.data]);
  const notifications = useMemo(() => notificationsQuery.data ?? [], [notificationsQuery.data]);
  const classes = useMemo(() => classesQuery.data ?? [], [classesQuery.data]);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.IsRead).length, [notifications]);

  const refreshAll = () => {
    void announcementsQuery.refetch();
    void notificationsQuery.refetch();
    if (isStaff) void classesQuery.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  const handleDeleteAnnouncement = (item: Announcement) => {
    Alert.alert(
      'Delete Announcement',
      `Delete announcement "${item.Title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setFeedback(null);
            try {
              const res = await deleteAnnouncement(item.Id);
              setFeedback({ tone: 'success', message: res.Message });
              void announcementsQuery.refetch();
            } catch (err) {
              setFeedback({
                tone: 'error',
                message: err instanceof ApiError ? err.message : 'Could not delete announcement.',
              });
            }
          },
        },
      ],
    );
  };

  const handleMarkAllRead = async () => {
    setFeedback(null);
    try {
      const res = await markAllNotificationsRead();
      setFeedback({ tone: 'success', message: res.Message });
      void notificationsQuery.refetch();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Could not mark all as read.',
      });
    }
  };

  const handleMarkRead = async (item: Notification) => {
    if (item.IsRead) return;
    try {
      await markNotificationRead(item.Id);
      void notificationsQuery.refetch();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Could not update notification.',
      });
    }
  };

  const handleDeleteNotification = async (item: Notification) => {
    try {
      const res = await deleteNotification(item.Id);
      setFeedback({ tone: 'success', message: res.Message });
      void notificationsQuery.refetch();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Could not delete notification.',
      });
    }
  };

  return (
    <Screen onRefresh={refreshAll} refreshing={announcementsQuery.loading && !!announcementsQuery.data}>
      <PageHeader
        title="Communicate"
        subtitle="School broadcast notices and your personal notification inbox."
        action={
          isStaff ? (
            <Button icon="plus" onPress={() => setEditingAnnouncement('new')}>
              New Notice
            </Button>
          ) : undefined
        }
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      <ChipGroup
        options={[
          { value: 'announcements', label: `Announcements (${announcements.length})`, icon: 'megaphone' },
          {
            value: 'notifications',
            label: unreadCount > 0 ? `Notifications (${unreadCount} new)` : 'Notifications',
            icon: 'bell',
          },
        ]}
        value={activeTab}
        onChange={(val) => setActiveTab(val as 'announcements' | 'notifications')}
        style={styles.tabs}
      />

      {/* ANNOUNCEMENTS TAB */}
      {activeTab === 'announcements' && (
        <ListPanel
          title="Broadcast Announcements"
          subtitle="School-wide and targeted communications."
          action={<CountPill count={announcements.length} label="notices" />}
          items={announcements}
          keyExtractor={(item) => String(item.Id)}
          loading={announcementsQuery.loading && !announcementsQuery.data}
          error={announcementsQuery.error}
          status={announcementsQuery.status}
          onRetry={refreshAll}
          onSignIn={onSignIn}
          emptyMessage="No announcements for you right now."
          emptyIcon="megaphone"
          renderItem={(item) => (
            <View style={styles.announcementCard}>
              <View style={styles.announcementTop}>
                <View style={styles.announcementBadges}>
                  <Badge
                    label={item.TargetRole === 'All' ? 'Everyone' : item.TargetRole}
                    tone={audienceTone(item.TargetRole)}
                  />
                  {item.ClassName ? (
                    <Badge label={item.ClassName} tone="neutral" />
                  ) : null}
                </View>
                {isStaff ? (
                  <View style={styles.announcementActions}>
                    <IconButton
                      icon="edit"
                      label="Edit announcement"
                      size={30}
                      iconSize={14}
                      onPress={() => setEditingAnnouncement(item)}
                    />
                    <IconButton
                      icon="trash"
                      label="Delete announcement"
                      size={30}
                      iconSize={14}
                      variant="danger"
                      onPress={() => handleDeleteAnnouncement(item)}
                    />
                  </View>
                ) : null}
              </View>

              <Text style={styles.announcementTitle}>{item.Title}</Text>
              <Text style={styles.announcementContent}>{item.Content}</Text>
              <Text style={styles.announcementMeta}>
                {item.AuthorName ? `${item.AuthorName}  ·  ` : ''}
                {formatDateTime(item.CreatedAt)}
              </Text>
            </View>
          )}
        />
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <ListPanel
          title="Personal Notifications"
          subtitle="Direct system alerts and updates for your account."
          action={
            unreadCount > 0 ? (
              <Button variant="ghost" icon="check" onPress={() => void handleMarkAllRead()}>
                Mark All Read
              </Button>
            ) : (
              <CountPill count={notifications.length} label="alerts" />
            )
          }
          items={notifications}
          keyExtractor={(item) => String(item.Id)}
          loading={notificationsQuery.loading && !notificationsQuery.data}
          error={notificationsQuery.error}
          status={notificationsQuery.status}
          onRetry={refreshAll}
          onSignIn={onSignIn}
          emptyMessage="You are all caught up! No notifications in your inbox."
          emptyIcon="bell"
          renderItem={(item) => (
            <View style={[styles.notificationCard, !item.IsRead && styles.unreadNotificationCard]}>
              <View style={styles.notificationHeader}>
                <View
                  style={[
                    styles.unreadIndicator,
                    item.IsRead ? styles.indicatorRead : styles.indicatorUnread,
                  ]}
                />
                <View style={styles.notificationInfo}>
                  <Text style={[styles.notificationTitle, !item.IsRead && styles.unreadTitle]}>
                    {item.Title}
                  </Text>
                  <Text style={styles.notificationMessage}>{item.Message}</Text>
                  <Text style={styles.notificationDate}>{formatDateTime(item.CreatedAt)}</Text>
                </View>

                <View style={styles.notificationActions}>
                  {!item.IsRead ? (
                    <IconButton
                      icon="check"
                      label="Mark as read"
                      size={30}
                      iconSize={14}
                      variant="mint"
                      onPress={() => void handleMarkRead(item)}
                    />
                  ) : null}
                  <IconButton
                    icon="trash"
                    label="Delete"
                    size={30}
                    iconSize={14}
                    variant="danger"
                    onPress={() => void handleDeleteNotification(item)}
                  />
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Compose Announcement Modal */}
      {editingAnnouncement !== null ? (
        <AnnouncementFormModal
          announcement={editingAnnouncement === 'new' ? null : editingAnnouncement}
          classes={classes}
          onClose={() => setEditingAnnouncement(null)}
          onSaved={(msg) => {
            setEditingAnnouncement(null);
            setFeedback({ tone: 'success', message: msg });
            void announcementsQuery.refetch();
          }}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------ Announcement Form Modal */
function AnnouncementFormModal({
  announcement,
  classes,
  onClose,
  onSaved,
  onError,
}: {
  announcement: Announcement | null;
  classes: ClassItem[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const isEdit = announcement !== null;
  const [title, setTitle] = useState(announcement?.Title ?? '');
  const [content, setContent] = useState(announcement?.Content ?? '');
  const [targetRole, setTargetRole] = useState<TargetRole>(announcement?.TargetRole ?? 'All');
  const [classId, setClassId] = useState<number | null>(announcement?.ClassId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!content.trim()) {
      setError('Content message is required.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = {
        Title: title.trim(),
        Content: content.trim(),
        TargetRole: targetRole,
        ClassId: classId,
      };

      const res = isEdit
        ? await updateAnnouncement(announcement.Id, payload)
        : await createAnnouncement(payload);

      onSaved(res.Message);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save announcement.';
      setError(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onClose={onClose}
      title={isEdit ? 'Edit Announcement' : 'New Announcement'}
      subtitle={isEdit ? announcement.Title : 'Broadcast to students, staff, or parents'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy}>
            {isEdit ? 'Save Changes' : 'Publish Notice'}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Early Dismissal on Friday"
        autoFocus
      />

      <Select
        label="Target Audience"
        value={targetRole}
        options={TARGET_ROLES.map((r) => ({
          value: r,
          label: r === 'All' ? 'Everyone (All Users)' : `${r}s only`,
        }))}
        onChange={(val) => setTargetRole(val ?? 'All')}
        placeholder="Select audience"
        title="Target Audience"
        style={styles.modalSpacing}
      />

      <Select
        label="Limit to Class (optional)"
        value={classId}
        options={classes.map((c) => ({ value: c.Id, label: c.Name }))}
        onChange={setClassId}
        placeholder="All Classes (No Class Filter)"
        clearLabel="All Classes (No Class Filter)"
        title="Select Class"
        style={styles.modalSpacing}
      />

      <Input
        label="Announcement Message"
        value={content}
        onChangeText={setContent}
        multiline
        placeholder="Enter announcement details..."
        containerStyle={styles.modalSpacing}
      />
    </Modal>
  );
}

/* ------------------------------------------------ Styles */
const styles = StyleSheet.create({
  banner: {
    marginBottom: theme.spacing[4],
  },
  modalBanner: {
    marginBottom: theme.spacing[3],
  },
  modalSpacing: {
    marginTop: theme.spacing[2],
  },
  tabs: {
    marginBottom: theme.spacing[4],
  },
  announcementCard: {
    paddingVertical: theme.spacing[3.5],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  announcementTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing[2],
  },
  announcementBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  announcementActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  announcementTitle: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
    marginBottom: 4,
  },
  announcementContent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[700],
    lineHeight: 20,
    marginBottom: 6,
  },
  announcementMeta: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
  },
  notificationCard: {
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  unreadNotificationCard: {
    backgroundColor: theme.colors.mint[50],
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing[2.5],
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  indicatorUnread: {
    backgroundColor: theme.colors.mint[500],
  },
  indicatorRead: {
    backgroundColor: theme.colors.line,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  unreadTitle: {
    fontWeight: theme.fontWeight.bold,
  },
  notificationMessage: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[600],
    marginTop: 2,
    lineHeight: 18,
  },
  notificationDate: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
    marginTop: 4,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
});
