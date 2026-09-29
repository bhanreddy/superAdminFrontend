import AsyncStorage from '@react-native-async-storage/async-storage';
import { crmClient } from '../api/crmClient';

const QUEUE_KEY = 'field_visit_queue_v1';
const DRAFT_KEY = 'field_visit_drafts_v1';

export type QueueStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export interface QueueItem {
  client_key: string;
  kind: 'CHECK_IN' | 'UPDATE' | 'COMPLETE' | 'DAY_START';
  payload: any;
  event_time: string;
  status: QueueStatus;
  attempts: number;
  error?: string;
}

function uuid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function newClientKey(prefix = 'fv') {
  return `${prefix}_${uuid()}`;
}

async function readQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function writeQueue(items: QueueItem[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

export async function enqueueOp(kind: QueueItem['kind'], payload: any): Promise<QueueItem> {
  const items = await readQueue();
  const item: QueueItem = {
    client_key: payload.client_key || newClientKey(),
    kind, payload: { ...payload, client_key: payload.client_key || undefined },
    event_time: new Date().toISOString(), status: 'pending', attempts: 0,
  };
  item.payload.client_key = item.client_key;
  items.push(item);
  await writeQueue(items);
  return item;
}

async function postKind(item: QueueItem) {
  if (item.kind === 'DAY_START') return (await crmClient.post('/api/super-admin/field/day/start', item.payload)).data;
  if (item.kind === 'CHECK_IN') return (await crmClient.post('/api/super-admin/field/visits/check-in', item.payload)).data;
  if (item.kind === 'COMPLETE') {
    const { visit_id, ...rest } = item.payload;
    return (await crmClient.post(`/api/super-admin/field/visits/${visit_id}/complete`, rest)).data;
  }
  const { visit_id, ...rest } = item.payload;
  return (await crmClient.patch(`/api/super-admin/field/visits/${visit_id}`, rest)).data;
}

/** Sync exactly once (server dedupes on client_key). Returns remaining pending count. */
export async function syncQueue(): Promise<{ synced: number; failed: number; pending: number }> {
  const items = await readQueue();
  let synced = 0; let failed = 0;
  for (const item of items) {
    if (item.status === 'synced') continue;
    item.status = 'syncing';
    await writeQueue(items);
    try {
      await postKind(item);
      item.status = 'synced';
      synced += 1;
    } catch (e: any) {
      item.attempts += 1;
      item.status = 'failed';
      item.error = e?.response?.data?.error || e?.message || 'Sync failed';
      failed += 1;
    }
    await writeQueue(items);
  }
  // prune synced older than one entry batch to keep storage small (keep last 50)
  const pruned = (await readQueue()).filter((i) => i.status !== 'synced').concat(
    (await readQueue()).filter((i) => i.status === 'synced').slice(-20),
  );
  await writeQueue(pruned);
  return { synced, failed, pending: pruned.filter((i) => i.status === 'pending' || i.status === 'failed').length };
}

export async function getQueue() { return readQueue(); }

export const fieldVisitApi = {
  async startDay(payload: any) {
    try { return (await crmClient.post('/api/super-admin/field/day/start', payload)).data; }
    catch (e) { await enqueueOp('DAY_START', payload); throw e; }
  },
  async endDay(payload?: any) {
    try { return (await crmClient.post('/api/super-admin/field/day/end', payload || {})).data; }
    catch (e) { throw e; }
  },
  async reopenDay() {
    try { return (await crmClient.post('/api/super-admin/field/day/reopen', {})).data; }
    catch (e) { throw e; }
  },
  async today() { return (await crmClient.get('/api/super-admin/field/today')).data; },
  async getVisit(visit_id: string) {
    return (await crmClient.get(`/api/super-admin/field/visits/${visit_id}`)).data;
  },
  async checkIn(payload: any) {
    try { return (await crmClient.post('/api/super-admin/field/visits/check-in', payload)).data; }
    catch (e) { await enqueueOp('CHECK_IN', payload); throw e; }
  },
  async updateVisit(visit_id: string, payload: any) {
    try { return (await crmClient.patch(`/api/super-admin/field/visits/${visit_id}`, payload)).data; }
    catch (e) { await enqueueOp('UPDATE', { visit_id, ...payload }); throw e; }
  },
  async completeVisit(visit_id: string, payload: any) {
    try { return (await crmClient.post(`/api/super-admin/field/visits/${visit_id}/complete`, payload)).data; }
    catch (e) { await enqueueOp('COMPLETE', { visit_id, ...payload }); throw e; }
  },
  async skipVisit(visit_id: string, reason: string) {
    return (await crmClient.post(`/api/super-admin/field/visits/${visit_id}/skip`, { reason })).data;
  },
  async timeline(visit_id: string) { return (await crmClient.get(`/api/super-admin/field/visits/${visit_id}/timeline`)).data; },
  async getHomeBase() { return (await crmClient.get('/api/super-admin/field/home-base')).data; },
  async setHomeBase(payload: any) { return (await crmClient.put('/api/super-admin/field/home-base', payload)).data; },
  async findDuplicates(payload: any) { return (await crmClient.post('/api/super-admin/field/schools/duplicates', payload)).data; },
  async createSchool(payload: any) { return (await crmClient.post('/api/super-admin/field/schools', payload)).data; },
  async saveProfile(accountId: string, payload: any) { return (await crmClient.put(`/api/super-admin/field/schools/${accountId}/profile`, payload)).data; },
  async addContact(accountId: string, payload: any) { return (await crmClient.post(`/api/super-admin/field/schools/${accountId}/contacts`, payload)).data; },
  async recordDemo(visitId: string, payload: any) { return (await crmClient.post(`/api/super-admin/field/visits/${visitId}/demo`, payload)).data; },
  async searchSchools(q: string) { return (await crmClient.get('/api/super-admin/field/schools/search', { params: { q } })).data; },
  async getPlan(date: string) { return (await crmClient.get('/api/super-admin/field/plan', { params: { date } })).data; },
  async addPlanStop(payload: any) { return (await crmClient.post('/api/super-admin/field/plan/stops', payload)).data; },
  async removePlanStop(id: string) { return (await crmClient.delete(`/api/super-admin/field/plan/stops/${id}`)).data; },
  async followups() { return (await crmClient.get('/api/super-admin/field/followups')).data; },
  async team() { return (await crmClient.get('/api/super-admin/field/team')).data; },
};

export async function saveDraft(visitId: string, stage: string, data: any) {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[`${visitId}:${stage}`] = { data, saved_at: new Date().toISOString() };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(all));
  } catch { /* storage best-effort */ }
}

export async function loadDraft(visitId: string, stage: string) {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    return all[`${visitId}:${stage}`]?.data || null;
  } catch { return null; }
}
