import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  EVENT_STATUSES,
  createEvent,
  deleteEvent,
  eventStatusTone,
  fetchEventParticipants,
  fetchEvents,
  formatEventDate,
  removeParticipant,
  setRsvp,
  toIsoInstant,
  toLocalInput,
  updateEvent,
  type EventItem,
  type EventParticipant,
  type EventStatus,
} from '../../api/events';
import { useAsync } from '../../hooks/useAsync';
import { useAuth } from '../../context/AuthContext';
import { normalizeRole } from '../../navigation/navItems';
import { PageHeader } from '../../components/layout/PageHeader';
import { Screen } from '../../components/common/Screen';
import { Banner } from '../../components/common/Banner';
import { Badge } from '../../components/common/Badge';
import { Button, IconButton } from '../../components/common/Button';
import { ConfirmModal, Modal } from '../../components/common/Modal';
import { Input, TextArea } from '../../components/common/Input';
import { Select } from '../../components/common/Select';
import { Avatar, CountPill, ListPanel } from '../../components/common/ListPanel';
import { Icon } from '../../components/Icon';
import { initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

/** The three answers a user picks; "Invited" is staff-recorded, never self-selected. */
const RSVPS: EventStatus[] = ['Attending', 'Not Attending', 'Maybe'];

/**
 * Events are readable by every role. Staff create and cancel them, and everyone
 * records their own response. The API enforces the write rules independently of
 * what is rendered here.
 */
export function EventsScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'Admin';
  const isStaff = isAdmin || role === 'Teacher';

  const [feedback, setFeedback] = useState<Feedback>(null);
  /** `"new"` opens the create form, an event opens it on that row, null closes. */
  const [editing, setEditing] = useState<EventItem | 'new' | null>(null);
  const [viewingParticipants, setViewingParticipants] = useState<EventItem | null>(null);
  const [deleting, setDeleting] = useState<EventItem | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const eventsQuery = useAsync((signal) => fetchEvents(signal), []);
  const events = useMemo(() => eventsQuery.data ?? [], [eventsQuery.data]);

  const refresh = () => void eventsQuery.refetch();

  const run = async (id: number, action: () => Promise<string>) => {
    setBusyId(id);
    setFeedback(null);
    try {
      setFeedback({ tone: 'success', message: await action() });
      refresh();
    } catch (err) {
      setFeedback({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'Could not update the event.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleRsvp = (event: EventItem, status: EventStatus) =>
    run(event.Id, async () => {
      const res = await setRsvp(event.Id, status);
      return `${event.Title}: ${res.Message}`;
    });

  const confirmDelete = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    await run(target.Id, async () => {
      const res = await deleteEvent(target.Id);
      if (editing !== null && editing !== 'new' && editing.Id === target.Id) {
        setEditing(null);
      }
      return res.Message;
    });
  };

  return (
    <Screen onRefresh={refresh} refreshing={eventsQuery.loading && !!eventsQuery.data}>
      <PageHeader
        title="Events"
        subtitle="School dates, trips and assemblies. Let the organiser know if you are coming."
        action={
          isAdmin ? (
            <Button icon="plus" variant="ghost" onPress={() => setEditing('new')}>
              New event
            </Button>
          ) : undefined
        }
      />

      {feedback ? <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} /> : null}

      <ListPanel
        title="Upcoming Events"
        subtitle="Sorted by date, soonest first."
        action={<CountPill count={events.length} label="events" />}
        items={events}
        keyExtractor={(item) => String(item.Id)}
        loading={eventsQuery.loading && !eventsQuery.data}
        error={eventsQuery.error}
        status={eventsQuery.status}
        onRetry={refresh}
        onSignIn={() => void signOut()}
        emptyTitle="No events scheduled"
        emptyMessage="When the school schedules something, it will show up here."
        emptyIcon="events"
        renderItem={(item) => (
          <View style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <View style={styles.eventHeaderText}>
                <Text style={styles.eventTitle}>{item.Title}</Text>
                <Text style={styles.eventDate}>{formatEventDate(item.EventDate)}</Text>
              </View>

              {isAdmin ? (
                <View style={styles.eventActions}>
                  <IconButton
                    icon="edit"
                    label="Edit event"
                    size={30}
                    iconSize={14}
                    onPress={() => setEditing(item)}
                  />
                  <IconButton
                    icon="trash"
                    label="Delete event"
                    size={30}
                    iconSize={14}
                    variant="danger"
                    onPress={() => setDeleting(item)}
                  />
                </View>
              ) : null}
            </View>

            {item.Description ? <Text style={styles.eventDescription}>{item.Description}</Text> : null}

            <View style={styles.eventMetaRow}>
              {item.Location ? (
                <View style={styles.metaItem}>
                  <Icon name="mapPin" size={13} color={theme.colors.ink[500]} />
                  <Text style={styles.eventMeta}>{item.Location}</Text>
                </View>
              ) : null}

              <View style={styles.metaItem}>
                <Icon name="users" size={13} color={theme.colors.ink[500]} />
                <Text style={styles.eventMeta}>
                  {item.ParticipantCount} responded
                </Text>
              </View>

              {item.MyStatus ? (
                <Badge label={item.MyStatus} tone={eventStatusTone(item.MyStatus)} />
              ) : (
                <Badge label="Awaiting your reply" tone="neutral" />
              )}
            </View>

            <View style={styles.footerRow}>
              <View style={styles.rsvpGroup}>
                {RSVPS.map((status) => {
                  const active = item.MyStatus === status;
                  return (
                    <Button
                      key={status}
                      variant={active ? 'mint' : 'ghost'}
                      onPress={() => void handleRsvp(item, status)}
                      disabled={busyId === item.Id}
                      style={styles.rsvpButton}
                    >
                      {status}
                    </Button>
                  );
                })}
              </View>

              {isStaff ? (
                <IconButton
                  icon="users"
                  label="View participants"
                  size={34}
                  iconSize={16}
                  onPress={() => setViewingParticipants(item)}
                />
              ) : null}
            </View>
          </View>
        )}
      />

      {editing !== null && isAdmin ? (
        <EventFormModal
          event={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setFeedback({ tone: 'success', message: msg });
            refresh();
          }}
        />
      ) : null}

      {viewingParticipants ? (
        <ParticipantsModal
          event={viewingParticipants}
          isStaff={isStaff}
          currentUserId={user?.userId ?? 0}
          onClose={() => setViewingParticipants(null)}
          onChanged={refresh}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      ) : null}

      <ConfirmModal
        visible={deleting !== null}
        title="Delete event"
        message={`Delete "${deleting?.Title ?? ''}"? Anyone who responded will lose their reply. This cannot be undone.`}
        confirmLabel="Delete event"
        busy={busyId !== null}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}

/* ------------------------------------------------ Event Form Modal */
function EventFormModal({
  event,
  onClose,
  onSaved,
}: {
  event: EventItem | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const isEdit = event !== null;
  const [title, setTitle] = useState(event?.Title ?? '');
  const [description, setDescription] = useState(event?.Description ?? '');
  const [eventDate, setEventDate] = useState(
    event ? toLocalInput(event.EventDate) || `${todayInput()}T09:00` : `${todayInput()}T09:00`,
  );
  const [location, setLocation] = useState(event?.Location ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError('Event title is required.');
      return;
    }
    if (!eventDate.trim()) {
      setError('Event date is required.');
      return;
    }
    // The picker holds a local wall-clock string; the API stores a UTC instant.
    const instant = new Date(eventDate.trim());
    if (Number.isNaN(instant.getTime())) {
      setError('Use the date format YYYY-MM-DDTHH:mm (e.g. 2026-03-12T09:00).');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = {
        Title: title.trim(),
        Description: description.trim() || null,
        EventDate: toIsoInstant(eventDate.trim()),
        Location: location.trim() || null,
      };
      const res = isEdit
        ? await updateEvent(event.Id, payload)
        : await createEvent(payload);
      onSaved(res.Message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the event.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible
      onClose={onClose}
      title={isEdit ? 'Edit Event' : 'New Event'}
      subtitle={isEdit ? event.Title : 'Add a school date, trip or assembly'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy}>
            {isEdit ? 'Save Changes' : 'Create Event'}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <Input
        label="Title"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Annual Sports Day"
        autoFocus
      />

      <Input
        label="Date & Time"
        value={eventDate}
        onChangeText={setEventDate}
        placeholder="YYYY-MM-DDTHH:mm"
        hint="Your local time, e.g. 2026-03-12T09:00"
        containerStyle={styles.modalSpacing}
      />

      <Input
        label="Location (optional)"
        value={location}
        onChangeText={setLocation}
        placeholder="e.g. Main Ground"
        containerStyle={styles.modalSpacing}
      />

      <TextArea
        label="Description (optional)"
        value={description}
        onChangeText={setDescription}
        placeholder="Add the details participants need..."
        containerStyle={styles.modalSpacing}
      />
    </Modal>
  );
}

/* ------------------------------------------ Participants Modal */
function ParticipantsModal({
  event,
  isStaff,
  currentUserId,
  onClose,
  onChanged,
  onError,
}: {
  event: EventItem;
  isStaff: boolean;
  currentUserId: number;
  onClose: () => void;
  onChanged: () => void;
  onError: (msg: string) => void;
}) {
  const participantsQuery = useAsync(
    (signal) => fetchEventParticipants(event.Id, signal),
    [event.Id],
  );
  const participants = useMemo(
    () => participantsQuery.data ?? [],
    [participantsQuery.data],
  );
  const [removing, setRemoving] = useState<number | null>(null);

  // Staff may clear anyone's response; everyone else only their own.
  const canRemove = (participant: EventParticipant) =>
    isStaff || participant.UserId === currentUserId;

  const handleRemove = async (participant: EventParticipant) => {
    setRemoving(participant.UserId);
    try {
      await removeParticipant(event.Id, participant.UserId);
      onChanged();
      void participantsQuery.refetch();
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not remove the participant.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Modal visible onClose={onClose} title="Participants" subtitle={event.Title}>
      {participantsQuery.loading ? (
        <Text style={styles.participantsHint}>Loading participants…</Text>
      ) : participantsQuery.error ? (
        <Banner
          tone="error"
          message={
            participantsQuery.error instanceof ApiError
              ? participantsQuery.error.message
              : 'Could not load participants.'
          }
        />
      ) : participants.length === 0 ? (
        <Text style={styles.participantsHint}>Nobody has responded yet.</Text>
      ) : (
        <View style={styles.participantList}>
          {participants.map((participant) => (
            <View key={participant.UserId} style={styles.participantRow}>
              <Avatar text={initials(participant.Username)} tone="mint" />
              <View style={styles.participantText}>
                <Text style={styles.participantName}>{participant.Username}</Text>
                <Badge
                  label={participant.Status}
                  tone={eventStatusTone(participant.Status)}
                  style={styles.participantBadge}
                />
              </View>
              {canRemove(participant) ? (
                <IconButton
                  icon="trash"
                  label={`Remove ${participant.Username}`}
                  size={30}
                  iconSize={14}
                  variant="danger"
                  disabled={removing === participant.UserId}
                  onPress={() => void handleRemove(participant)}
                />
              ) : null}
            </View>
          ))}
        </View>
      )}
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
    marginTop: theme.spacing[4],
  },
  eventCard: {
    paddingVertical: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
  },
  eventHeaderText: {
    flex: 1,
  },
  eventActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  eventTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  eventDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mint[700],
    fontWeight: theme.fontWeight.semibold,
    marginTop: 2,
  },
  eventDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[700],
    lineHeight: 19,
    marginTop: theme.spacing[2],
  },
  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[3],
    marginTop: theme.spacing[3],
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  eventMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.ink[500],
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing[2],
    marginTop: theme.spacing[3],
  },
  rsvpGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[1.5],
    flex: 1,
  },
  rsvpButton: {
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1.5],
  },
  participantsHint: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
    paddingVertical: theme.spacing[4],
  },
  participantList: {
    gap: theme.spacing[1],
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
  },
  participantText: {
    flex: 1,
  },
  participantName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  participantBadge: {
    marginTop: 3,
  },
});