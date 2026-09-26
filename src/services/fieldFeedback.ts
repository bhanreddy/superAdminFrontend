import { crmClient } from '../api/crmClient';

const base = '/api/super-admin/crm/feedback';

export interface FeedbackDestinationPreview {
  destination_key: string;
  destination_label: string;
  accountable_team: string;
  routing_reason: 'rule' | 'conflict' | 'no_rule' | 'replay' | string;
  delivery_commitment: false;
  hint?: { categories: string[]; message: string } | null;
}

export interface FeedbackItem {
  id: string;
  submission_id: string;
  sequence_no: number;
  category: string;
  category_label: string;
  title: string;
  source_observation: string;
  focus_note?: string | null;
  context_kind: string;
  context_label: string;
  context_note?: string | null;
  source_type?: string | null;
  source_id?: string | null;
  source_href?: string | null;
  account_id?: string | null;
  customer_label?: string | null;
  product_area?: string | null;
  course_name?: string | null;
  module_name?: string | null;
  lesson_name?: string | null;
  impact?: string | null;
  evidence?: string | null;
  reported_urgency?: string | null;
  triage_priority?: string | null;
  submitter_name?: string | null;
  captured_at: string;
  destination_key: string;
  destination_label: string;
  accountable_team: string;
  owner_founder_id?: string | null;
  owner_name?: string | null;
  status: string;
  status_label: string;
  status_reason?: string | null;
  resolution_note?: string | null;
  duplicate_of_id?: string | null;
  routing_state: 'pending' | 'routed' | 'failed' | string;
  routing_error?: string | null;
  row_version: number;
  created_at: string;
  delivery_commitment: false;
}

export interface FeedbackList {
  view: string;
  items: FeedbackItem[];
  counts: { total_reports: number; distinct_accounts: number };
  permissions: { triage: boolean; write: boolean };
  delivery_commitment: false;
}

export interface FeedbackDetail {
  item: FeedbackItem;
  submission: {
    id: string;
    feedback_type: string;
    title: string;
    observation: string;
    context_kind: string;
    customer_label?: string | null;
    created_at: string;
    submitter_name?: string | null;
  };
  attachments: Array<{ id: string; file_name: string; content_type: string; byte_size: number }>;
  comments: Array<{ id: string; author_name?: string | null; body: string; kind: string; visibility: string; created_at: string }>;
  history: Array<{ id: string; from_category?: string | null; to_category?: string | null; from_destination?: string | null; to_destination?: string | null; reason: string; created_at: string }>;
  links: Array<{ id: string; item_id: string; related_item_id: string; link_type: string }>;
  suggestions: Array<{ id: string; title: string; category: string; status: string; auto_merge: false }>;
  owners: Array<{ id: string; full_name?: string | null }>;
  permissions: { triage: boolean; write: boolean; submitter: boolean };
  delivery_commitment: false;
}

export interface FeedbackAccess {
  triage: boolean;
  write: boolean;
  delivery_commitment: false;
}

export async function feedbackAccess(): Promise<FeedbackAccess> {
  return (await crmClient.get(`${base}/access`)).data;
}

export async function previewFeedback(body: { feedback_type: string; observation?: string }): Promise<FeedbackDestinationPreview> {
  return (await crmClient.post(`${base}/preview`, body)).data;
}

export async function submitFeedback(body: Record<string, unknown>): Promise<{
  replay: boolean;
  delivery_commitment: false;
  hint?: FeedbackDestinationPreview['hint'];
  destination: { key: string; label: string; accountable_team: string; routing_reason: string };
  submission: { id: string };
  item: FeedbackItem;
}> {
  return (await crmClient.post(base, body)).data;
}

export async function listFeedback(params: Record<string, string>): Promise<FeedbackList> {
  return (await crmClient.get(`${base}/items`, { params })).data;
}

export async function getFeedbackItem(id: string): Promise<FeedbackDetail> {
  return (await crmClient.get(`${base}/items/${id}`)).data;
}

export async function rerouteFeedback(id: string, body: Record<string, unknown>): Promise<{ item: FeedbackItem }> {
  return (await crmClient.post(`${base}/items/${id}/reroute`, body)).data;
}

export async function splitFeedback(id: string, body: Record<string, unknown>): Promise<{ items: FeedbackItem[]; original_item: FeedbackItem }> {
  return (await crmClient.post(`${base}/items/${id}/split`, body)).data;
}

export async function setFeedbackStatus(id: string, body: Record<string, unknown>): Promise<{ item: FeedbackItem }> {
  return (await crmClient.post(`${base}/items/${id}/status`, body)).data;
}

export async function setFeedbackOwner(id: string, body: Record<string, unknown>): Promise<{ item: FeedbackItem }> {
  return (await crmClient.post(`${base}/items/${id}/owner`, body)).data;
}

export async function commentFeedback(id: string, body: Record<string, unknown>): Promise<{ item: FeedbackItem }> {
  return (await crmClient.post(`${base}/items/${id}/comments`, body)).data;
}

export async function linkFeedbackDuplicate(id: string, body: Record<string, unknown>): Promise<{ item: FeedbackItem }> {
  return (await crmClient.post(`${base}/items/${id}/duplicates`, body)).data;
}

export async function retryFeedbackRouting(id: string, expectedVersion: number): Promise<{ item: FeedbackItem; queue_entries: number }> {
  return (await crmClient.post(`${base}/items/${id}/retry-routing`, { expected_version: expectedVersion })).data;
}
