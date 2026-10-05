import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, ScrollView, Modal, Pressable, Alert, Platform, Image, useWindowDimensions } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { superAdminClient } from '../../src/api/superAdminClient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Button } from '../../src/components/ui/Button';
import { MEDIA_EDITORIAL } from '../../src/constants/theme';
import { BrandedQrPreview as QrPreview, QrArtifact as Artifact } from '../../src/components/media/BrandedQrPreview';
import { validateMediaSource, youtubeVideoId } from '../../src/utils/mediaLinks';
type Provider = 'youtube' | 'nexsyrus_cdn' | 'external_secure' | 'hls';
type Resource = {
    id: string;
    title: string;
    description: string;
    status: string;
    sourceVersion: number;
    durationSeconds?: number;
    qrs: {
        id: string;
        displayCode: string;
        status: string;source_id?:string;source_version?:number;
    }[];
};
type Source = {
    id: string;
    version: number;
    provider: Provider;
    reason: string;
};
type Detail = Resource & {
    sources: Source[];
    mapping: {
        lesson: string;
        chapter: string;
        standard_grade_level: string;
        canonical_subject_name: string;
    }[];
    auditLog: {
        action: string;
        reason: string;
        created_at: string;
    }[];
};
type Usage = {
    total_scans: number;
    unique_learners: number;
    failed_scans: number;
    video_starts: number;
    completions: number;
    average_watch_percentage: number;
    top: {
        id: string;
        display_code: string;
        title: string;
        scans: number;
    }[];
};
const ROOT = '/api/super-admin/media';
export default function MediaQrManager() {
    const compact = useWindowDimensions().width < 980;
    const { colors: c } = useTheme(), [resources, setResources] = useState<Resource[]>([]), [usage, setUsage] = useState<Usage | null>(null), [search, setSearch] = useState(''), [cursor, setCursor] = useState<string | null>(null), [detail, setDetail] = useState<Detail | null>(null), [artifact, setArtifact] = useState<Artifact | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [createOpen, setCreateOpen] = useState(false), [step, setStep] = useState(0), [tab, setTab] = useState('Overview');
    const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [internalName, setInternalName] = useState(''), [lessonIds, setLessonIds] = useState(''), [duration, setDuration] = useState(''), [language, setLanguage] = useState('en'), [provider, setProvider] = useState<Provider>('youtube'), [reference, setReference] = useState(''), [displayCode, setDisplayCode] = useState(''), [reason, setReason] = useState(''), [schoolIds, setSchoolIds] = useState(''), [audience, setAudience] = useState<'all' | 'student' | 'parent' | 'staff'>('all'), [replaceOpen, setReplaceOpen] = useState(false), [variant, setVariant] = useState('square'), [duplicateId, setDuplicateId] = useState<string | null>(null), [selectedQr, setSelectedQr] = useState<string | null>(null), [gradeLevels, setGradeLevels] = useState(''), [classIds, setClassIds] = useState(''), [yearIds, setYearIds] = useState(''), [versionIds, setVersionIds] = useState('');
    const receipts = useRef(new Map<string, string>());
    const creation = useRef<{ id: string } | null>(null);
    const [resourceSaved, setResourceSaved] = useState(false);
    const [accent, setAccent] = useState('burgundy');
    const mutate = async (path: string, body: unknown, method: 'post' | 'patch' = 'post') => { const fingerprint = method + path + JSON.stringify(body); let key = receipts.current.get(fingerprint); if (!key) {
        key = `media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        receipts.current.set(fingerprint, key);
    } const response = await superAdminClient[method](ROOT + path, body, { headers: { 'Idempotency-Key': key } }); receipts.current.delete(fingerprint); return response.data.data; };
    const showError = (e: unknown) => { const typed = e as {
        response?: {
            data?: {
                error?: string;
                resourceId?: string;
            };
        };
    }; setDuplicateId(typed.response?.data?.resourceId || null); setError(typed.response?.data?.error || (e instanceof Error ? e.message : 'Media request failed. Retry.')); };
    const load = useCallback(async (after?: string) => { setBusy(true); setError(''); try {
        const [r, u] = await Promise.all([superAdminClient.get(ROOT, { params: { search, ...(after ? { after } : {}) } }), superAdminClient.get(ROOT + '/usage')]);
        setResources(prev => after ? [...prev, ...r.data.data.items] : r.data.data.items);
        setCursor(r.data.data.nextCursor);
        setUsage(u.data.data);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setBusy(false);
    } }, [search]);
    useEffect(() => { void load(); }, []);
    const open = async (id: string) => { setError(''); try {
        const r = await superAdminClient.get(ROOT + '/' + id);
        setDetail(r.data.data);
        setTitle(r.data.data.title);
        setDescription(r.data.data.description);
        setDuration(String(r.data.data.durationSeconds || ''));
        setArtifact(null);
        const q = r.data.data.qrs[0];
        setSelectedQr(q?.id || null);
        if (q) {
            const a = await superAdminClient.get(ROOT + `/qr/${q.id}/artifact`);
            setArtifact(a.data.data.artifact);
        }
    }
    catch (e) {
        showError(e);
    } };
    const source = () => validateMediaSource(provider, reference);
    const parseIds = (value: string) => value.split(',').map(x => x.trim()).filter(Boolean);
    const accessPolicy = () => ({ roles: audience === 'all' ? [] : audience === 'staff' ? ['staff', 'teacher', 'principal'] : [audience], schoolIds: parseIds(schoolIds).map(Number), gradeLevels: parseIds(gradeLevels), classIds: parseIds(classIds), academicYearIds: parseIds(yearIds), curriculumVersionIds: parseIds(versionIds) });
    const validateDuration = () => {
        if (duration && (!Number.isInteger(Number(duration)) || Number(duration) <= 0 || Number(duration) > 86400)) throw new Error('Duration must be a whole number of seconds, from 1 to 86400.');
    };
    const validateMetadata = () => {
        if (!title.trim() || title.trim().length > 250) throw new Error('Enter a resource title of up to 250 characters.');
        if (!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(language)) throw new Error('Use a language code such as en or en-IN.');
        validateDuration();
    };
    const validateCode = () => {
        if (!/^[A-Z0-9][A-Z0-9-]{2,79}$/.test(displayCode.trim())) throw new Error('Use 3–80 uppercase letters, numbers or hyphens for the printed code.');
        if (parseIds(schoolIds).some(id => !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0)) throw new Error('School IDs must be positive whole numbers, separated by commas.');
    };
    const save = async () => { setBusy(true); setError(''); try {
        validateCode();
        const qr = { displayCode: displayCode.trim(), style: { variant, accent }, policy: accessPolicy() };
        if (!creation.current) {
            validateMetadata();
            const r = await mutate('', { title: title.trim(), description, internalName: internalName.trim() || title.trim().slice(0, 150), language, lessonIds: parseIds(lessonIds), ...(duration ? { durationSeconds: Number(duration) } : {}), source: source() });
            creation.current = { id: r.id }; setResourceSaved(true);
        }
        const created = creation.current;
        await mutate(`/${created.id}/qr`, qr);
        setCreateOpen(false);
        setStep(0);
        setTab('QR');
        await load();
        await open(created.id);
    }
    catch (e) {
        showError(e);
    }
    finally {
        setBusy(false);
    } };
    const qrAction = async (id: string, action: string) => { if (!reason.trim()) {
        setError('Enter a reason before changing a QR.');
        return;
    } setBusy(true); try {
        await mutate(`/qr/${id}/${action}`, { reason });
        if (detail)
            await open(detail.id);
        await load();
    }
    catch (e) {
        showError(e);
    }
    finally {
        setBusy(false);
    } };
    const revoke = (id: string) => { if (Platform.OS === 'web') {
        if (window.confirm('Revoke this printed learning code permanently? It cannot be reactivated.'))
            void qrAction(id, 'revoke');
    }
    else
        Alert.alert('Revoke learning code?', 'This is permanent. Printed books using it will lose access.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke', style: 'destructive', onPress: () => void qrAction(id, 'revoke') }]); };
    const download = async (id: string, format: 'svg' | 'png') => { try {
        if (Platform.OS === 'web') {
            const response = await superAdminClient.get(ROOT + `/qr/${id}/artifact?format=${format}`, { responseType: 'blob' });
            const url = URL.createObjectURL(response.data);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `Nexsyrus-${id}.${format}`;
            document.body.appendChild(anchor);
            anchor.click(); anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        else {
            const nativeResponse = await superAdminClient.get(ROOT + `/qr/${id}/artifact?format=${format}`, { responseType: 'arraybuffer' });
            const bytes = new Uint8Array(nativeResponse.data), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
            let encoded = '';
            for (let i = 0; i < bytes.length; i += 3) {
                const b = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
                encoded += alphabet[(b >> 18) & 63] + alphabet[(b >> 12) & 63] + (i + 1 < bytes.length ? alphabet[(b >> 6) & 63] : '=') + (i + 2 < bytes.length ? alphabet[b & 63] : '=');
            }
            if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is unavailable on this device.');
            const path = FileSystem.cacheDirectory + `Nexsyrus-${id}.${format}`;
            await FileSystem.writeAsStringAsync(path, encoded, { encoding: FileSystem.EncodingType.Base64 });
            await Sharing.shareAsync(path);
        }
    }
    catch (e) {
        showError(e);
    } };
    const field = (label: string, value: string, set: (v: string) => void, multiline = false) => <View style={{ gap: 6, marginBottom: 14 }}><Text style={{ color: c.textSecondary, fontSize: 12 }}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={set} multiline={multiline} autoCapitalize="none" autoCorrect={false} editable={!busy && !(createOpen && resourceSaved && step !== 2)} style={{ color: c.textPrimary, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 10, padding: 12, minHeight: 48 }}/></View>;
    const startCreation = () => {
        creation.current = null; setResourceSaved(false); setError(''); setDuplicateId(null);
        setTitle(''); setDescription(''); setInternalName(''); setLessonIds(''); setReference(''); setDuration('');
        setProvider('youtube'); setLanguage('en'); setVariant('premium-frame'); setAccent('burgundy');
        setDisplayCode(`NEX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`);
        setSchoolIds(''); setAudience('all'); setGradeLevels(''); setClassIds(''); setYearIds(''); setVersionIds('');
        setCreateOpen(true); setStep(0);
    };
    const closeWizard = () => {
        if (busy) return;
        setCreateOpen(false); setReplaceOpen(false); setError('');
        if (creation.current) { setTab('QR'); void open(creation.current.id); void load(); }
        else if (detail) void open(detail.id);
    };
    const continueWizard = () => {
        setError('');
        try { if (step === 0) source(); else validateMetadata(); setStep(step + 1); }
        catch (e) { showError(e); }
    };
    const sourceControls = <>
        <Text style={{ color: c.textSecondary, lineHeight: 22, marginBottom: 16 }}>Paste your video link first. Its destination is stored securely; the QR contains a SchoolIMS learning code.</Text>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>{([
            ['youtube', 'YouTube link'], ['nexsyrus_cdn', 'Private R2'], ['external_secure', 'Secure CDN'], ['hls', 'Secure HLS'],
        ] as [Provider, string][]).map(([p, label]) => <Button title={label} key={p} disabled={busy || resourceSaved && createOpen} variant={provider === p ? 'secondary' : 'ghost'} size="sm" onPress={() => { setProvider(p); setReference(''); setError(''); }} />)}</View>
        {field(provider === 'youtube' ? 'Video link (HTTPS)' : provider === 'nexsyrus_cdn' ? 'Private R2 object key' : 'Configured secure asset ID', reference, setReference)}
        <Text style={{ color: c.textTertiary, fontSize: 12, lineHeight: 20, marginBottom: 18 }}>{provider === 'youtube' ? 'Accepts watch, youtu.be, Shorts, live and embed links. Example: https://youtu.be/AbCdEfGhI_1' : 'Use an existing asset from the configured private media provider. It is checked before the QR is created.'}</Text>
    </>;
    const styleControls = <>
        <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 8 }}>Frame</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>{[
            ['square', 'Classic'], ['soft-rounded', 'Soft rounded'], ['premium-frame', 'Signature frame'], ['minimal', 'Minimal'],
        ].map(([v, label]) => <Button title={label} key={v} size="sm" disabled={busy} variant={variant === v ? 'secondary' : 'ghost'} onPress={() => setVariant(v)} />)}</View>
        <Text style={{ color: c.textSecondary, fontSize: 12, marginBottom: 8 }}>Ink colour</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>{['burgundy', 'graphite', 'blue', 'violet'].map(a => <Button key={a} title={a[0].toUpperCase()+a.slice(1)} size="sm" disabled={busy} variant={accent === a ? 'secondary' : 'ghost'} onPress={() => setAccent(a)} />)}</View>
    </>;
    const tabs = ['Overview', 'QR', 'Source', 'Curriculum Mapping', 'Analytics', 'Versions', 'Access', 'Audit Log'];
    return <View style={{ flex: 1, backgroundColor: c.background, padding: compact ? 16 : 24 }}><View style={{ flexDirection: compact ? 'column' : 'row', gap: 16, alignItems: compact ? 'flex-start' : 'center', justifyContent: 'space-between', marginBottom: 22 }}><View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}><Image source={require('../../assets/logo.png')} accessibilityLabel="Nexsyrus logo" style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: '#FFFFFF' }} /><View style={{ flexShrink: 1 }}><Text style={{ color: MEDIA_EDITORIAL.accent, fontSize: 11, letterSpacing: 2, fontWeight: '700' }}>NEXSYRUS / LEARNING CODES</Text><Text style={{ color: c.textPrimary, fontSize: compact ? 24 : 28, fontWeight: '700', marginTop: 8 }}>Media QR Manager</Text><Text style={{ color: c.textSecondary, marginTop: 6 }}>Paste a link. Create a branded learning code.</Text></View></View><Button title="+ Create Media QR" disabled={busy} onPress={startCreation}/></View>
 {error ? <Text accessibilityRole="alert" style={{ color: c.error, marginBottom: 12 }}>{error}</Text> : null}
 {usage && <View style={{ flexDirection: 'row', gap: 28, flexWrap: 'wrap', paddingVertical: 20, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.border, marginBottom: 20 }}>{[['Scans', usage.total_scans], ['Unique learners', usage.unique_learners], ['Video starts', usage.video_starts], ['Completions', usage.completions], ['Failed scans', usage.failed_scans]].map(([label, value]) => <View key={label}><Text style={{ fontSize: 24, color: c.textPrimary, fontWeight: '600' }}>{value}</Text><Text style={{ fontSize: 12, color: c.textSecondary }}>{label} · 30 days</Text></View>)}</View>}
 <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}><TextInput accessibilityLabel="Search resource or QR code" placeholder="Search resource title or QR code" placeholderTextColor={c.textTertiary} value={search} onChangeText={setSearch} onSubmitEditing={() => void load()} style={{ flex: 1, padding: 12, borderWidth: 1, borderColor: c.border, color: c.textPrimary, borderRadius: 10 }}/><Button title="Search" variant="outline" loading={busy} onPress={() => void load()}/></View>
 <View style={{ flex: 1, flexDirection: 'row', gap: 20 }}>{(!compact || !detail) && <FlatList style={{ flex: 1 }} data={resources} keyExtractor={r => r.id} renderItem={({ item: r }) => <Pressable accessibilityRole="button" onPress={() => void open(r.id)} style={{ padding: 18, marginBottom: 10, borderRadius: 14, backgroundColor: detail?.id === r.id ? c.primaryMuted : c.surface, borderWidth: 1, borderColor: c.border }}><Text style={{ color: c.textPrimary, fontWeight: '600', fontSize: 16 }}>{r.title}</Text><Text style={{ color: c.textSecondary, marginTop: 7, fontSize: 12 }}>Source V{r.sourceVersion} · {r.status} · {r.qrs.length} learning codes</Text>{r.qrs.map(q => <Text key={q.id} style={{ color: c.textTertiary, fontSize: 11, marginTop: 4 }}>{q.displayCode} / {q.status}</Text>)}</Pressable>} ListEmptyComponent={<Text style={{ color: c.textSecondary, padding: 20 }}>{busy ? 'Loading resources…' : 'No matching resources. Create your first canonical media resource.'}</Text>} ListFooterComponent={cursor ? <Button title="Load more" variant="ghost" onPress={() => void load(cursor)}/> : null}/>}
 {detail && <ScrollView style={{ flex: 1, backgroundColor: c.surface, borderRadius: 16 }} contentContainerStyle={{ padding: compact ? 16 : 22 }}>{compact && <Button title="Back to library" variant="ghost" onPress={() => setDetail(null)} />}<Text style={{ fontSize: 22, color: c.textPrimary, fontWeight: '600' }}>{detail.title}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginVertical:12}}>{['ACTIVE','PAUSED','ARCHIVED'].map(status=><Button key={status} title={status===detail.status?`${status} · Current`:status} variant="ghost" disabled={busy||status===detail.status} onPress={async()=>{setBusy(true);try{await mutate('/'+detail.id,{status,reason},'patch');await open(detail.id);await load();}catch(e){showError(e);}finally{setBusy(false);}}}/>)}</View><Button title="Copy Resource ID" variant="ghost" onPress={() => void Clipboard.setStringAsync(detail.id)}/><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 }}>{tabs.map(t => <Button key={t} title={t} size="sm" variant={tab === t ? 'secondary' : 'ghost'} onPress={() => setTab(t)}/>)}</View>
 {tab === 'Overview' && <><Text style={{ color: c.textSecondary, lineHeight: 24 }}>{detail.description}</Text>{field('Edit title', title, setTitle)}{field('Edit description', description, setDescription, true)}{field('Reason for metadata change', reason, setReason)}<Button title="Save metadata" disabled={busy} onPress={async () => { setBusy(true); try {
            await mutate('/' + detail.id, { title, description, reason }, 'patch');
            await open(detail.id);
            await load();
        }
        catch (e) {
            showError(e);
        }
        finally {
            setBusy(false);
        } }}/><Text style={{ color: c.textTertiary, marginVertical: 14 }}>The QR keeps its identity when the video changes. YouTube remains publicly accessible on YouTube.</Text>{artifact && <QrPreview artifact={artifact}/>}</>}
 {tab === 'QR' && <>{artifact && <QrPreview artifact={artifact}/>}<Text style={{ color: c.textSecondary, marginVertical: 12 }}>{artifact ? 'Decoder verified · Nexsyrus logo · error correction H' : 'Generate a verified QR from this resource’s stored video source.'}</Text>{field('Canonical display code', displayCode, setDisplayCode)}{styleControls}<Button title="Generate Draft QR" loading={busy} disabled={!detail.sources.length} onPress={async () => { try {
            validateCode(); setError(''); setBusy(true);
            await mutate(`/${detail.id}/qr`, { displayCode: displayCode.trim(), style: { variant, accent }, policy: { ...accessPolicy() } });
            await open(detail.id);
            await load();
        }
        catch (e) {
            showError(e);
        }
        finally {
            setBusy(false);
        } }}/>{field('Reason for lifecycle change', reason, setReason)}{detail.qrs.map(q => <View key={q.id} style={{ gap: 8, marginTop: 20 }}><Pressable accessibilityRole="button" onPress={async () => { try {
            const a = await superAdminClient.get(ROOT + `/qr/${q.id}/artifact`);
            setArtifact(a.data.data.artifact);
            setSelectedQr(q.id);
        }
        catch (e) {
            showError(e);
        } }}><Text style={{ color: c.textPrimary }}>{q.displayCode} / {q.status} · Source V{q.source_version}{selectedQr === q.id ? ' · Selected' : ' · Preview'}</Text></Pressable><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}><Button title="Activate" variant="outline" disabled={busy || q.status === 'REVOKED'} onPress={() => void qrAction(q.id, 'activate')}/><Button title="Pause" variant="outline" disabled={busy || q.status === 'REVOKED'} onPress={() => void qrAction(q.id, 'pause')}/><Button title="Archive" variant="outline" disabled={busy || q.status === 'REVOKED'} onPress={() => void qrAction(q.id, 'archive')}/><Button title="Revoke" variant="danger" disabled={busy || q.status === 'REVOKED'} onPress={() => revoke(q.id)}/><Button title="SVG" variant="ghost" onPress={() => void download(q.id, 'svg')}/><Button title="PNG" variant="ghost" onPress={() => void download(q.id, 'png')}/></View></View>)}</>}
 {tab === 'Source' && <><Text style={{ color: c.textSecondary }}>Latest stored revision: V{detail.sources[0]?.version} · {detail.sources[0]?.provider}. Selected QR uses V{detail.qrs.find(q=>q.id===selectedQr)?.source_version}. Source references are encrypted in the canonical backend.</Text><Button title="Replace Source" onPress={() => { setReference('');setDuration(''); setReplaceOpen(true); }}/></>}
 {tab === 'Versions' && detail.sources.map(s => <View key={s.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderColor: c.border }}><Text style={{ color: c.textPrimary }}>V{s.version} · {s.provider}</Text><Text style={{ color: c.textSecondary }}>{s.reason}</Text><Button title="Restore for this QR" variant="ghost" disabled={busy || !selectedQr} onPress={async () => { try {
            await mutate(`/qr/${selectedQr}/restore`, { sourceId: s.id, reason: reason.trim() });
            await open(detail.id);
        }
        catch (e) {
            showError(e);
        } }}/></View>)}
 {tab === 'Curriculum Mapping' && <>{detail.mapping.map((m, i) => <Text key={i} style={{ color: c.textPrimary, marginBottom: 14 }}>{m.standard_grade_level} / {m.canonical_subject_name}\n{m.chapter} / {m.lesson}</Text>)}{field('Additional canonical lesson IDs (comma-separated)', lessonIds, setLessonIds)}{field('Reason for mapping', reason, setReason)}<Button title="Add Curriculum Mapping" disabled={busy} onPress={async () => { setBusy(true); try {
            await mutate(`/${detail.id}/mapping`, { lessonIds: parseIds(lessonIds), reason });
            await open(detail.id);
        }
        catch (e) {
            showError(e);
        }
        finally {
            setBusy(false);
        } }}/></>}
 {tab === 'Access' && <><Text style={{ color: c.textSecondary, marginBottom: 10 }}>Audience for the next QR or selected QR policy update</Text><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{(['all', 'student', 'parent', 'staff'] as const).map(a => <Button key={a} title={a} size="sm" variant={audience === a ? 'secondary' : 'ghost'} onPress={() => setAudience(a)}/>)}</View>{field('Specific school IDs (comma-separated; blank = shared)', schoolIds, setSchoolIds)}{field('Grade levels (e.g. GRADE_4, GRADE_5)', gradeLevels, setGradeLevels)}{field('Canonical class UUIDs', classIds, setClassIds)}{field('Academic year UUIDs', yearIds, setYearIds)}{field('Curriculum version UUIDs', versionIds, setVersionIds)}{field('Reason for access change', reason, setReason)}{detail.qrs.map(q => <Button key={q.id} title={`Update ${q.displayCode}`} variant="outline" loading={busy} onPress={async () => { try {
            await mutate(`/qr/${q.id}/policy`, { reason, policy: { ...accessPolicy() } });
            await open(detail.id);
        }
        catch (e) {
            showError(e);
        } }}/>)}</>}
 {tab === 'Analytics' && usage && <Text style={{ color: c.textPrimary, lineHeight: 26 }}>Platform usage, last 30 days\nAverage watch percentage: {Number(usage.average_watch_percentage).toFixed(1)}%\n{usage.top.map(t => `${t.display_code}: ${t.scans} scans`).join('\n')}</Text>}
 {tab === 'Audit Log' && detail.auditLog.map((a, i) => <View key={i} style={{ marginBottom: 14 }}><Text style={{ color: c.textPrimary, fontWeight: '600' }}>{a.action}</Text><Text style={{ color: c.textSecondary, fontSize: 12 }}>{a.reason} · {a.created_at}</Text></View>)}
 </ScrollView>}</View>
 <Modal visible={createOpen || replaceOpen} transparent animationType="fade" onRequestClose={closeWizard}>
    <View style={{ flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center', padding: compact ? 12 : 24 }}>
        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxWidth: 640, width: '100%', maxHeight: '90%', backgroundColor: c.surface, borderRadius: 24 }} contentContainerStyle={{ padding: compact ? 20 : 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Image source={require('../../assets/logo.png')} accessibilityLabel="Nexsyrus logo" style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
                <View style={{ flex: 1 }}><Text style={{ color: MEDIA_EDITORIAL.accent, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' }}>NEXSYRUS</Text><Text style={{ fontSize: 24, color: c.textPrimary, fontWeight: '600', marginTop: 4 }}>{replaceOpen ? 'Replace video source' : 'Create learning QR'}</Text></View>
            </View>
            {!replaceOpen && <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>{['Video link', 'Details', 'Generate'].map((label, i) => <View key={label} style={{ flex: 1, borderTopWidth: 3, borderColor: step >= i ? c.primary : c.border, paddingTop: 10 }}><Text style={{ color: step === i ? c.textPrimary : c.textSecondary, fontSize: 12, fontWeight: step === i ? '700' : '400' }}>{i+1}. {label}</Text></View>)}</View>}
            {replaceOpen || step === 0 ? sourceControls : step === 1 ? <>
                {field('Resource title', title, setTitle)}
                {field('Short description', description, setDescription, true)}
                {field('Internal resource name (optional)', internalName, setInternalName)}
                {field('Canonical lesson IDs (optional, comma-separated)', lessonIds, setLessonIds)}
                {field('Language', language, setLanguage)}
                {field('Duration in seconds (optional)', duration, setDuration)}
            </> : <>
                <View style={{ padding: 18, borderRadius: 16, borderWidth: 1, borderColor: c.border, backgroundColor: c.background, marginBottom: 20, gap: 8 }}>
                    <Text style={{ color: c.textPrimary, fontSize: 18, fontWeight: '600' }}>{title}</Text>
                    <Text style={{ color: c.textSecondary, fontSize: 12 }}>{provider === 'youtube' ? `YouTube · ${youtubeVideoId(reference)}` : provider.replace('_', ' ')}</Text>
                    <Text style={{ color: c.textSecondary, lineHeight: 21 }}>Includes the official Nexsyrus logo. The backend checks the video and decodes the final artwork before saving.</Text>
                </View>
                {field('Canonical display code', displayCode, setDisplayCode)}
                {styleControls}
                {field('Specific school IDs (optional, comma-separated)', schoolIds, setSchoolIds)}
                <Text style={{ color: c.textSecondary, lineHeight: 22, marginBottom: 20 }}>Blank school IDs allow authenticated SchoolIMS school accounts. The code is saved as a draft. Review its audience and activate it before printing.</Text>
            </>}
            {replaceOpen && <>{field('New source duration in seconds', duration, setDuration)}{field('Reason for replacement', reason, setReason)}</>}
            {resourceSaved && createOpen && <Text style={{ color: c.textSecondary, lineHeight: 22, marginBottom: 16 }}>The resource is saved. Retry QR generation to finish; it will reuse the saved resource.</Text>}
            {error ? <Text accessibilityRole="alert" style={{ color: c.error, lineHeight: 22, marginBottom: 14 }}>{error}</Text> : null}
            {duplicateId && <Button title="Use Existing Resource / Add Mapping" variant="outline" onPress={() => { setCreateOpen(false); setDuplicateId(null); setTab('Curriculum Mapping'); void open(duplicateId); }} />}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginTop: 8 }}>
                <Button title="Cancel" variant="ghost" disabled={busy} onPress={closeWizard} />
                {!replaceOpen && step > 0 && <Button title="Back" variant="outline" disabled={busy || resourceSaved} onPress={() => { setError(''); setStep(step-1); }} />}
                {replaceOpen ? <Button title="Replace source" loading={busy} onPress={async () => {
                    if (!detail) return;
                    setBusy(true); setError('');
                    try {
                        validateDuration();
                        await mutate(`/${detail.id}/source`, { source: source(), ...(duration ? { durationSeconds: Number(duration) } : {}), reason, expectedVersion: detail.sources[0]?.version });
                        setReplaceOpen(false); await open(detail.id); await load();
                    } catch (e) { showError(e); } finally { setBusy(false); }
                }} /> : <Button title={step === 2 ? resourceSaved ? 'Retry QR generation' : 'Create & generate QR' : 'Continue'} loading={busy} onPress={() => step === 2 ? void save() : continueWizard()} />}
            </View>
        </ScrollView>
    </View>
 </Modal></View>;
}
