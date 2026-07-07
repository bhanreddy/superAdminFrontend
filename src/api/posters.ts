import { Platform } from 'react-native';
import { superAdminClient } from './superAdminClient';

export type FestivalPoster = {
  id: string;
  title: string;
  image_path: string;
  image_url: string | null;
  target_apps: string[];
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  status: 'live' | 'upcoming' | 'expired' | 'disabled';
  created_at: string;
};

export const POSTER_APPS = ['schoolims', 'medipos', 'paperforge'] as const;

export async function listPosters(): Promise<FestivalPoster[]> {
  const response = await superAdminClient.get('/api/super-admin/posters');
  return response.data?.posters ?? [];
}

export async function createPoster(params: {
  localUri: string;
  mimeType: string;
  title: string;
  targetApps: string[];
  startsAt: string;
  endsAt: string;
  createdBy?: string | null;
}): Promise<FestivalPoster> {
  const formData = new FormData();

  if (Platform.OS === 'web') {
    const blob = await (await fetch(params.localUri)).blob();
    const ext = params.mimeType.includes('png') ? 'png' : params.mimeType.includes('webp') ? 'webp' : 'jpg';
    formData.append('file', new File([blob], `poster.${ext}`, { type: params.mimeType }));
  } else {
    formData.append('file', {
      uri: params.localUri,
      name: 'poster.jpg',
      type: params.mimeType,
    } as any);
  }

  formData.append('title', params.title);
  formData.append('target_apps', JSON.stringify(params.targetApps));
  formData.append('starts_at', params.startsAt);
  formData.append('ends_at', params.endsAt);
  if (params.createdBy) formData.append('created_by', params.createdBy);

  const response = await superAdminClient.post('/api/super-admin/posters', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return response.data?.poster;
}

export async function updatePoster(
  id: string,
  patch: Partial<Pick<FestivalPoster, 'title' | 'starts_at' | 'ends_at' | 'is_active' | 'target_apps'>>,
): Promise<FestivalPoster> {
  const response = await superAdminClient.patch(`/api/super-admin/posters/${id}`, patch);
  return response.data?.poster;
}

export async function deletePoster(id: string): Promise<void> {
  await superAdminClient.delete(`/api/super-admin/posters/${id}`);
}
