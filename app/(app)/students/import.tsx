import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { superAdminApi } from '../../../src/services/apiService';
import { School } from '../../../src/types/school';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import {
  Upload,
  FileCheck,
  Download,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  School2,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react-native';

// ── Template data ─────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = [
  'First Name', 'Last Name (optional)', 'Middle Name', 'Admission Number', 'PEN Number', 'APAR Number', 'Admission Date',
  'Class', 'Section', 'Gender', 'Date of Birth', 'Village', 'Email', 'Phone', 'Password',
  'Academic Year', 'Status', 'Category', 'Religion', 'Blood Group',
  'Father First Name', 'Father Last Name', 'Father Phone', 'Father Occupation',
  'Mother First Name', 'Mother Last Name', 'Mother Phone', 'Mother Occupation',
];
const TEMPLATE_EXAMPLE = [
  'Ravi', 'Kumar', '', 'ADM-2025-001', 'PEN2025001', '', '2025-06-01', '10', 'A', 'Male', '2010-03-15', 'Rampur',
  'ravi.kumar@example.com', '9876543210', 'student123', '2025-26', 'active',
  'General', 'Hindu', 'B+', 'Suresh', 'Kumar', '9876543200', 'Business',
  'Lakshmi', 'Kumar', '9876543201', 'Teacher',
];

const COLUMN_GROUPS = [
  {
    label: 'Required', color: '#EF4444', rgb: '239,68,68',
    columns: 'First Name, Admission Number, Admission Date, Class, Section, Gender, Academic Year'
  },
  {
    label: 'Login', color: '#8B5CF6', rgb: '139,92,246',
    columns: 'Email, Phone, Password'
  },
  {
    label: 'Optional', color: '#3B82F6', rgb: '59,130,246',
    columns: 'Last Name (optional), Middle Name, PEN Number, APAR Number, Village, Date of Birth, Status, Category, Religion, Blood Group'
  },
  {
    label: 'Parent', color: '#10B981', rgb: '16,185,129',
    columns: 'Father First Name, Father Last Name, Father Phone, Father Occupation, Mother First Name, Mother Last Name, Mother Phone, Mother Occupation'
  },
];

// ── CSV helpers ───────────────────────────────────────────────────────────────

function generateTemplateCSV(): string {
  const esc = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"` : v;
  return `${TEMPLATE_HEADERS.map(esc).join(',')}\n${TEMPLATE_EXAMPLE.map(esc).join(',')}\n`;
}

function downloadTemplateWeb() {
  const csv = generateTemplateCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'student_import_template.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
async function downloadTemplateNative() {
  try {
    const FileSystem = require('expo-file-system');
    const Sharing = require('expo-sharing');
    const csv = generateTemplateCSV();
    const fileUri = FileSystem.documentDirectory + 'student_import_template.csv';
    await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv', dialogTitle: 'Save template',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Saved', `Template saved to:\n${fileUri}`);
    }
  } catch (err: any) { Alert.alert('Error', err.message || 'Failed to save template'); }
}
const handleDownloadTemplate = () =>
  Platform.OS === 'web' ? downloadTemplateWeb() : downloadTemplateNative();

// ── Custom School Picker (replaces native Picker – fixes dark-mode white bg) ──

interface SchoolPickerProps {
  schools: School[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isDark: boolean;
}

function SchoolPicker({ schools, selectedId, onSelect, isDark }: SchoolPickerProps) {
  const [open, setOpen] = useState(false);
  const chevronAnim = useRef(new Animated.Value(0)).current;
  const selected = schools.find(s => s.id === selectedId);

  const toggle = () => {
    Animated.spring(chevronAnim, {
      toValue: open ? 0 : 1, useNativeDriver: true, tension: 140, friction: 9,
    }).start();
    setOpen(v => !v);
  };

  const chevronRotate = chevronAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  const triggerBg = isDark ? 'rgba(255,255,255,0.06)' : '#F4F5FC';
  const triggerBorder = open
    ? '#7C6FFF'
    : (isDark ? 'rgba(124,111,255,0.28)' : 'rgba(124,111,255,0.28)');
  const sheetBg = isDark ? '#1B1D2E' : '#FFFFFF';
  const sheetBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)';
  const hoverBg = isDark ? 'rgba(124,111,255,0.1)' : 'rgba(124,111,255,0.07)';

  return (
    <>
      {/* Trigger */}
      <Pressable
        onPress={toggle}
        style={({ pressed }) => [
          styles.pickerTrigger,
          {
            backgroundColor: triggerBg, borderColor: triggerBorder,
            opacity: pressed ? 0.82 : 1, transform: [{ scale: pressed ? 0.99 : 1 }]
          },
        ]}
      >
        <School2
          size={17}
          color={selected ? '#7C6FFF' : (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.25)')}
        />
        <Text
          numberOfLines={1}
          style={[styles.pickerTriggerText, {
            color: selected
              ? (isDark ? '#FFFFFF' : '#12142A')
              : (isDark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.32)'),
          }]}
        >
          {selected ? selected.name : 'Choose a school…'}
        </Text>
        <Animated.View style={{ transform: [{ rotate: chevronRotate }] }}>
          <ChevronDown size={17} color={isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.32)'} />
        </Animated.View>
      </Pressable>

      {/* Modal dropdown sheet */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.sheet, {
            backgroundColor: sheetBg,
            borderColor: sheetBorder,
            shadowColor: isDark ? '#000' : '#4A5BB5',
          }]}>
            <Text style={[styles.sheetHeading, {
              color: isDark ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)',
            }]}>
              SELECT SCHOOL
            </Text>
            <FlatList
              data={schools}
              keyExtractor={item => String(item.id)}
              style={{ maxHeight: 340 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.id === selectedId;
                return (
                  <Pressable
                    onPress={() => { onSelect(item.id); setOpen(false); }}
                    style={({ pressed }) => [
                      styles.sheetItem,
                      {
                        backgroundColor: active
                          ? (isDark ? 'rgba(124,111,255,0.18)' : 'rgba(124,111,255,0.1)')
                          : (pressed ? hoverBg : 'transparent'),
                        borderColor: active
                          ? (isDark ? 'rgba(124,111,255,0.4)' : 'rgba(124,111,255,0.3)')
                          : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.sheetItemDot, {
                      backgroundColor: active
                        ? '#7C6FFF'
                        : (isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'),
                    }]} />
                    <Text style={[styles.sheetItemText, {
                      color: active ? '#7C6FFF' : (isDark ? 'rgba(255,255,255,0.88)' : '#12142A'),
                      fontWeight: active ? '700' : '400',
                    }]}>
                      {item.name}
                    </Text>
                    {active && <CheckCircle2 size={15} color="#7C6FFF" />}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ── Step Badge ────────────────────────────────────────────────────────────────

function StepBadge({ step, color }: { step: number; color: string }) {
  return (
    <LinearGradient
      colors={[color, `${color}99`]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={styles.stepBadge}
    >
      <Text style={styles.stepBadgeText}>{step}</Text>
    </LinearGradient>
  );
}

// ── Column Group ──────────────────────────────────────────────────────────────

function ColumnGroup({
  label, color, rgb, columns, isDark,
}: { label: string; color: string; rgb: string; columns: string; isDark: boolean }) {
  return (
    <View style={[styles.colGroup, {
      backgroundColor: `rgba(${rgb}, ${isDark ? '0.08' : '0.055'})`,
      borderColor: `rgba(${rgb}, ${isDark ? '0.22' : '0.26'})`,
    }]}>
      <View style={styles.colGroupRow}>
        <View style={[styles.colDot, { backgroundColor: color }]} />
        <Text style={[styles.colGroupLabel, { color }]}>{label}</Text>
      </View>
      <Text style={[styles.colGroupText, {
        color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.46)',
      }]}>
        {columns}
      </Text>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function ImportStudentsScreen() {
  const { isDark, colors } = useTheme();

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; credentialsCreated: number; errors: string[] } | null>(null);

  const params = useLocalSearchParams();
  const initialSchoolId = params.schoolId ? parseInt(params.schoolId as string, 10) : null;

  // ── Animations
  const heroAnim = useRef(new Animated.Value(0)).current;
  const card1Anim = useRef(new Animated.Value(0)).current;
  const card2Anim = useRef(new Animated.Value(0)).current;
  const card3Anim = useRef(new Animated.Value(0)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchSchools();
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.stagger(90, [
        Animated.spring(card1Anim, { toValue: 1, tension: 95, friction: 10, useNativeDriver: true }),
        Animated.spring(card2Anim, { toValue: 1, tension: 95, friction: 10, useNativeDriver: true }),
        Animated.spring(card3Anim, { toValue: 1, tension: 95, friction: 10, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    if (importResult) {
      Animated.spring(resultAnim, { toValue: 1, tension: 90, friction: 10, useNativeDriver: true }).start();
    }
  }, [importResult]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (file && selectedSchoolId && !loading) {
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.024, duration: 960, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 960, useNativeDriver: true }),
      ]));
      loop.start();
    } else {
      pulseAnim.setValue(1);
    }
    return () => loop?.stop();
  }, [file, selectedSchoolId, loading]);

  const fetchSchools = async () => {
    try {
      const res = await superAdminApi.getSchools();
      const data: School[] = Array.isArray(res) ? res : res.data || [];
      setSchools(data);
      if (initialSchoolId && data.find(s => s.id === initialSchoolId)) {
        setSelectedSchoolId(initialSchoolId);
      } else if (data.length > 0) {
        setSelectedSchoolId(data[0].id);
      }
    } catch { Alert.alert('Error', 'Failed to load schools'); }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length) setFile(result.assets[0]);
    } catch { /* silent */ }
  };

  const handleUpload = async () => {
    if (!selectedSchoolId) { Alert.alert('Error', 'Please select a school first.'); return; }
    if (!file) { Alert.alert('Error', 'Please select a file to upload.'); return; }
    setLoading(true);
    setImportResult(null);
    try {
      let fileToUpload: any;
      if (Platform.OS === 'web') {
        const blob = await (await fetch(file.uri)).blob();
        fileToUpload = new File([blob], file.name, { type: file.mimeType });
      } else {
        fileToUpload = {
          uri: file.uri,
          type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          name: file.name,
        };
      }
      const response = await superAdminApi.bulkImportStudents(selectedSchoolId, fileToUpload);
      if (response.success) {
        setImportResult({
          success: response.importedCount ?? parseInt(String(response.message).match(/\d+/)?.[0] || '0'),
          credentialsCreated: response.credentialsCreated ?? 0,
          errors: response.errors || [],
        });
      } else {
        const message = response.error || response.message || 'Unknown error occurred.';
        setImportResult({
          success: response.importedCount ?? 0,
          credentialsCreated: response.credentialsCreated ?? 0,
          errors: response.errors || [message],
        });
        Alert.alert('Import Failed', message);
      }
    } catch (error: any) {
      const data = error.response?.data;
      const message = data?.error
        || data?.message
        || (error.code === 'ECONNABORTED'
          ? 'Upload timed out before the server returned a response. Please try again or upload fewer rows at a time.'
          : error.message)
        || 'Failed to upload students';
      setImportResult({
        success: data?.importedCount ?? 0,
        credentialsCreated: data?.credentialsCreated ?? 0,
        errors: data?.errors?.length ? data.errors : [message],
      });
      Alert.alert('Import Failed', message);
    } finally { setLoading(false); }
  };

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const bg = colors.background;
  const cardBg = colors.surface;
  const cardBorder = colors.border;
  const heading = colors.textPrimary;
  const sub = colors.textSecondary;
  const cardShadow = isDark
    ? { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 24, elevation: 14 }
    : { shadowColor: '#5060BB', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 };

  const entry = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
  });

  const isReady = !!file && !!selectedSchoolId;

  return (
    <View style={[styles.root, { backgroundColor: bg }]}>
      <ScreenHeader
        title="Import students"
        subtitle="CSV or Excel · validated in three steps"
        showBack
      />

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <Animated.View style={[
        styles.heroWrapper,
        { opacity: heroAnim, transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] },
      ]}>
        <LinearGradient
          colors={isDark ? ['#261970', '#162460', '#0D0F1A'] : ['#7C6FFF', '#6080FF', '#9DBDFF']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroBg}
        >
          {/* Contained decorative orb */}
          <View style={[styles.heroOrb, {
            backgroundColor: isDark ? 'rgba(124,111,255,0.3)' : 'rgba(255,255,255,0.28)',
          }]} />
          <View style={styles.heroRow}>
            <LinearGradient
              colors={isDark
                ? ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.07)']
                : ['rgba(255,255,255,0.44)', 'rgba(255,255,255,0.24)']}
              style={styles.heroIconBg}
            >
              <FileSpreadsheet size={20} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>Bulk Student Import</Text>
              <Text style={[styles.heroSub, {
                color: isDark ? 'rgba(255,255,255,0.52)' : 'rgba(255,255,255,0.82)',
              }]}>
                Upload Excel or CSV to onboard students at scale
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ═══════════════════ STEP 1 ═══════════════════ */}
        <Animated.View style={entry(card1Anim)}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, cardShadow]}>
            <View style={styles.stepRow}>
              <StepBadge step={1} color="#7C6FFF" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepMeta, { color: sub }]}>STEP 1</Text>
                <Text style={[styles.stepTitle, { color: heading }]}>Select Target School</Text>
              </View>
              <View style={[styles.stepIconCircle, {
                backgroundColor: isDark ? 'rgba(124,111,255,0.12)' : 'rgba(124,111,255,0.09)',
              }]}>
                <School2 size={16} color="#7C6FFF" />
              </View>
            </View>

            <SchoolPicker
              schools={schools}
              selectedId={selectedSchoolId}
              onSelect={setSelectedSchoolId}
              isDark={isDark}
            />

            {selectedSchoolId && (
              <View style={[styles.confirmChip, {
                backgroundColor: isDark ? 'rgba(124,111,255,0.1)' : 'rgba(124,111,255,0.07)',
                borderColor: isDark ? 'rgba(124,111,255,0.28)' : 'rgba(124,111,255,0.22)',
              }]}>
                <CheckCircle2 size={13} color="#7C6FFF" />
                <Text style={styles.confirmChipText}>
                  {schools.find(s => s.id === selectedSchoolId)?.name ?? 'School selected'}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ═══════════════════ STEP 2 ═══════════════════ */}
        <Animated.View style={entry(card2Anim)}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }, cardShadow]}>
            <View style={styles.stepRow}>
              <StepBadge step={2} color="#5B8CFF" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepMeta, { color: sub }]}>STEP 2</Text>
                <Text style={[styles.stepTitle, { color: heading }]}>Prepare & Upload File</Text>
              </View>
              <View style={[styles.stepIconCircle, {
                backgroundColor: isDark ? 'rgba(91,140,255,0.12)' : 'rgba(91,140,255,0.09)',
              }]}>
                <Upload size={16} color="#5B8CFF" />
              </View>
            </View>

            {/* Download template */}
            <Pressable
              onPress={handleDownloadTemplate}
              style={({ pressed }) => [
                styles.templateBtn,
                {
                  backgroundColor: isDark ? 'rgba(91,140,255,0.07)' : 'rgba(91,140,255,0.06)',
                  borderColor: isDark ? 'rgba(91,140,255,0.2)' : 'rgba(91,140,255,0.24)',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  opacity: pressed ? 0.78 : 1,
                },
              ]}
            >
              <LinearGradient colors={['#5B8CFF', '#7C6FFF']} style={styles.templateIconBg}>
                <Download size={14} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[styles.templateTitle, { color: heading }]}>Download Template</Text>
                <Text style={[styles.templateDesc, { color: sub }]}>CSV · 28 columns · 1 sample row</Text>
              </View>
              <ChevronRight size={15} color={sub} />
            </Pressable>

            {/* Column reference */}
            <Text style={[styles.sectionMeta, { color: sub }]}>COLUMN REFERENCE</Text>
            {COLUMN_GROUPS.map(g => (
              <ColumnGroup key={g.label} {...g} isDark={isDark} />
            ))}

            {/* Drop zone */}
            <Pressable
              onPress={handlePickDocument}
              style={({ pressed }) => [
                styles.dropZone,
                {
                  borderColor: file
                    ? (isDark ? 'rgba(16,185,129,0.45)' : 'rgba(16,185,129,0.42)')
                    : (isDark ? 'rgba(91,140,255,0.28)' : 'rgba(91,140,255,0.3)'),
                  backgroundColor: file
                    ? (isDark ? 'rgba(16,185,129,0.055)' : 'rgba(16,185,129,0.04)')
                    : (isDark ? 'rgba(91,140,255,0.04)' : 'rgba(91,140,255,0.03)'),
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              {file ? (
                <View style={styles.filePresent}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.fileIconBg}>
                    <FileCheck size={24} color="#FFFFFF" />
                  </LinearGradient>
                  <Text style={[styles.fileName, { color: heading }]} numberOfLines={1}>{file.name}</Text>
                  <View style={[styles.fileSizePill, {
                    backgroundColor: isDark ? 'rgba(16,185,129,0.16)' : 'rgba(16,185,129,0.1)',
                  }]}>
                    <Text style={styles.fileSizeText}>{((file.size ?? 0) / 1024).toFixed(1)} KB</Text>
                  </View>
                  <Text style={[styles.changeFileTip, {
                    color: isDark ? 'rgba(91,140,255,0.9)' : '#5B8CFF',
                  }]}>
                    Tap to change
                  </Text>
                </View>
              ) : (
                <View style={styles.fileEmpty}>
                  <LinearGradient
                    colors={isDark
                      ? ['rgba(91,140,255,0.2)', 'rgba(124,111,255,0.1)']
                      : ['rgba(91,140,255,0.13)', 'rgba(124,111,255,0.07)']}
                    style={styles.uploadIconBg}
                  >
                    <Upload size={26} color={isDark ? '#8AABFF' : '#5B8CFF'} />
                  </LinearGradient>
                  <Text style={[styles.dropTitle, { color: heading }]}>Tap to browse files</Text>
                  <Text style={[styles.dropDesc, { color: sub }]}>Accepts .xlsx · .xls · .csv</Text>
                </View>
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* ═══════════════════ STEP 3 ═══════════════════ */}
        <Animated.View style={[entry(card3Anim), {
          transform: [
            { translateY: card3Anim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
            { scale: (isReady && !loading) ? pulseAnim : new Animated.Value(1) },
          ],
        }]}>
          <View style={[styles.card, {
            backgroundColor: cardBg,
            borderColor: isReady
              ? (isDark ? 'rgba(124,111,255,0.32)' : 'rgba(124,111,255,0.26)')
              : cardBorder,
          }, cardShadow]}>
            <View style={styles.stepRow}>
              <StepBadge step={3} color="#A78BFA" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stepMeta, { color: sub }]}>STEP 3</Text>
                <Text style={[styles.stepTitle, { color: heading }]}>Run Import</Text>
              </View>
            </View>

            {/* Readiness checklist */}
            <View style={styles.checklist}>
              {[
                { done: !!selectedSchoolId, label: 'School selected' },
                { done: !!file, label: 'File attached' },
              ].map(item => (
                <View key={item.label} style={styles.checkRow}>
                  {item.done
                    ? <CheckCircle2 size={16} color="#10B981" />
                    : <View style={[styles.checkEmpty, {
                      borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
                    }]} />
                  }
                  <Text style={[styles.checkLabel, {
                    color: item.done ? heading : sub,
                    fontWeight: item.done ? '600' : '400',
                  }]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>

            <View style={[styles.divider, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]} />

            <Pressable
              onPress={handleUpload}
              disabled={loading || !isReady}
              style={({ pressed }) => ({
                opacity: !isReady ? 0.38 : pressed ? 0.86 : 1,
                transform: [{ scale: pressed ? 0.972 : 1 }],
              })}
            >
              <LinearGradient
                colors={loading ? ['#555', '#444'] : ['#7C6FFF', '#5B8CFF']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.importBtn}
              >
                {loading
                  ? <><ActivityIndicator size="small" color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.importBtnText}>Importing…</Text></>
                  : <><Upload size={17} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.importBtnText}>Import Students</Text></>
                }
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>

        {/* ═══════════════════ Result ═══════════════════ */}
        {importResult && (
          <Animated.View style={{
            opacity: resultAnim,
            transform: [{ scale: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }],
          }}>
            <View style={[styles.card, {
              backgroundColor: cardBg,
              borderColor: importResult.errors.length > 0
                ? (isDark ? 'rgba(245,166,35,0.35)' : 'rgba(245,166,35,0.4)')
                : (isDark ? 'rgba(16,185,129,0.32)' : 'rgba(16,185,129,0.35)'),
            }, cardShadow]}>

              <LinearGradient
                colors={importResult.errors.length > 0
                  ? [`rgba(245,166,35,${isDark ? '0.11' : '0.08'})`, 'transparent']
                  : [`rgba(16,185,129,${isDark ? '0.11' : '0.08'})`, 'transparent']}
                style={styles.resultHeader}
              >
                {importResult.errors.length > 0
                  ? <AlertTriangle size={20} color="#F5A623" />
                  : <CheckCircle2 size={20} color="#10B981" />}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.resultTitle, { color: heading }]}>
                    {importResult.success === 0 && importResult.errors.length > 0 ? 'Import Failed' : 'Import Complete'}
                  </Text>
                  <Text style={[styles.resultSub, { color: sub }]}>
                    {importResult.success === 0 && importResult.errors.length > 0
                      ? 'No students were saved — review errors below'
                      : importResult.errors.length > 0
                      ? 'Partial success — review errors below'
                      : 'All rows processed successfully'}
                  </Text>
                </View>
              </LinearGradient>

              {/* Stats */}
              <View style={styles.statsRow}>
                {[
                  { n: importResult.success, color: '#10B981', rgb: '16,185,129', label: 'Imported' },
                  { n: importResult.credentialsCreated, color: '#7C6FFF', rgb: '124,111,255', label: 'Logins' },
                  { n: importResult.errors.length, color: '#EF4444', rgb: '239,68,68', label: 'Warnings' },
                  { n: importResult.success + importResult.errors.length, color: '#6B7280', rgb: '107,114,128', label: 'Total' },
                ].map(stat => (
                  <View key={stat.label} style={[styles.statBox, {
                    backgroundColor: `rgba(${stat.rgb},${isDark ? '0.1' : '0.07'})`,
                    borderColor: `rgba(${stat.rgb},${isDark ? '0.24' : '0.2'})`,
                  }]}>
                    <Text style={[styles.statNum, { color: stat.color }]}>{stat.n}</Text>
                    <Text style={[styles.statLabel, { color: sub }]}>{stat.label}</Text>
                  </View>
                ))}
              </View>

              {/* Errors */}
              {importResult.errors.length > 0 && (
                <View style={{ marginTop: 18 }}>
                  <Text style={[styles.errTitle, { color: heading }]}>Failed Rows</Text>
                  {importResult.errors.map((err, i) => (
                    <View key={i} style={[styles.errRow, {
                      backgroundColor: isDark ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.05)',
                      borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.14)',
                    }]}>
                      <XCircle size={13} color="#EF4444" style={{ marginRight: 8, marginTop: 2, flexShrink: 0 }} />
                      <Text style={[styles.errText, {
                        color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.56)',
                      }]}>
                        {err}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        <View style={{ height: 52 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  heroWrapper: { marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderRadius: 22, overflow: 'hidden' },
  heroBg: { padding: 20, borderRadius: 22 },
  heroOrb: { position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: 50 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroIconBg: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  heroSub: { fontSize: 12, marginTop: 3, lineHeight: 17 },

  // Scroll
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 60, gap: 14 },

  // Card
  card: { borderRadius: 22, borderWidth: 1, padding: 20 },

  // Step header
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  stepBadge: {
    width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6
  },
  stepBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  stepMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  stepTitle: { fontSize: 16, fontWeight: '700', marginTop: 2, letterSpacing: -0.2 },
  stepIconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Custom picker
  pickerTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 13, paddingHorizontal: 14,
    borderRadius: 14, borderWidth: 1.5,
  },
  pickerTriggerText: { flex: 1, fontSize: 14, fontWeight: '500' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  sheet: {
    width: '100%', maxWidth: 460, borderRadius: 22, borderWidth: 1, padding: 18,
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.28, shadowRadius: 36, elevation: 22
  },
  sheetHeading: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 12, paddingHorizontal: 4 },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginBottom: 4
  },
  sheetItemDot: { width: 8, height: 8, borderRadius: 4 },
  sheetItemText: { flex: 1, fontSize: 14 },

  confirmChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderRadius: 10, borderWidth: 1
  },
  confirmChipText: { fontSize: 12, color: '#7C6FFF', fontWeight: '600' },

  // Template button
  templateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 18
  },
  templateIconBg: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  templateTitle: { fontSize: 14, fontWeight: '700' },
  templateDesc: { fontSize: 11, marginTop: 2 },

  // Column groups
  sectionMeta: { fontSize: 10, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 },
  colGroup: { borderWidth: 1, borderRadius: 11, padding: 10, marginBottom: 8 },
  colGroupRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  colDot: { width: 6, height: 6, borderRadius: 3 },
  colGroupLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  colGroupText: { fontSize: 12, lineHeight: 18 },

  // Drop zone
  dropZone: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 16,
    padding: 28, minHeight: 168, alignItems: 'center', justifyContent: 'center', marginTop: 4
  },
  filePresent: { alignItems: 'center' },
  fileIconBg: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  fileName: { fontSize: 15, fontWeight: '700', textAlign: 'center', letterSpacing: -0.2, maxWidth: 260 },
  fileSizePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 6 },
  fileSizeText: { fontSize: 11, color: '#10B981', fontWeight: '700' },
  changeFileTip: { fontSize: 12, fontWeight: '600', marginTop: 10 },
  fileEmpty: { alignItems: 'center' },
  uploadIconBg: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dropTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  dropDesc: { fontSize: 12, marginTop: 4 },

  // Checklist
  checklist: { gap: 10, marginBottom: 18 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkEmpty: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  checkLabel: { fontSize: 13 },
  divider: { height: 1, marginBottom: 18 },

  // Import button
  importBtn: {
    height: 54, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7C6FFF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10
  },
  importBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },

  // Result
  resultHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, marginBottom: 16 },
  resultTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  resultSub: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  errTitle: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  errRow: {
    flexDirection: 'row', alignItems: 'flex-start', padding: 10,
    borderRadius: 10, borderWidth: 1, marginBottom: 6
  },
  errText: { fontSize: 12, flex: 1, lineHeight: 18 },
});