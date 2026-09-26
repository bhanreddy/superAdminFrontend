import { crmClient } from '../api/crmClient';
import type { CrmAccount, CrmOverview, CrmTask, CrmTaskStatus, ImportBatch, ImportRow, LeadPage, OnboardingOperation, ProspectPage, SalesCommandSummary, SalesOpportunityPage } from '../types/crm';

const base = '/api/super-admin/crm';
const http = crmClient;

export const crmService = {
  async getOverview(): Promise<CrmOverview> {
    return (await http.get(`${base}/overview`)).data;
  },
  async listAccounts(params?: { lifecycle?: string; owner?: string; search?: string }): Promise<CrmAccount[]> {
    return (await http.get(`${base}/accounts`, { params })).data;
  },
  async createAccount(payload: Record<string, unknown>): Promise<CrmAccount> {
    return (await http.post(`${base}/accounts`, payload)).data;
  },
  async getAccount(id: string) {
    return (await http.get(`${base}/accounts/${id}`)).data;
  },
  async createContact(accountId: string, payload: Record<string, unknown>) {
    return (await http.post(`${base}/accounts/${accountId}/contacts`, payload)).data;
  },
  async listTasks(params?: { status?: CrmTaskStatus; owner?: string; due?: 'TODAY' | 'OVERDUE' }): Promise<CrmTask[]> {
    return (await http.get(`${base}/tasks`, { params })).data;
  },
  async createTask(payload: Record<string, unknown>): Promise<CrmTask> {
    return (await http.post(`${base}/tasks`, payload)).data;
  },
  async updateTask(id: string, patch: Record<string, unknown>): Promise<CrmTask> {
    return (await http.patch(`${base}/tasks/${id}`, patch)).data;
  },
  async convertEnquiry(id: string, vertical: string) {
    return (await http.post(`${base}/enquiries/${id}/convert`, { vertical })).data;
  },
  async acceptEnquiry(id: string, vertical: string): Promise<{ accountId: string; existing?: boolean; lifecycle_stage?: string }> {
    return (await http.post(`${base}/enquiries/${id}/convert`, { vertical })).data;
  },
  async updateAccount(id: string, patch: Record<string, unknown>): Promise<CrmAccount> {
    return (await http.patch(`${base}/accounts/${id}`, patch)).data;
  },
  async assignAccount(id: string, ownerFounderId: string | null): Promise<CrmAccount> {
    return (await http.patch(`${base}/accounts/${id}`, { owner_founder_id: ownerFounderId })).data;
  },
  // Non-school tenants keep the previous link behavior, including ACTIVE.
  // School accounts are rejected by the server until live readiness is met.
  async linkAccountToTenant(id: string, patch: { external_client_id?: string; cluster_id?: string; lifecycle_stage?: string }): Promise<CrmAccount> {
    return (await http.patch(`${base}/accounts/${id}`, { lifecycle_stage: 'ACTIVE', ...patch })).data;
  },
  async listAutomationRules() {
    return (await http.get(`${base}/automation-rules`)).data;
  },
  async listLeads(params?: Record<string, string | number | undefined>): Promise<LeadPage> {
    return (await http.get(`${base}/leads`, { params })).data;
  },
  async getLead(id: string) {
    return (await http.get(`${base}/leads/${id}`)).data;
  },
  async moveStage(id: string, expectedVersion: number, stage: string) {
    return (await http.post(`${base}/leads/${id}/stage`, { expected_version: expectedVersion, stage })).data;
  },
  async logActivity(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${id}/activities`, body)).data;
  },
  async completeTask(enquiryId: string, taskId: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${enquiryId}/tasks/${taskId}/complete`, body)).data;
  },
  async scheduleDemo(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${id}/demos`, body)).data;
  },
  async finishDemo(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/demos/${id}/finish`, body)).data;
  },
  async createProposal(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${id}/proposals`, body)).data;
  },
  async reviseProposal(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/proposals/${id}/revise`, body)).data;
  },
  async transitionProposal(versionId: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/proposal-versions/${versionId}/transition`, body)).data;
  },
  async closeLead(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${id}/close`, body)).data;
  },
  async reopenLead(id: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${id}/reopen`, body)).data;
  },
  async myWork(timezone = 'Asia/Kolkata') {
    return (await http.get(`${base}/work`, { params: { timezone } })).data;
  },
  async salesReport() {
    return (await http.get(`${base}/reports/sales`)).data;
  },
  async reviewQueue() {
    return (await http.get(`${base}/review-queue`)).data;
  },
  async catalog() {
    return (await http.get(`${base}/catalog`)).data;
  },
  async salesSummary(params: Record<string, string>, signal?: AbortSignal): Promise<SalesCommandSummary> {
    return (await http.get(`${base}/sales-command/summary`, { params, signal })).data;
  },
  async salesFunnel(params: Record<string, string>, signal?: AbortSignal) {
    return (await http.get(`${base}/sales-command/funnel`, { params, signal })).data;
  },
  async salesAging(params: Record<string, string>, signal?: AbortSignal) {
    return (await http.get(`${base}/sales-command/aging`, { params, signal })).data;
  },
  async salesOpportunities(params: Record<string, string>, signal?: AbortSignal): Promise<SalesOpportunityPage> {
    return (await http.get(`${base}/sales-command/opportunities`, { params, signal })).data;
  },
  async createPilot(leadId: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/leads/${leadId}/pilots`, body)).data;
  },
  async transitionPilot(pilotId: string, body: Record<string, unknown>) {
    return (await http.post(`${base}/pilots/${pilotId}/transition`, body)).data;
  },
  async createTerritory(body: { code: string; name: string }) {
    return (await http.post(`${base}/catalog/territories`, body)).data;
  },
  async startOnboarding(body: Record<string, unknown>): Promise<OnboardingOperation> {
    return (await http.post(`${base}/onboarding`, body)).data;
  },
  async retryOnboarding(id: string, body: Record<string, unknown> = {}): Promise<OnboardingOperation> {
    return (await http.post(`${base}/onboarding/${id}/retry`, body)).data;
  },
  async syncActivation(accountId: string, readiness: Record<string, unknown>) {
    return (await http.post(`${base}/accounts/${accountId}/sync-activation`, readiness)).data;
  },
  async listProspects(params?: Record<string, string | number | undefined>): Promise<ProspectPage> {
    return (await http.get(`${base}/prospects`, { params })).data;
  },
  async getProspect(id: string) {
    return (await http.get(`${base}/prospects/${id}`)).data;
  },
  async createProspect(payload: Record<string, unknown>) {
    return (await http.post(`${base}/prospects`, payload)).data;
  },
  async updateProspect(id: string, payload: Record<string, unknown>) {
    return (await http.patch(`${base}/prospects/${id}`, payload)).data;
  },
  async linkProspectEnquiry(id: string, payload: Record<string, unknown> = {}) {
    return (await http.post(`${base}/prospects/${id}/enquiries`, payload)).data;
  },
  async updateContact(accountId: string, contactId: string, payload: Record<string, unknown>) {
    return (await http.patch(`${base}/accounts/${accountId}/contacts/${contactId}`, payload)).data;
  },
  async archiveContact(accountId: string, contactId: string, expectedVersion: number) {
    return (await http.post(`${base}/accounts/${accountId}/contacts/${contactId}/archive`, { expected_version: expectedVersion })).data;
  },
  async importTemplate() {
    return (await http.get(`${base}/imports/template`)).data as {
      csv: string;
      fields: string[];
      limits: { csv_mib: number; xlsx_mib: number; rows: number; columns: number };
      features: { prospectReads: boolean; importPreview: boolean; importExecute: boolean };
      guidance: string;
    };
  },
  async uploadImport(asset: { uri: string; name: string; mimeType?: string; file?: Blob }): Promise<ImportBatch> {
    const body = new FormData();
    if (asset.file) body.append('file', asset.file, asset.name);
    else body.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType || 'text/csv' } as never);
    return (await http.post(`${base}/imports`, body)).data;
  },
  async listImports(): Promise<{ data: ImportBatch[] }> {
    return (await http.get(`${base}/imports`)).data;
  },
  async getImport(id: string): Promise<ImportBatch> {
    return (await http.get(`${base}/imports/${id}`)).data;
  },
  async importRows(id: string, params?: Record<string, string | number | undefined>): Promise<{ data: ImportRow[] }> {
    return (await http.get(`${base}/imports/${id}/rows`, { params })).data;
  },
  async saveImportMapping(id: string, payload: Record<string, unknown>) {
    return (await http.put(`${base}/imports/${id}/mapping`, payload)).data;
  },
  async queueImportPreview(id: string) {
    return (await http.post(`${base}/imports/${id}/preview`)).data;
  },
  async saveImportDecisions(id: string, payload: Record<string, unknown>) {
    return (await http.put(`${base}/imports/${id}/decisions`, payload)).data;
  },
  async confirmImport(id: string, payload: Record<string, unknown>) {
    return (await http.post(`${base}/imports/${id}/confirm`, payload)).data;
  },
  async retryImport(id: string) {
    return (await http.post(`${base}/imports/${id}/retry`)).data;
  },
  async cancelImport(id: string) {
    return (await http.post(`${base}/imports/${id}/cancel`)).data;
  },
  async listCrmAuditLogs(params?: { entity_type?: string; action?: string }) {
    return (await http.get(`${base}/audit-logs`, { params })).data as { source: 'crm'; data: Array<Record<string, unknown>> };
  },
};
