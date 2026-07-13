/**
 * Client Billing API — NexSyrus SaaS invoicing (tax invoice + receipt).
 *
 * Thin typed wrapper over `superAdminClient`. All endpoints live under
 * /api/super-admin/billing and ride the same auth + cluster-aware base URL as
 * the rest of the Founder Console.
 */
import { superAdminClient } from './superAdminClient';

const BASE = '/api/super-admin/billing';

export type DocumentType = 'tax_invoice' | 'receipt';
export type DocumentStatus = 'draft' | 'issued' | 'cancelled';

export interface BillingConfig {
  id: number;
  supplier_legal_name: string | null;
  supplier_gstin: string | null;
  supplier_state_code: string | null;
  supplier_address: string | null;
  supplier_logo_url: string | null;
  invoice_prefix: string;
  default_gst_rate: string | number;
  default_sac_code: string | null;
  updated_at: string;
}

export interface BillingClient {
  id: string; kind: 'school' | 'medical'; cluster_id: string; name: string; code: string | null;
  address: string | null; is_active: boolean; created_at: string;
  monthly_fee: number | string | null; payment_link: string | null;
  subscription_updated_at: string | null;
}

export interface LineItemInput {
  description: string;
  sac_code?: string | null;
  quantity: number | string;
  rate: number | string;
}

export interface LineItem {
  description: string;
  sac_code: string | null;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ClientSnapshotInput {
  legal_name: string;
  billing_address: string;
  gstin?: string | null;
  state_code?: string | null;
  /** Optional, informational back-reference — never FK-enforced. */
  id?: string | null;
  kind?: 'school' | 'medical' | null;
  cluster_id?: string | null;
}

export interface IssueDocumentInput {
  document_type: DocumentType;
  client: ClientSnapshotInput;
  line_items: LineItemInput[];
  gst_rate?: number | null;
  place_of_supply_state_code?: string | null;
}

export interface PreviewResult {
  document_type: DocumentType;
  line_items: LineItem[];
  taxable_value: number;
  cgst_rate: number | null;
  cgst_amount: number | null;
  sgst_rate: number | null;
  sgst_amount: number | null;
  igst_rate: number | null;
  igst_amount: number | null;
  total_amount: number;
  place_of_supply_state_code: string;
}

export interface BillingDocument {
  id: string;
  document_number: string;
  document_type: DocumentType;
  financial_year: string;
  client_id: string | null;
  client_kind: 'school' | 'medical' | null;
  client_cluster_id: string | null;
  client_legal_name: string;
  client_gstin: string | null;
  client_billing_address: string;
  client_state_code: string | null;
  supplier_gstin: string;
  supplier_state_code: string;
  place_of_supply_state_code: string;
  line_items: LineItem[];
  taxable_value: number;
  cgst_rate: number | null;
  cgst_amount: number | null;
  sgst_rate: number | null;
  sgst_amount: number | null;
  igst_rate: number | null;
  igst_amount: number | null;
  total_amount: number;
  status: DocumentStatus;
  pdf_url: string | null;
  issued_at: string | null;
  created_at: string;
}

export interface DocumentListResult {
  data: BillingDocument[];
  page: number;
  page_size: number;
  total: number;
}

export interface DocumentListFilters {
  financial_year?: string;
  document_type?: DocumentType;
  status?: DocumentStatus;
  client_id?: string;
  page?: number;
  page_size?: number;
}

/** A typed billing error surfaced from the backend `{ error, details }` body. */
export interface BillingApiError {
  code: string;
  message: string;
}

export function toBillingError(err: any): BillingApiError {
  const body = err?.response?.data;
  if (body && typeof body.error === 'string') {
    return { code: body.error, message: body.details || body.error };
  }
  return { code: 'NETWORK', message: err?.message || 'Network request failed' };
}

export async function getConfig(): Promise<BillingConfig> {
  const res = await superAdminClient.get(`${BASE}/config`);
  return res.data;
}

export async function updateConfig(patch: Partial<BillingConfig>): Promise<BillingConfig> {
  const res = await superAdminClient.put(`${BASE}/config`, patch);
  return res.data;
}

export async function listClients(): Promise<{ data: BillingClient[]; cluster_unreachable: boolean }> {
  return (await superAdminClient.get(`${BASE}/clients`)).data;
}

export async function updateClient(client: BillingClient, monthly_fee: number | null, payment_link: string | null) {
  return (await superAdminClient.put(`${BASE}/clients/${client.kind}/${encodeURIComponent(client.cluster_id)}/${encodeURIComponent(client.id)}`, { monthly_fee, payment_link })).data;
}

export async function sendPaymentLink(client: BillingClient, payment_link?: string | null) {
  return (await superAdminClient.post(`${BASE}/clients/${client.kind}/${encodeURIComponent(client.cluster_id)}/${encodeURIComponent(client.id)}/send-payment-link`, { payment_link })).data;
}

export async function previewDocument(input: IssueDocumentInput): Promise<PreviewResult> {
  const res = await superAdminClient.post(`${BASE}/documents/preview`, input);
  return res.data;
}

export async function issueDocument(input: IssueDocumentInput): Promise<BillingDocument> {
  const res = await superAdminClient.post(`${BASE}/documents/issue`, input);
  return res.data;
}

export async function listDocuments(filters: DocumentListFilters = {}): Promise<DocumentListResult> {
  const res = await superAdminClient.get(`${BASE}/documents`, { params: filters });
  return res.data;
}

export async function getDocument(id: string): Promise<BillingDocument> {
  const res = await superAdminClient.get(`${BASE}/documents/${id}`);
  return res.data;
}

export async function cancelDocument(id: string): Promise<BillingDocument> {
  const res = await superAdminClient.post(`${BASE}/documents/${id}/cancel`);
  return res.data;
}

/** Absolute URL to the print-ready HTML artifact (opens / prints / shares). */
export function documentHtmlUrl(id: string): string {
  const base = (superAdminClient.defaults.baseURL || '').replace(/\/$/, '');
  return `${base}${BASE}/documents/${id}/document.html`;
}

/** Fetch the rendered HTML string (auth header attached by the interceptor). */
export async function fetchDocumentHtml(id: string): Promise<string> {
  const res = await superAdminClient.get(`${BASE}/documents/${id}/document.html`, {
    responseType: 'text',
    transformResponse: (d) => d,
  });
  return res.data as string;
}
