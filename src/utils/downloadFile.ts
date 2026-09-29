import { Platform } from 'react-native';
import { superAdminClient } from '../api/superAdminClient';
import { getStoredAccessToken } from '../api/tokens';

export async function downloadAuthorizedFile(apiPath: string, filename: string): Promise<void> {
  if (Platform.OS === 'web') {
    const response = await superAdminClient.get(apiPath, { responseType: 'blob', timeout: 120000 });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    return;
  }
  const FileSystem = require('expo-file-system');
  const Sharing = require('expo-sharing');
  const token = await getStoredAccessToken();
  const base = String(superAdminClient.defaults.baseURL || '').replace(/\/+$/, '');
  const destination = `${FileSystem.cacheDirectory}${filename}`;
  const result = await FileSystem.downloadAsync(`${base}${apiPath}`, destination, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/zip', dialogTitle: filename });
  }
}
