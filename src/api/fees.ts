import { apiDelete, apiGet, apiPost, apiPut, buildQuery } from './client';

export interface FeeStructure {
  Id: number;
  Name: string;
  Amount: number;
  ClassId: number | null;
  ClassName: string | null;
  AssignedCount: number;
}

export type FeeStatus = 'Paid' | 'Partial' | 'Overdue' | 'Unpaid';

export interface Assignment {
  Id: number;
  StudentId: number;
  StudentName: string;
  AdmissionNumber: string | null;
  ClassId: number | null;
  ClassName: string | null;
  FeeStructureId: number;
  FeeName: string;
  Amount: number;
  DueDate: string;
  Paid: number;
  Outstanding: number;
  Status: FeeStatus;
}

export interface Payment {
  Id: number;
  StudentFeeId: number;
  StudentId: number;
  StudentName: string;
  AdmissionNumber: string | null;
  FeeName: string;
  Amount: number;
  AmountPaid: number;
  PaymentDate: string;
  PaymentMethod: string | null;
  TransactionReference: string | null;
}

export interface CollectionSummary {
  TotalBilled: number;
  TotalCollected: number;
  TotalOutstanding: number;
  TotalOverdue: number;
  StudentCount: number;
}

export interface AssignmentFilters {
  classId?: number | null;
  status?: string | null;
  search?: string | null;
}

export interface SaveFeeStructurePayload {
  Name: string;
  Amount: number;
  ClassId?: number | null;
}

export interface AssignFeePayload {
  FeeStructureId: number;
  StudentId?: number | null;
  ClassId?: number | null;
  DueDate: string;
}

export interface RecordPaymentPayload {
  StudentFeeId: number;
  AmountPaid: number;
  PaymentMethod: string;
  TransactionReference?: string;
}

export const PAYMENT_METHODS = [
  'Cash',
  'Card',
  'Bank Transfer',
  'Cheque',
  'Mobile Money',
] as const;

export function fetchFeeStructures(signal?: AbortSignal): Promise<FeeStructure[]> {
  return apiGet<FeeStructure[]>('/api/fees/structures', signal);
}

export function fetchAssignments(
  filters: AssignmentFilters = {},
  signal?: AbortSignal,
): Promise<Assignment[]> {
  return apiGet<Assignment[]>(
    `/api/fees/assignments${buildQuery({
      classId: filters.classId,
      status: filters.status,
      search: filters.search,
    })}`,
    signal,
  );
}

export function fetchPayments(studentId?: number | null, signal?: AbortSignal): Promise<Payment[]> {
  const qs = studentId ? `?studentId=${studentId}` : '';
  return apiGet<Payment[]>(`/api/fees/payments${qs}`, signal);
}

export function fetchCollectionSummary(signal?: AbortSignal): Promise<CollectionSummary> {
  return apiGet<CollectionSummary>('/api/fees/summary', signal);
}

export function createFeeStructure(
  payload: SaveFeeStructurePayload,
): Promise<{ Message: string; FeeStructureId: number }> {
  return apiPost('/api/fees/structures', payload);
}

export function updateFeeStructure(
  id: number,
  payload: SaveFeeStructurePayload,
): Promise<{ Message: string; FeeStructureId: number }> {
  return apiPut(`/api/fees/structures/${id}`, payload);
}

export function deleteFeeStructure(id: number): Promise<{ Message: string }> {
  return apiDelete(`/api/fees/structures/${id}`);
}

export function assignFee(
  payload: AssignFeePayload,
): Promise<{ Message: string; Assigned: number; Skipped: number }> {
  return apiPost('/api/fees/assignments', payload);
}

export function removeAssignment(id: number): Promise<{ Message: string }> {
  return apiDelete(`/api/fees/assignments/${id}`);
}

export function recordPayment(
  payload: RecordPaymentPayload,
): Promise<{ Message: string; PaymentId: number; Paid: number; Outstanding: number }> {
  return apiPost('/api/fees/payments', payload);
}
