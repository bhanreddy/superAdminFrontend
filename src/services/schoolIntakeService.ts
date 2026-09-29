import { superAdminClient } from '../api/superAdminClient';

export type IntakeStatus =
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'REJECTED'
  | 'PROVISIONING'
  | 'ONBOARDED'
  | 'FAILED';

export interface IntakeCheck {
  label: string;
  status: 'pass' | 'warn' | 'fail';
}

export interface IntakeFlag {
  code: string;
  message: string;
}

export interface SchoolDossier {
  name: string;
  code: string;
  board: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  principal_name: string;
  principal_phone: string;
  principal_email: string;
  admin_first_name: string;
  admin_last_name: string;
  admin_email: string;
  admin_phone: string;
  estimated_students: number | null;
  logo_url: string;
  android_package: string;
  ios_bundle_id: string;
  primary_color: string;
  notes: string;
  documents: { label: string; url: string }[];
}

export interface IntakeIntelligence {
  score: number;
  grade: 'READY' | 'REVIEW' | 'BLOCKED';
  blockers: IntakeFlag[];
  warnings: IntakeFlag[];
  checks: IntakeCheck[];
  brief: string;
  cluster: {
    cluster_id: string;
    label: string;
    school_count: number;
    max_schools: number;
    headroom: number;
  } | null;
  auto_steps: string[];
}

export interface IntakeEvent {
  id: string;
  event_type: string;
  note?: string | null;
  actor_name?: string | null;
  created_at: string;
}

export interface SchoolIntake {
  id: string;
  status: IntakeStatus;
  name: string;
  code: string;
  city: string;
  state: string;
  score: number;
  grade: string;
  brief: string;
  submitted_by_name: string;
  submitted_by_employee_id: string;
  reviewed_by_name: string;
  submitted_at: string;
  review_note?: string | null;
  school_id?: number | null;
  cluster_id?: string | null;
  failure_reason?: string | null;
  provision_steps?: { id: string; status: string; detail?: string }[];
  dossier: SchoolDossier;
  intelligence: IntakeIntelligence;
  events?: IntakeEvent[];
}

export interface IntakePreview {
  dossier: SchoolDossier;
  intelligence: IntakeIntelligence;
}

export const INTAKE_STATUS: Record<IntakeStatus, { label: string; color: string }> = {
  SUBMITTED: { label: 'With founder', color: '#FF9F0A' },
  CHANGES_REQUESTED: { label: 'Changes requested', color: '#64D2FF' },
  REJECTED: { label: 'Not accepted', color: '#FF453A' },
  PROVISIONING: { label: 'Onboarding', color: '#0A84FF' },
  ONBOARDED: { label: 'Onboarded', color: '#30D158' },
  FAILED: { label: 'Needs another try', color: '#FF6B7A' },
};

export const SCHOOL_BOARDS = ['CBSE', 'ICSE', 'STATE', 'IB', 'IGCSE', 'OTHER'] as const;

async function unwrap<T>(promise: Promise<{ data: { data: T } }>): Promise<T> {
  const response = await promise;
  return response.data.data;
}

export const schoolIntakeApi = {
  preview(dossier: Record<string, unknown>, excludeId?: string) {
    return unwrap<IntakePreview>(superAdminClient.post('/api/super-admin/school-intake/preview', {
      dossier,
      exclude_id: excludeId || null,
    }));
  },
  list() {
    return unwrap<SchoolIntake[]>(superAdminClient.get('/api/super-admin/school-intake'));
  },
  get(id: string) {
    return unwrap<SchoolIntake>(superAdminClient.get(`/api/super-admin/school-intake/${id}`));
  },
  submit(dossier: Record<string, unknown>) {
    return unwrap<SchoolIntake>(superAdminClient.post('/api/super-admin/school-intake', { dossier }));
  },
  resubmit(id: string, dossier: Record<string, unknown>) {
    return unwrap<SchoolIntake>(superAdminClient.patch(`/api/super-admin/school-intake/${id}`, { dossier }));
  },
  requestChanges(id: string, note: string) {
    return unwrap<SchoolIntake>(superAdminClient.post(`/api/super-admin/school-intake/${id}/request-changes`, { note }));
  },
  reject(id: string, note: string) {
    return unwrap<SchoolIntake>(superAdminClient.post(`/api/super-admin/school-intake/${id}/reject`, { note }));
  },
  approve(id: string) {
    return superAdminClient.post(`/api/super-admin/school-intake/${id}/approve`).then((response) => response.data as {
      success: boolean;
      data: SchoolIntake;
      temporary_password: string | null;
      admin_email: string | null;
    });
  },
};

export function intakeErrorMessage(err: any, fallback: string) {
  return err?.response?.data?.error || err?.message || fallback;
}
