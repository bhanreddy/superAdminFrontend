import { School, CreateSchoolPayload, FirstAdminPayload, SchoolAppConfigPatch } from '../types/school';
import { SuperAdmin, CreateSuperAdminPayload } from '../types/superAdmin';
import { Student } from '../types/student';

/** One row of the student feature-flag catalog + its effective state for a school. */
export interface SchoolFeature {
  key: string;
  label: string;
  group: 'drawer' | 'quick_actions' | 'topbar' | 'home' | 'bottom_nav';
  default_enabled: boolean;
  data_bearing: boolean;
  toggleable: boolean;
  enabled: boolean;                 // effective value
  source: 'default' | 'overridden';
}

export {
  TokenStore,
  getStoredAccessToken,
  getStoredRefreshToken,
  storeTokens,
  clearTokens,
} from '../api/tokens';

import { superAdminClient } from '../api/superAdminClient';
import { checklistApi } from './checklistService';

/** @deprecated Prefer importing `superAdminClient` from `../api/superAdminClient` */
export const apiService = superAdminClient;

// ── SuperAdmin API (existing routes — schools, admins, students, dashboard) ──
export const superAdminApi = {
  bulkImportStudents: async (schoolId: number, file: any): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file as any);
    const response = await superAdminClient.post(`/api/super-admin/schools/${schoolId}/students/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return response.data;
  },

  getStudents: async (): Promise<Student[]> => {
    const response = await superAdminClient.get('/api/super-admin/students');
    return response.data;
  },

  getStudent: async (id: string): Promise<Student> => {
    const response = await superAdminClient.get(`/api/super-admin/students/${id}`);
    return response.data;
  },

  getSchools: async (): Promise<{ data: School[]; cluster_unreachable?: boolean } | School[]> => {
    const response = await superAdminClient.get('/api/super-admin/schools');
    return response.data;
  },

  getSchool: async (id: number): Promise<School> => {
    const response = await superAdminClient.get(`/api/super-admin/schools/${id}`);
    return response.data;
  },

  createSchool: async (data: CreateSchoolPayload): Promise<School> => {
    const response = await superAdminClient.post('/api/super-admin/schools', data);
    return response.data;
  },

  seedSchoolDefaults: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await superAdminClient.post(`/api/super-admin/schools/${id}/seed-defaults`);
    return response.data;
  },

  toggleSchoolActive: async (id: number, is_active: boolean, notes?: string): Promise<School> => {
    const payload: any = { is_active };
    if (notes) payload.notes = notes;
    const response = await superAdminClient.patch(`/api/super-admin/schools/${id}`, payload);
    return response.data;
  },

  updateSchoolAppConfig: async (id: number, data: SchoolAppConfigPatch): Promise<School> => {
    const response = await superAdminClient.patch(`/api/super-admin/schools/${id}/app-config`, data);
    return response.data;
  },

  // --- STUDENT FEATURE FLAGS ---
  getSchoolFeatures: async (schoolId: number): Promise<{ school_id: number; features: SchoolFeature[] }> => {
    const response = await superAdminClient.get(`/api/super-admin/schools/${schoolId}/features`);
    return response.data;
  },

  updateSchoolFeature: async (
    schoolId: number,
    featureKey: string,
    enabled: boolean,
  ): Promise<{ school_id: number; feature_key: string; enabled: boolean; source: string }> => {
    const response = await superAdminClient.put(
      `/api/super-admin/schools/${schoolId}/features/${encodeURIComponent(featureKey)}`,
      { enabled },
    );
    return response.data;
  },

  resetSchoolFeature: async (
    schoolId: number,
    featureKey: string,
  ): Promise<{ school_id: number; feature_key: string; enabled: boolean; source: string }> => {
    const response = await superAdminClient.delete(
      `/api/super-admin/schools/${schoolId}/features/${encodeURIComponent(featureKey)}`,
    );
    return response.data;
  },

  deleteSchool: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await superAdminClient.delete(`/api/super-admin/schools/${id}`);
    return response.data;
  },

  addFirstAdmin: async (schoolId: number, data: FirstAdminPayload): Promise<any> => {
    const response = await superAdminClient.post(`/api/super-admin/schools/${schoolId}/first-admin`, data);
    return response.data;
  },

  // --- DASHBOARD & HEALTH ---
  getDashboardStats: async (): Promise<{ total_schools: number; active_schools: number; total_students: number; total_staff: number; total_super_admins: number }> => {
    const response = await superAdminClient.get('/api/super-admin/dashboard/stats');
    return response.data;
  },

  getSchoolHealth: async (id: number): Promise<{ student_count: number; staff_count: number; user_count: number; last_activity: string | null; defaults_seeded: boolean; first_admin_exists: boolean }> => {
    const response = await superAdminClient.get(`/api/super-admin/schools/${id}/health`);
    return response.data;
  },

  // --- SUPER ADMIN MANAGEMENT ---
  getSuperAdmins: async (): Promise<SuperAdmin[]> => {
    const response = await superAdminClient.get('/api/super-admin/admins');
    const raw = response.data;
    return Array.isArray(raw) ? raw : [];
  },

  createSuperAdmin: async (data: CreateSuperAdminPayload): Promise<SuperAdmin> => {
    const response = await superAdminClient.post('/api/super-admin/admins', data);
    return response.data;
  },

  toggleSuperAdminActive: async (id: string, is_active: boolean): Promise<SuperAdmin> => {
    const response = await superAdminClient.patch(`/api/super-admin/admins/${id}`, { is_active });
    return response.data;
  },

  deleteSuperAdmin: async (id: string): Promise<{ success: boolean }> => {
    const response = await superAdminClient.delete(`/api/super-admin/admins/${id}`);
    return response.data;
  },

  // --- DCGD (Nexsyrus microservice catalog) ---
  getDcgdPrograms: async (): Promise<any[]> => {
    const response = await superAdminClient.get('/api/super-admin/dcgd/programs');
    return response.data;
  },
  createDcgdProgram: async (payload: {
    name: string;
    description?: string;
    icon?: string;
    display_order?: number;
    is_active?: boolean;
  }) => {
    const response = await superAdminClient.post('/api/super-admin/dcgd/programs', payload);
    return response.data;
  },
  patchDcgdProgram: async (
    id: number,
    payload: Partial<{
      name: string;
      description: string;
      icon: string;
      display_order: number;
      is_active: boolean;
    }>,
  ) => {
    const response = await superAdminClient.patch(`/api/super-admin/dcgd/programs/${id}`, payload);
    return response.data;
  },
  deleteDcgdProgram: async (id: number) => {
    const response = await superAdminClient.delete(`/api/super-admin/dcgd/programs/${id}`);
    return response.data;
  },
  reorderDcgdPrograms: async (ordered_ids: number[]) => {
    const response = await superAdminClient.post('/api/super-admin/dcgd/programs/reorder', { ordered_ids });
    return response.data;
  },
  getDcgdSettings: async () => {
    const response = await superAdminClient.get('/api/super-admin/dcgd/settings');
    return response.data;
  },
  updateDcgdSettings: async (payload: { page_title?: string; subtitle?: string; is_visible?: boolean }) => {
    const response = await superAdminClient.put('/api/super-admin/dcgd/settings', payload);
    return response.data;
  },

  // --- DCGD Program Content ---
  getDcgdProgramContent: async (programId: number): Promise<any[]> => {
    const response = await superAdminClient.get(`/api/super-admin/dcgd/programs/${programId}/content`);
    return response.data;
  },
  createDcgdProgramContent: async (
    programId: number,
    payload: {
      title: string;
      link_url?: string | null;
      pdf_url?: string | null;
      image_url?: string | null;
      content_body?: string | null;
      display_order?: number;
      is_active?: boolean;
    },
  ) => {
    const response = await superAdminClient.post(
      `/api/super-admin/dcgd/programs/${programId}/content`,
      payload,
    );
    return response.data;
  },
  patchDcgdProgramContent: async (
    programId: number,
    contentId: number,
    payload: Partial<{
      title: string;
      link_url: string | null;
      pdf_url: string | null;
      image_url: string | null;
      content_body: string | null;
      display_order: number;
      is_active: boolean;
    }>,
  ) => {
    const response = await superAdminClient.patch(
      `/api/super-admin/dcgd/programs/${programId}/content/${contentId}`,
      payload,
    );
    return response.data;
  },
  deleteDcgdProgramContent: async (programId: number, contentId: number) => {
    const response = await superAdminClient.delete(
      `/api/super-admin/dcgd/programs/${programId}/content/${contentId}`,
    );
    return response.data;
  },
  reorderDcgdProgramContent: async (programId: number, ordered_ids: number[]) => {
    const response = await superAdminClient.post(
      `/api/super-admin/dcgd/programs/${programId}/content/reorder`,
      { ordered_ids },
    );
    return response.data;
  },

  // --- RBAC Internal Users ---
  getInternalUsers: async (params?: { role?: string; status?: string; manager_id?: string; search?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/users', { params });
    return response.data;
  },
  getUserHierarchy: async () => {
    const response = await superAdminClient.get('/api/super-admin/users/hierarchy');
    return response.data;
  },
  createInternalUser: async (payload: {
    full_name: string;
    email: string;
    phone?: string;
    role: string;
    employee_id?: string;
    manager_id?: string;
    territory?: string;
    password?: string;
    status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'INVITED';
    assigned_schools?: number[];
  }) => {
    const response = await superAdminClient.post('/api/super-admin/users', payload);
    return response.data;
  },
  getInternalUser: async (id: string) => {
    const response = await superAdminClient.get(`/api/super-admin/users/${id}`);
    return response.data;
  },
  updateInternalUser: async (id: string, payload: any) => {
    const response = await superAdminClient.patch(`/api/super-admin/users/${id}`, payload);
    return response.data;
  },
  assignSchoolsToUser: async (id: string, school_ids: number[]) => {
    const response = await superAdminClient.post(`/api/super-admin/users/${id}/schools`, { school_ids });
    return response.data;
  },
  resetUserPassword: async (id: string, new_password: string) => {
    const response = await superAdminClient.post(`/api/super-admin/users/${id}/reset-password`, { new_password });
    return response.data;
  },
  getPermissionCatalog: async () => {
    const response = await superAdminClient.get('/api/super-admin/users/permissions/catalog');
    return response.data;
  },
  getUserPermissions: async (id: string) => {
    const response = await superAdminClient.get(`/api/super-admin/users/${id}/permissions`);
    return response.data;
  },
  updateUserPermissions: async (id: string, overrides: { permission: string; effect: 'GRANT' | 'DENY' }[]) => {
    const response = await superAdminClient.put(`/api/super-admin/users/${id}/permissions`, { overrides });
    return response.data;
  },
  toggleUserStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => {
    const response = await superAdminClient.patch(`/api/super-admin/users/${id}`, { status });
    return response.data;
  },

  // --- School Requirements ---
  getRequirements: async (params?: { school_id?: number; status?: string; category?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/requirements', { params });
    return response.data;
  },
  createRequirement: async (payload: {
    school_id: number;
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    attachments?: string[];
  }) => {
    const response = await superAdminClient.post('/api/super-admin/requirements', payload);
    return response.data;
  },
  updateRequirement: async (id: string, payload: {
    status?: string;
    feasibility_status?: string;
    resolution_notes?: string;
    priority?: string;
  }) => {
    const response = await superAdminClient.patch(`/api/super-admin/requirements/${id}`, payload);
    return response.data;
  },

  // --- Onboarding Checklist ---
  ...checklistApi,

  // --- Support / Complaints Desk ---
  getSupportTickets: async (params?: { school_id?: number; status?: string; priority?: string; assigned_to?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/support/tickets', { params });
    return response.data;
  },
  getSupportTicket: async (id: string) => {
    const response = await superAdminClient.get(`/api/super-admin/support/tickets/${id}`);
    return response.data;
  },
  createSupportTicket: async (payload: {
    school_id: number;
    title: string;
    description: string;
    category?: string;
    priority?: string;
    assigned_to?: string;
  }) => {
    const response = await superAdminClient.post('/api/super-admin/support/tickets', payload);
    return response.data;
  },
  updateSupportTicket: async (id: string, payload: {
    status?: string;
    priority?: string;
    assigned_to?: string | null;
    resolution?: string;
  }) => {
    const response = await superAdminClient.patch(`/api/super-admin/support/tickets/${id}`, payload);
    return response.data;
  },
  addTicketNote: async (id: string, payload: { note: string; is_internal?: boolean }) => {
    const response = await superAdminClient.post(`/api/super-admin/support/tickets/${id}/notes`, payload);
    return response.data;
  },
};

// ── Founder API (new backend routes for founder/CRM operations) ─────────────
export const founderApi = {
  // --- Analytics (batched) ---
  getAnalytics: async () => {
    const response = await superAdminClient.get('/api/super-admin/founder/analytics');
    return response.data;
  },

  // --- Expenses ---
  listExpenses: async (filters: { status?: string; category?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/founder/expenses', { params: filters });
    return response.data;
  },
  createExpense: async (payload: any) => {
    const response = await superAdminClient.post('/api/super-admin/founder/expenses', payload);
    return response.data;
  },
  approveExpense: async (id: string, approverFounderId: string) => {
    const response = await superAdminClient.post(`/api/super-admin/founder/expenses/${id}/approve`, { approver_founder_id: approverFounderId });
    return response.data;
  },
  rejectExpense: async (id: string, approverFounderId: string, reason: string) => {
    const response = await superAdminClient.post(`/api/super-admin/founder/expenses/${id}/reject`, { approver_founder_id: approverFounderId, reason });
    return response.data;
  },
  uploadReceipt: async (expenseId: string, file: any, founderId: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('founder_id', founderId);
    const response = await superAdminClient.post(`/api/super-admin/founder/expenses/${expenseId}/receipt`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  getReceiptUrl: async (expenseId: string, expires = 3600) => {
    const response = await superAdminClient.get(`/api/super-admin/founder/expenses/${expenseId}/receipt-url`, { params: { expires } });
    return response.data;
  },

  // --- Collections ---
  listCollections: async (params: { period?: string; status?: string; business_unit_id?: string; page?: number; pageSize?: number }) => {
    const response = await superAdminClient.get('/api/super-admin/founder/collections', { params });
    return response.data;
  },
  getFinancialSummary: async (params: { period: string; business_unit_id?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/founder/financial-summary', { params });
    return response.data;
  },
  createCollection: async (payload: any) => {
    const response = await superAdminClient.post('/api/super-admin/founder/collections', payload);
    return response.data;
  },
  approveCollection: async (id: string, approverFounderId: string) => {
    const response = await superAdminClient.post(`/api/super-admin/founder/collections/${id}/approve`, { approver_founder_id: approverFounderId });
    return response.data;
  },
  rejectCollection: async (id: string, approverFounderId: string, reason: string) => {
    const response = await superAdminClient.post(`/api/super-admin/founder/collections/${id}/reject`, { approver_founder_id: approverFounderId, reason });
    return response.data;
  },

  // --- Enquiries ---
  listEnquiries: async (filters: { status?: string; source?: string; category?: string; assignedTo?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/founder/enquiries', { params: filters });
    return response.data;
  },
  getEnquiryStats: async () => {
    const response = await superAdminClient.get('/api/super-admin/founder/enquiries/stats');
    return response.data;
  },
  updateEnquiry: async (id: string, patch: any) => {
    const response = await superAdminClient.patch(`/api/super-admin/founder/enquiries/${id}`, patch);
    return response.data;
  },

  // --- Business Units ---
  listBusinessUnits: async (includeInactive = false) => {
    const response = await superAdminClient.get('/api/super-admin/founder/business-units', { params: { includeInactive } });
    return response.data;
  },
  createBusinessUnit: async (payload: {
    name: string;
    code: string;
    subscription_price: number;
    subscription_plan: string;
    phone?: string | null;
  }) => {
    const response = await superAdminClient.post('/api/super-admin/founder/business-units', payload);
    return response.data;
  },
  updateBusinessUnit: async (id: string, patch: any) => {
    const response = await superAdminClient.patch(`/api/super-admin/founder/business-units/${id}`, patch);
    return response.data;
  },

  // --- Notifications ---
  listNotifications: async (userId: string, founderId: string | null) => {
    const response = await superAdminClient.get('/api/super-admin/founder/notifications', { params: { user_id: userId, founder_id: founderId } });
    return response.data;
  },
  getUnreadCount: async (userId: string, founderId: string | null) => {
    const response = await superAdminClient.get('/api/super-admin/founder/notifications/unread-count', { params: { user_id: userId, founder_id: founderId } });
    return response.data;
  },
  markNotificationRead: async (id: string) => {
    const response = await superAdminClient.patch(`/api/super-admin/founder/notifications/${id}/read`);
    return response.data;
  },
  markNotificationUnread: async (id: string) => {
    const response = await superAdminClient.patch(`/api/super-admin/founder/notifications/${id}/unread`);
    return response.data;
  },
  deleteNotification: async (id: string) => {
    const response = await superAdminClient.delete(`/api/super-admin/founder/notifications/${id}`);
    return response.data;
  },

  // --- Audit Logs ---
  listAuditLogs: async (filters: { entity_type?: string; action?: string }) => {
    const response = await superAdminClient.get('/api/super-admin/founder/audit-logs', { params: filters });
    return response.data;
  },

  // --- Settings ---
  getSetting: async (key: string) => {
    const response = await superAdminClient.get('/api/super-admin/founder/settings', { params: { key } });
    return response.data;
  },
  upsertSetting: async (key: string, value: unknown) => {
    const response = await superAdminClient.put('/api/super-admin/founder/settings', { key, value });
    return response.data;
  },
  listFounders: async () => {
    const response = await superAdminClient.get('/api/super-admin/founder/settings/founders');
    return response.data;
  },
  setFounderActive: async (id: string, is_active: boolean) => {
    const response = await superAdminClient.patch(`/api/super-admin/founder/settings/founders/${id}/toggle`, { is_active });
    return response.data;
  },

  // --- Content ---
  createContent: async (payload: any) => {
    const response = await superAdminClient.post('/api/super-admin/content', payload);
    return response.data;
  },
};
