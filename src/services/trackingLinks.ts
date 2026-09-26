import { crmClient } from '../api/crmClient';

export interface TrackLink {
  id: string;
  short_code: string;
  stable_url: string;
  status: 'ACTIVE' | 'DISABLED';
  expires_at?: string | null;
  row_version: number;
  destination_class: string;
  destination_url: string;
  medium: string;
  purpose: string;
  coverage: string;
  target_school_name_snapshot?: string | null;
  owner_founder_id?: string | null;
}

export async function listTrackLinks(): Promise<TrackLink[]> {
  return (await crmClient.get('/api/super-admin/crm/track-links')).data;
}

export async function createTrackLink(body: Record<string, unknown>): Promise<TrackLink> {
  return (await crmClient.post('/api/super-admin/crm/track-links', body)).data;
}

export async function createTrackLinksBulk(body: Record<string, unknown>): Promise<{ links: TrackLink[] }> {
  return (await crmClient.post('/api/super-admin/crm/track-links/bulk', body)).data;
}

export async function updateTrackLink(id: string, body: Record<string, unknown>): Promise<TrackLink> {
  return (await crmClient.patch(`/api/super-admin/crm/track-links/${id}`, body)).data;
}

export async function setTrackLinkStatus(id: string, status: 'enable' | 'disable', expectedVersion: number): Promise<TrackLink> {
  return (await crmClient.post(`/api/super-admin/crm/track-links/${id}/${status}`, { expected_version: expectedVersion })).data;
}

export async function fetchTrackQr(id: string, format: 'png' | 'svg' = 'png'): Promise<string> {
  const response = await crmClient.get(`/api/super-admin/crm/track-links/${id}/qr`, {
    params: { format, size: 512 },
    responseType: 'arraybuffer',
  });
  const bytes = new Uint8Array(response.data);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  const encoded = globalThis.btoa(binary);
  return format === 'svg' ? `data:image/svg+xml;base64,${encoded}` : `data:image/png;base64,${encoded}`;
}
