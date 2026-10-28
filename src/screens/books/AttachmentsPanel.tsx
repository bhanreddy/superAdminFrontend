import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useBooksAccess as useAuth } from './BooksCompanyContext';
import { useTheme } from '../../contexts/ThemeContext';
import { superAdminClient } from '../../api/superAdminClient';
import { BOOKS_BASE, message } from '../../api/books';
import { Action, Table, Notice, ui } from './BooksUi';
export default function AttachmentsPanel({
  documentId,
}: {
  documentId?: string;
}) {
  const { colors } = useTheme();
  const { can } = useAuth();
  const [rows, setRows] = useState<any[]>([]),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      setRows(
        (
          await superAdminClient.get(`${BOOKS_BASE}/attachments`, {
            params: { document_id: documentId },
          })
        ).data,
      );
    } catch (e) {
      setError(message(e));
    }
  }, [documentId]);
  useEffect(() => {
    void load();
  }, [load]);
  async function upload() {
    setError('');
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (selection.canceled) return;
      const file = selection.assets[0];
      if ((file.size || 0) > 5242880)
        throw new Error('Choose a file up to 5 MiB.');
      setBusy(true);
      const body = new FormData();
      if (documentId) body.append('document_id', documentId);
      body.append(
        'file',
        file.file ||
          ({
            uri: file.uri,
            name: file.name,
            type: file.mimeType || 'application/octet-stream',
          } as any),
      );
      await superAdminClient.post(`${BOOKS_BASE}/attachments`, body);
      await load();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function download(file: any) {
    setBusy(true);
    setError('');
    try {
      const response = await superAdminClient.get(
        `${BOOKS_BASE}/attachments/${file.id}/download`,
        { responseType: 'arraybuffer' },
      );
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(
          new Blob([response.data], { type: 'application/octet-stream' }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const bytes = new Uint8Array(response.data);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 8192)
          binary += String.fromCharCode(...bytes.slice(i, i + 8192));
        const path = FileSystem.cacheDirectory + file.filename;
        await FileSystem.writeAsStringAsync(path, btoa(binary), {
          encoding: FileSystem.EncodingType.Base64,
        });
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path);
        else throw new Error('File sharing is unavailable.');
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      <View
        style={[ui.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}
      >
        <Text style={[ui.title, { color: colors.textPrimary }]}>
          {documentId ? 'Attachments' : 'Document library'}
        </Text>
        {can('books.documents.upload') && <Action label="Upload document" onPress={upload} disabled={busy} />}
      </View>
      {error && <Notice error text={error} />}
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
        Store receipts and supporting files, up to 5 MiB each. Files are
        downloaded as attachments.
      </Text>
      <Table
        rows={rows}
        columns={[
          { key: 'filename', label: 'File', width: 260 },
          { key: 'number', label: 'Linked document', width: 180 },
          {
            key: 'size',
            label: 'Size',
            width: 100,
            render: (r) => (
              <Text style={{ color: colors.textPrimary }}>
                {(r.size / 1024).toFixed(1)} KiB
              </Text>
            ),
          },
          {
            key: 'download',
            label: 'Action',
            width: 140,
            render: (r) => (
              <Action
                label="Download file"
                secondary
                disabled={busy || !can('books.data.export')}
                onPress={() => void download(r)}
              />
            ),
          },
        ]}
        empty="No supporting documents uploaded yet."
      />
    </View>
  );
}
