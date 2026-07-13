import { superAdminClient } from '../api/superAdminClient';
import type { CrmAccount, CrmOverview, CrmTask, CrmTaskStatus } from '../types/crm';

const base = '/api/super-admin/crm';

export const crmService = {
  async getOverview(): Promise<CrmOverview> {
    return (await superAdminClient.get(`${base}/overview`)).data;
  },
  async listAccounts(params?: { lifecycle?: string; owner?: string; search?: string }): Promise<CrmAccount[]> {
    return (await superAdminClient.get(`${base}/accounts`, { params })).data;
  },
  async createAccount(payload: Record<string, unknown>): Promise<CrmAccount> {
    return (await superAdminClient.post(`${base}/accounts`, payload)).data;
  },
  async getAccount(id: string) {
    return (await superAdminClient.get(`${base}/accounts/${id}`)).data;
  },
  async createContact(accountId: string, payload: Record<string, unknown>) {
    return (await superAdminClient.post(`${base}/accounts/${accountId}/contacts`, payload)).data;
  },
  async listTasks(params?: { status?: CrmTaskStatus; owner?: string; due?: 'TODAY' | 'OVERDUE' }): Promise<CrmTask[]> {
    return (await superAdminClient.get(`${base}/tasks`, { params })).data;
  },
  async createTask(payload: Record<string, unknown>): Promise<CrmTask> {
    return (await superAdminClient.post(`${base}/tasks`, payload)).data;
  },
  async updateTask(id: string, patch: Record<string, unknown>): Promise<CrmTask> {
    return (await superAdminClient.patch(`${base}/tasks/${id}`, patch)).data;
  },
  async convertEnquiry(id: string, vertical: string) {
    return (await superAdminClient.post(`${base}/enquiries/${id}/convert`, { vertical })).data;
  },
  // Accepting an enquiry creates its typed CRM account and marks the lead —
  // the returned accountId is threaded into the tenant onboarding form.
  async acceptEnquiry(id: string, vertical: string): Promise<{ accountId: string; existing?: boolean }> {
    return (await superAdminClient.post(`${base}/enquiries/${id}/convert`, { vertical })).data;
  },
  async updateAccount(id: string, patch: Record<string, unknown>): Promise<CrmAccount> {
    return (await superAdminClient.patch(`${base}/accounts/${id}`, patch)).data;
  },
  async assignAccount(id: string, ownerFounderId: string | null): Promise<CrmAccount> {
    return (await superAdminClient.patch(`${base}/accounts/${id}`, { owner_founder_id: ownerFounderId })).data;
  },
  // Called after a tenant Add form is submitted, to link the CRM account to the
  // provisioned tenant and flip it to ACTIVE.
  async linkAccountToTenant(id: string, patch: { external_client_id?: string; cluster_id?: string; lifecycle_stage?: string }): Promise<CrmAccount> {
    return (await superAdminClient.patch(`${base}/accounts/${id}`, { lifecycle_stage: 'ACTIVE', ...patch })).data;
  },
  async listAutomationRules() {
    return (await superAdminClient.get(`${base}/automation-rules`)).data;
  },
};
