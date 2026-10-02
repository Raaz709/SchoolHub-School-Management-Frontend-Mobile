import React, { useCallback, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ApiError } from '../../api/client';
import {
  assignFee,
  createFeeStructure,
  deleteFeeStructure,
  fetchAssignments,
  fetchCollectionSummary,
  fetchFeeStructures,
  fetchPayments,
  recordPayment,
  removeAssignment,
  updateFeeStructure,
  PAYMENT_METHODS,
  type Assignment,
  type CollectionSummary,
  type FeeStatus,
  type FeeStructure,
  type Payment,
} from '../../api/fees';
import { fetchClasses, type ClassItem } from '../../api/academic';
import { fetchStudents, type Student } from '../../api/students';
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
import { Avatar, CountPill, ListPanel, ListRow } from '../../components/common/ListPanel';
import { SearchBar } from '../../components/common/SearchBar';
import { Icon } from '../../components/Icon';
import { formatDate, initials, todayInput } from '../../lib/format';
import { theme } from '../../theme';

type Feedback = { tone: 'success' | 'error'; message: string } | null;

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function feeStatusTone(status: FeeStatus): BadgeTone {
  switch (status) {
    case 'Paid':
      return 'mint';
    case 'Partial':
      return 'amber';
    case 'Overdue':
      return 'rose';
    default:
      return 'neutral';
  }
}

export function FeesScreen() {
  const { user, signOut } = useAuth();
  const role = normalizeRole(user?.role);
  const isAdmin = role === 'Admin';

  const [activeTab, setActiveTab] = useState<'ledger' | 'structures' | 'assign' | 'payments'>('ledger');
  const [feedback, setFeedback] = useState<Feedback>(null);

  // Ledger filters
  const [classFilter, setClassFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Modals
  const [payingAssignment, setPayingAssignment] = useState<Assignment | null>(null);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | 'new' | null>(null);

  // Queries
  const summaryQuery = useAsync((signal) => (isAdmin ? fetchCollectionSummary(signal) : Promise.resolve(null)), [isAdmin]);
  const structuresQuery = useAsync((signal) => (isAdmin ? fetchFeeStructures(signal) : Promise.resolve([])), [isAdmin]);
  const classesQuery = useAsync((signal) => (isAdmin ? fetchClasses(signal) : Promise.resolve([])), [isAdmin]);
  const studentsQuery = useAsync((signal) => (isAdmin ? fetchStudents(signal) : Promise.resolve([])), [isAdmin]);

  const assignmentsFilterKey = `${classFilter ?? ''}:${statusFilter ?? ''}:${search.trim()}`;
  const assignmentsQuery = useAsync(
    (signal) =>
      isAdmin
        ? fetchAssignments(
            {
              classId: classFilter,
              status: statusFilter,
              search: search.trim() || null,
            },
            signal,
          )
        : Promise.resolve([]),
    [isAdmin, assignmentsFilterKey],
  );

  const paymentsQuery = useAsync((signal) => (isAdmin ? fetchPayments(null, signal) : Promise.resolve([])), [isAdmin]);

  const refreshAll = () => {
    void summaryQuery.refetch();
    void structuresQuery.refetch();
    void assignmentsQuery.refetch();
    void paymentsQuery.refetch();
    void classesQuery.refetch();
    void studentsQuery.refetch();
  };

  const onSignIn = () => {
    void signOut();
  };

  if (!isAdmin) {
    return (
      <Screen>
        <PageHeader title="Fees Collection" subtitle="Fee collection is restricted to administrators." />
        <View style={styles.restrictedCard}>
          <Icon name="wallet" size={32} color={theme.colors.ink[400]} />
          <Text style={styles.restrictedTitle}>Access Restricted</Text>
          <Text style={styles.restrictedDesc}>
            Only an administrator can manage fee structures, student fee assignments, and payments.
          </Text>
        </View>
      </Screen>
    );
  }

  const summary = summaryQuery.data;
  const assignments = assignmentsQuery.data ?? [];
  const structures = structuresQuery.data ?? [];
  const classes = classesQuery.data ?? [];
  const students = studentsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const handleRemoveAssignment = (assignment: Assignment) => {
    Alert.alert(
      'Remove Fee Assignment',
      `Remove fee "${assignment.FeeName}" from ${assignment.StudentName}? (Refused if payments have been made)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setFeedback(null);
            try {
              const res = await removeAssignment(assignment.Id);
              setFeedback({ tone: 'success', message: res.Message });
              refreshAll();
            } catch (err) {
              setFeedback({
                tone: 'error',
                message: err instanceof ApiError ? err.message : 'Could not remove fee assignment.',
              });
            }
          },
        },
      ],
    );
  };

  const handleDeleteStructure = (structure: FeeStructure) => {
    Alert.alert(
      'Delete Fee Structure',
      `Delete "${structure.Name}"? (Refused if students have it assigned)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setFeedback(null);
            try {
              const res = await deleteFeeStructure(structure.Id);
              setFeedback({ tone: 'success', message: res.Message });
              refreshAll();
            } catch (err) {
              setFeedback({
                tone: 'error',
                message: err instanceof ApiError ? err.message : 'Could not delete fee structure.',
              });
            }
          },
        },
      ],
    );
  };

  return (
    <Screen onRefresh={refreshAll} refreshing={summaryQuery.loading && !!summaryQuery.data}>
      <PageHeader
        title="Fees Collection"
        subtitle="Define charges, assign fees to classes or students, and record collections."
      />

      {feedback ? (
        <Banner tone={feedback.tone} message={feedback.message} style={styles.banner} />
      ) : null}

      {/* Summary KPI Cards */}
      {summary ? (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Billed</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.ink[900] }]}>
              {formatCurrency(summary.TotalBilled)}
            </Text>
            <Text style={styles.summarySub}>assigned fees</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Collected</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.mint[600] }]}>
              {formatCurrency(summary.TotalCollected)}
            </Text>
            <Text style={styles.summarySub}>received</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Outstanding</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.amber[500] }]}>
              {formatCurrency(summary.TotalOutstanding)}
            </Text>
            <Text style={styles.summarySub}>still owed</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Overdue</Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.rose[600] }]}>
              {formatCurrency(summary.TotalOverdue)}
            </Text>
            <Text style={styles.summarySub}>past due</Text>
          </View>
        </View>
      ) : null}

      {/* Navigation tabs */}
      <ChipGroup
        options={[
          { value: 'ledger', label: 'Ledger', icon: 'receipt' },
          { value: 'structures', label: 'Fee Structures', icon: 'wallet' },
          { value: 'assign', label: 'Assign Fee', icon: 'plus' },
          { value: 'payments', label: 'Payments', icon: 'dollarSign' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
        style={styles.tabs}
      />

      {/* TAB 1: LEDGER */}
      {activeTab === 'ledger' && (
        <>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search by student name or roll number"
            style={styles.searchBar}
          />

          <View style={styles.filterRow}>
            <Select
              label="Class"
              value={classFilter}
              options={classes.map((c) => ({ value: c.Id, label: c.Name }))}
              onChange={setClassFilter}
              placeholder="All classes"
              clearLabel="All classes"
              title="Filter by Class"
              style={styles.filterItem}
            />
            <Select
              label="Status"
              value={statusFilter}
              options={[
                { value: 'Unpaid', label: 'Unpaid' },
                { value: 'Partial', label: 'Partial' },
                { value: 'Overdue', label: 'Overdue' },
                { value: 'Paid', label: 'Paid' },
              ]}
              onChange={setStatusFilter}
              placeholder="All statuses"
              clearLabel="All statuses"
              title="Filter by Status"
              style={styles.filterItem}
            />
          </View>

          <ListPanel
            title="Student Ledger"
            subtitle="View student charges, overdue balances, and record payments."
            action={<CountPill count={assignments.length} label="entries" />}
            items={assignments}
            keyExtractor={(item) => String(item.Id)}
            loading={assignmentsQuery.loading && !assignmentsQuery.data}
            error={assignmentsQuery.error}
            status={assignmentsQuery.status}
            onRetry={refreshAll}
            onSignIn={onSignIn}
            emptyMessage="No fee assignments match the filters."
            emptyIcon="receipt"
            renderItem={(item) => (
              <View style={styles.ledgerRow}>
                <View style={styles.ledgerRowTop}>
                  <Avatar text={initials(item.StudentName)} tone="mint" />
                  <View style={styles.ledgerInfo}>
                    <Text style={styles.studentName}>{item.StudentName}</Text>
                    <Text style={styles.studentMeta}>
                      {item.AdmissionNumber ? `#${item.AdmissionNumber}` : ''}
                      {item.ClassName ? `  ·  ${item.ClassName}` : ''}
                      {`  ·  ${item.FeeName}`}
                    </Text>
                  </View>
                  <Badge label={item.Status} tone={feeStatusTone(item.Status)} />
                </View>

                <View style={styles.ledgerAmounts}>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={styles.amountValue}>{formatCurrency(item.Amount)}</Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Paid</Text>
                    <Text style={[styles.amountValue, { color: theme.colors.mint[600] }]}>
                      {formatCurrency(item.Paid)}
                    </Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Outstanding</Text>
                    <Text
                      style={[
                        styles.amountValue,
                        { color: item.Outstanding > 0 ? theme.colors.amber[500] : theme.colors.ink[900] },
                      ]}
                    >
                      {formatCurrency(item.Outstanding)}
                    </Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Due Date</Text>
                    <Text style={styles.amountValue}>{formatDate(item.DueDate)}</Text>
                  </View>
                </View>

                <View style={styles.ledgerActions}>
                  {item.Outstanding > 0 ? (
                    <Button
                      variant="mint"
                      icon="dollarSign"
                      onPress={() => setPayingAssignment(item)}
                    >
                      Record Payment
                    </Button>
                  ) : null}
                  <IconButton
                    icon="trash"
                    label="Remove assignment"
                    size={32}
                    iconSize={15}
                    variant="danger"
                    onPress={() => handleRemoveAssignment(item)}
                  />
                </View>
              </View>
            )}
          />
        </>
      )}

      {/* TAB 2: FEE STRUCTURES */}
      {activeTab === 'structures' && (
        <ListPanel
          title="Fee Structures"
          subtitle="Charge templates and fee levels defined for the school."
          action={
            <Button icon="plus" onPress={() => setEditingStructure('new')}>
              New Fee
            </Button>
          }
          items={structures}
          keyExtractor={(item) => String(item.Id)}
          loading={structuresQuery.loading && !structuresQuery.data}
          error={structuresQuery.error}
          status={structuresQuery.status}
          onRetry={refreshAll}
          onSignIn={onSignIn}
          emptyMessage="No fee structures created yet."
          emptyIcon="wallet"
          renderItem={(structure) => (
            <ListRow
              leading={
                <View style={styles.feeIconCircle}>
                  <Icon name="wallet" size={18} color={theme.colors.mint[600]} />
                </View>
              }
              title={structure.Name}
              meta={`${structure.ClassName ?? 'School-wide'}  ·  ${structure.AssignedCount} students assigned`}
              trailing={
                <View style={styles.structureTrailing}>
                  <Text style={styles.structureAmount}>{formatCurrency(structure.Amount)}</Text>
                  <IconButton
                    icon="edit"
                    label="Edit"
                    size={30}
                    iconSize={14}
                    onPress={() => setEditingStructure(structure)}
                  />
                  <IconButton
                    icon="trash"
                    label="Delete"
                    size={30}
                    iconSize={14}
                    variant="danger"
                    onPress={() => handleDeleteStructure(structure)}
                  />
                </View>
              }
            />
          )}
        />
      )}

      {/* TAB 3: ASSIGN FEE */}
      {activeTab === 'assign' && (
        <AssignFeeForm
          structures={structures}
          classes={classes}
          students={students}
          onDone={(msg) => {
            setFeedback({ tone: 'success', message: msg });
            refreshAll();
            setActiveTab('ledger');
          }}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      )}

      {/* TAB 4: PAYMENTS */}
      {activeTab === 'payments' && (
        <ListPanel
          title="Recent Payments"
          subtitle="Recorded payment transactions and receipt logs."
          action={<CountPill count={payments.length} label="payments" />}
          items={payments}
          keyExtractor={(item) => String(item.Id)}
          loading={paymentsQuery.loading && !paymentsQuery.data}
          error={paymentsQuery.error}
          status={paymentsQuery.status}
          onRetry={refreshAll}
          onSignIn={onSignIn}
          emptyMessage="No payments recorded yet."
          emptyIcon="dollarSign"
          renderItem={(payment) => (
            <ListRow
              leading={<Avatar text={initials(payment.StudentName)} tone="mint" />}
              title={payment.StudentName}
              meta={`${payment.FeeName}${payment.TransactionReference ? `  ·  Ref: ${payment.TransactionReference}` : ''}  ·  ${payment.PaymentMethod ?? 'Cash'}  ·  ${formatDate(payment.PaymentDate)}`}
              trailing={
                <Text style={styles.paymentAmount}>{formatCurrency(payment.AmountPaid)}</Text>
              }
            />
          )}
        />
      )}

      {/* Record Payment Modal */}
      {payingAssignment !== null ? (
        <RecordPaymentModal
          assignment={payingAssignment}
          onClose={() => setPayingAssignment(null)}
          onRecorded={(msg) => {
            setPayingAssignment(null);
            setFeedback({ tone: 'success', message: msg });
            refreshAll();
          }}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      ) : null}

      {/* Fee Structure Modal */}
      {editingStructure !== null ? (
        <StructureFormModal
          structure={editingStructure === 'new' ? null : editingStructure}
          classes={classes}
          onClose={() => setEditingStructure(null)}
          onSaved={(msg) => {
            setEditingStructure(null);
            setFeedback({ tone: 'success', message: msg });
            refreshAll();
          }}
          onError={(msg) => setFeedback({ tone: 'error', message: msg })}
        />
      ) : null}
    </Screen>
  );
}

/* ------------------------------------------------ Record Payment Modal */
function RecordPaymentModal({
  assignment,
  onClose,
  onRecorded,
  onError,
}: {
  assignment: Assignment;
  onClose: () => void;
  onRecorded: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [amount, setAmount] = useState(String(assignment.Outstanding));
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (num > assignment.Outstanding) {
      setError(`Cannot exceed outstanding balance of ${formatCurrency(assignment.Outstanding)}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await recordPayment({
        StudentFeeId: assignment.Id,
        AmountPaid: num,
        PaymentMethod: method,
        TransactionReference: reference.trim() || undefined,
      });
      onRecorded(res.Message);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not record payment.';
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
      title="Record Payment"
      subtitle={`${assignment.StudentName} · ${assignment.FeeName}`}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy}>
            Record Payment
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Outstanding Balance:</Text>
        <Text style={styles.balanceValue}>{formatCurrency(assignment.Outstanding)}</Text>
      </View>

      <Input
        label="Amount to Pay"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
        autoFocus
        containerStyle={styles.modalSpacing}
      />

      <Select
        label="Payment Method"
        value={method}
        options={PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
        onChange={(val) => setMethod(val ?? PAYMENT_METHODS[0])}
        placeholder="Select method"
        title="Select Method"
        style={styles.modalSpacing}
      />

      <Input
        label="Transaction Reference (optional)"
        value={reference}
        onChangeText={setReference}
        placeholder="e.g. Receipt # or Bank Ref"
        containerStyle={styles.modalSpacing}
      />
    </Modal>
  );
}

/* ------------------------------------------------ Fee Structure Modal */
function StructureFormModal({
  structure,
  classes,
  onClose,
  onSaved,
  onError,
}: {
  structure: FeeStructure | null;
  classes: ClassItem[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const isEdit = structure !== null;
  const [name, setName] = useState(structure?.Name ?? '');
  const [amount, setAmount] = useState(structure?.Amount !== undefined ? String(structure.Amount) : '');
  const [classId, setClassId] = useState<number | null>(structure?.ClassId ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError('Fee name is required.');
      return;
    }
    const num = Number(amount);
    if (!num || num <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const payload = {
        Name: name.trim(),
        Amount: num,
        ClassId: classId,
      };

      const res = isEdit
        ? await updateFeeStructure(structure.Id, payload)
        : await createFeeStructure(payload);

      onSaved(res.Message);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not save fee structure.';
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
      title={isEdit ? 'Edit Fee Structure' : 'New Fee Structure'}
      subtitle={isEdit ? structure.Name : 'Create a chargeable fee rate'}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onPress={() => void save()} loading={busy} disabled={busy}>
            {isEdit ? 'Save Changes' : 'Create Fee'}
          </Button>
        </>
      }
    >
      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <Input
        label="Fee Name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Term 1 Tuition Fee"
        autoFocus
      />

      <Input
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
        placeholder="0.00"
        containerStyle={styles.modalSpacing}
      />

      <Select
        label="Applies To"
        value={classId}
        options={classes.map((c) => ({ value: c.Id, label: c.Name }))}
        onChange={setClassId}
        placeholder="School-wide (All Classes)"
        clearLabel="School-wide (All Classes)"
        title="Applies To"
        style={styles.modalSpacing}
      />

      {isEdit && structure && structure.AssignedCount > 0 ? (
        <Text style={styles.assignedWarning}>
          Note: {structure.AssignedCount} students currently owe this fee. The server will reject
          changing the amount on an already-assigned fee.
        </Text>
      ) : null}
    </Modal>
  );
}

/* ------------------------------------------------ Assign Fee Form */
function AssignFeeForm({
  structures,
  classes,
  students,
  onDone,
  onError,
}: {
  structures: FeeStructure[];
  classes: ClassItem[];
  students: Student[];
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [structureId, setStructureId] = useState<number | null>(null);
  const [scope, setScope] = useState<'class' | 'student'>('class');
  const [classId, setClassId] = useState<number | null>(null);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(todayInput());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (structureId === null) {
      setError('Please select a fee.');
      return;
    }
    if (scope === 'class' && classId === null) {
      setError('Please select a class.');
      return;
    }
    if (scope === 'student' && studentId === null) {
      setError('Please select a student.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await assignFee({
        FeeStructureId: structureId,
        ClassId: scope === 'class' ? classId : null,
        StudentId: scope === 'student' ? studentId : null,
        DueDate: dueDate,
      });
      onDone(`${res.Message} (${res.Assigned} assigned, ${res.Skipped} skipped)`);
      setStructureId(null);
      setClassId(null);
      setStudentId(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Could not assign fee.';
      setError(msg);
      onError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.assignCard}>
      <Text style={styles.assignTitle}>Assign Fee to Students</Text>
      <Text style={styles.assignSubtitle}>
        Charge an existing fee structure to an entire class or a specific student.
      </Text>

      {error ? <Banner tone="error" message={error} style={styles.modalBanner} /> : null}

      <Select
        label="Fee Structure"
        value={structureId}
        options={structures.map((s) => ({
          value: s.Id,
          label: `${s.Name} (${formatCurrency(s.Amount)}) · ${s.ClassName ?? 'School-wide'}`,
        }))}
        onChange={setStructureId}
        placeholder="Select fee"
        title="Select Fee"
        searchable
        style={styles.modalSpacing}
      />

      <ChipGroup
        options={[
          { value: 'class', label: 'Whole Class', icon: 'users' },
          { value: 'student', label: 'Single Student', icon: 'student' },
        ]}
        value={scope}
        onChange={(val) => setScope(val as 'class' | 'student')}
        style={styles.modalSpacing}
      />

      {scope === 'class' ? (
        <Select
          label="Class"
          value={classId}
          options={classes.map((c) => ({ value: c.Id, label: c.Name }))}
          onChange={setClassId}
          placeholder="Select class"
          title="Select Class"
          style={styles.modalSpacing}
        />
      ) : (
        <Select
          label="Student"
          value={studentId}
          options={students.map((s) => ({
            value: s.Id,
            label: `${s.Username} (#${s.RollNumber}) · ${s.ClassName ?? 'No class'}`,
          }))}
          onChange={setStudentId}
          placeholder="Select student"
          title="Select Student"
          searchable
          style={styles.modalSpacing}
        />
      )}

      <Input
        label="Due Date"
        value={dueDate}
        onChangeText={setDueDate}
        placeholder="YYYY-MM-DD"
        containerStyle={styles.modalSpacing}
      />

      <Button
        icon="plus"
        onPress={() => void handleAssign()}
        loading={busy}
        disabled={busy}
        style={styles.assignBtn}
      >
        Assign Fee
      </Button>
    </View>
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
  searchBar: {
    marginBottom: theme.spacing[3],
  },
  filterRow: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[4],
  },
  filterItem: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing[2.5],
    marginBottom: theme.spacing[4],
  },
  summaryCard: {
    flex: 1,
    minWidth: '46%',
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[4],
  },
  summaryLabel: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[500],
    textTransform: 'uppercase',
  },
  summaryAmount: {
    fontSize: theme.fontSize['3xl'],
    fontWeight: theme.fontWeight.bold,
    marginTop: 4,
  },
  summarySub: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[400],
    marginTop: 2,
  },
  ledgerRow: {
    paddingVertical: theme.spacing[3.5],
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.line,
  },
  ledgerRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  ledgerInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
  },
  studentMeta: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.ink[500],
    marginTop: 2,
  },
  ledgerAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.lineSoft,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    marginTop: theme.spacing[2.5],
  },
  amountItem: {
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.ink[500],
  },
  amountValue: {
    fontSize: theme.fontSize.tiny,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.ink[900],
    marginTop: 1,
  },
  ledgerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing[2],
    marginTop: theme.spacing[2.5],
  },
  feeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: theme.colors.mint[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  structureTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  structureAmount: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.mint[600],
    marginRight: theme.spacing[1],
  },
  paymentAmount: {
    fontSize: theme.fontSize.base,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.mint[600],
  },
  assignCard: {
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[5],
    marginBottom: theme.spacing[4],
  },
  assignTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  assignSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    marginTop: 2,
    marginBottom: theme.spacing[2],
  },
  assignBtn: {
    marginTop: theme.spacing[4],
  },
  balanceCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[3],
    backgroundColor: theme.colors.lineSoft,
    borderRadius: theme.borderRadius.xl,
    marginTop: theme.spacing[2],
  },
  balanceLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[600],
  },
  balanceValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
  },
  assignedWarning: {
    fontSize: theme.fontSize.tiny,
    color: theme.colors.amber[500],
    marginTop: theme.spacing[3],
  },
  restrictedCard: {
    borderRadius: theme.borderRadius['2xl'],
    borderWidth: 1,
    borderColor: theme.colors.line,
    backgroundColor: theme.colors.white,
    padding: theme.spacing[8],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[4],
  },
  restrictedTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.ink[900],
    marginTop: theme.spacing[3],
  },
  restrictedDesc: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink[500],
    textAlign: 'center',
    marginTop: theme.spacing[2],
    maxWidth: 300,
  },
});
