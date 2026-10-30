import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Attachment, connectApi } from './api';

const types = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];
export async function pickConnectFile(): Promise<FormData | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: types,
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 8 * 1024 * 1024)
    throw new Error('Choose a file up to 8 MB.');
  const form = new FormData();
  if (Platform.OS === 'web') {
    if (!asset.file)
      throw new Error('This browser could not open the selected file.');
    form.append('file', asset.file, asset.name);
  } else
    form.append('file', {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType || 'application/octet-stream',
    } as any);
  return form;
}
function base64(bytes: Uint8Array): string {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i],
      b = bytes[i + 1],
      c = bytes[i + 2];
    result +=
      alphabet[a >> 2] +
      alphabet[((a & 3) << 4) | ((b || 0) >> 4)] +
      (i + 1 < bytes.length
        ? alphabet[((b & 15) << 2) | ((c || 0) >> 6)]
        : '=') +
      (i + 2 < bytes.length ? alphabet[c & 63] : '=');
  }
  return result;
}
export async function downloadConnectFile(file: Attachment): Promise<void> {
  const bytes = await connectApi.download(file.id);
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } else {
    if (!FileSystem.cacheDirectory)
      throw new Error('Private download cache is unavailable.');
    const target =
      FileSystem.cacheDirectory +
      'connect-' +
      file.id +
      '.' +
      file.filename.split('.').pop();
    await FileSystem.writeAsStringAsync(target, base64(new Uint8Array(bytes)), {
      encoding: FileSystem.EncodingType.Base64,
    });
    try {
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(target, {
          mimeType: file.mime,
          dialogTitle: file.filename,
        });
      else throw new Error('Sharing is unavailable on this device.');
    } finally {
      await FileSystem.deleteAsync(target, { idempotent: true });
    }
  }
}
