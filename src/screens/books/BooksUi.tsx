import { workspaceUi } from '../../constants/layout';
import { brandColors, type CardTone } from '../../constants/experienceColors';
import { borderRadius } from '../../constants/theme';
import { MotionPressable } from '../../components/ui/MotionPressable';
import { Card, type CardMaterial } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { MotionSection } from '../../components/ui/MotionSection';
import React, { createContext, useContext, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Switch,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
export function Action({
  label,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <MotionPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => [
        ui.action,
        {
          backgroundColor: secondary
            ? colors.background
            : danger
            ? brandColors.redDark
            : colors.primaryFill,
          borderColor: secondary ? colors.border : 'transparent',
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon}
      <Text
        style={{
          color: secondary ? colors.textPrimary : '#fff',
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </MotionPressable>
  );
}
export function Panel({
  children,
  style,
  tone,
  material = 'neutral',
}: {
  children: React.ReactNode;
  style?: object;
  tone?: CardTone;
  material?: CardMaterial;
}) {
  const { colors } = useTheme();
  return (
    <Card
      noPadding
      tone={tone}
      material={material}
      style={[
        ui.panel,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      {children}
    </Card>
  );
}
const InFormRow = createContext(false);
/** Fields grow horizontally only inside an explicit form row, never down a dialog. */
export function FormRow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return (
    <InFormRow.Provider value={true}>
      <View
        style={[ui.wrap, { flexShrink: 0, alignItems: 'flex-start' }, style]}
      >
        {children}
      </View>
    </InFormRow.Provider>
  );
}
function useFieldLayout() {
  return [ui.field, useContext(InFormRow) && ui.fieldInRow];
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: unknown;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const { colors } = useTheme();
  const layout = useFieldLayout();
  return (
    <View style={layout}>
      <Input
        label={label}
        value={String(value ?? '')}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline={multiline}
        containerStyle={{ marginBottom: 0 }}
      />
    </View>
  );
}
export function Select({
  label,
  value,
  options,
  onChange,
  compact = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState('');
  const { colors, reducedMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const layout = useFieldLayout();
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <View style={layout}>
      {!compact && (
        <Text style={[ui.label, { color: colors.textSecondary }]}>{label}</Text>
      )}
      <MotionPressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        style={[
          ui.input,
          ui.row,
          {
            borderColor: colors.border,
            backgroundColor: colors.background,
            minHeight: compact ? 38 : 44,
            paddingVertical: compact ? 8 : 10,
            justifyContent: 'space-between',
          },
        ]}
      >
        <Text numberOfLines={1} style={{ color: colors.textPrimary, flex: 1 }}>
          {options.find((o) => o.value === value)?.label || 'Select…'}
        </Text>
        <ChevronDown size={15} color={colors.textSecondary} />
      </MotionPressable>
      <Modal
        visible={open}
        transparent
        animationType={reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={ui.overlay}
        >
          <InFormRow.Provider value={false}>
            <View
              role="dialog"
              accessibilityLabel={label}
              accessibilityViewIsModal
              style={[
                ui.selector,
                {
                  width: Math.min(480, Math.max(200, width - 32)),
                  maxHeight: Math.max(180, height - 32),
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  ui.row,
                  { justifyContent: 'space-between', flexShrink: 0 },
                ]}
              >
                <Text
                  style={[
                    ui.title,
                    { color: colors.textPrimary, flex: 1, minWidth: 0 },
                  ]}
                >
                  {label}
                </Text>
                <Action
                  label="Close"
                  secondary
                  onPress={() => setOpen(false)}
                />
              </View>
              <Field label="Find an option" value={query} onChange={setQuery} />
              <ScrollView
                accessibilityLabel={`${label} options`}
                style={ui.modalBody}
                contentContainerStyle={{ gap: 4 }}
                keyboardShouldPersistTaps="handled"
              >
                <View
                  role="radiogroup"
                  accessibilityLabel={`${label} options`}
                  style={{ gap: 4 }}
                >
                  {filtered.map((o) => (
                    <MotionPressable
                      key={o.value}
                      role="radio"
                      accessibilityState={{ checked: o.value === value }}
                      aria-checked={o.value === value}
                      onPress={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      style={[
                        ui.option,
                        {
                          backgroundColor:
                            o.value === value
                              ? colors.primary + '18'
                              : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: colors.textPrimary }}>
                        {o.label}
                      </Text>
                    </MotionPressable>
                  ))}
                  {!filtered.length && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        padding: 16,
                        lineHeight: 21,
                      }}
                    >
                      {options.length
                        ? 'No options match your search.'
                        : 'No records yet. Create one first.'}
                    </Text>
                  )}
                </View>
              </ScrollView>
            </View>
          </InFormRow.Provider>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
export function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (b: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        ui.row,
        { justifyContent: 'space-between', paddingVertical: 12, flexShrink: 0 },
      ]}
    >
      <Text
        style={{
          color: colors.textPrimary,
          flex: 1,
          minWidth: 0,
          lineHeight: 21,
        }}
      >
        {label}
      </Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primaryFill }}
        thumbColor={brandColors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}
export function Dialog({
  title,
  onClose,
  children,
  footer,
  busy = false,
  maxWidth = 1080,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  busy?: boolean;
  maxWidth?: number;
}) {
  const { colors, reducedMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  return (
    <Modal
      visible
      transparent
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={ui.overlay}
      >
        <InFormRow.Provider value={false}>
          <MotionSection
            role="dialog"
            accessibilityLabel={title}
            accessibilityViewIsModal
            style={[
              ui.dialog,
              {
                width: Math.min(maxWidth, Math.max(200, width - 32)),
                maxHeight: Math.max(180, height - 32),
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                ui.row,
                {
                  justifyContent: 'space-between',
                  padding: width < 600 ? 16 : 22,
                  flexShrink: 0,
                  borderBottomWidth: 1,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[ui.title, { color: colors.textPrimary, flex: 1 }]}>
                {title}
              </Text>
              <MotionPressable
                accessibilityRole="button"
                accessibilityLabel="Close dialog"
                disabled={busy}
                onPress={onClose}
                style={ui.closeButton}
                hitSlop={4}
              >
                <X size={22} color={colors.textSecondary} />
              </MotionPressable>
            </View>
            <ScrollView
              style={ui.modalBody}
              contentContainerStyle={{
                padding: width < 600 ? 16 : 22,
                gap: 20,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
            {footer && (
              <View
                style={[
                  ui.row,
                  {
                    padding: width < 600 ? 16 : 18,
                    flexShrink: 0,
                    borderTopWidth: 1,
                    borderColor: colors.border,
                    justifyContent: 'flex-end',
                    flexWrap: 'wrap',
                  },
                ]}
              >
                {busy && <ActivityIndicator color={colors.primary} />}
                {footer}
              </View>
            )}
          </MotionSection>
        </InFormRow.Provider>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Table({
  columns,
  rows,
  empty = 'No records yet.',
  onRow,
}: {
  columns: {
    key: string;
    label: string;
    width?: number;
    render?: (r: any) => React.ReactNode;
  }[];
  rows: any[];
  empty?: string;
  onRow?: (r: any) => void;
}) {
  const { colors } = useTheme();
  const total = columns.reduce((s, c) => s + (c.width || 150), 0);
  return (
    <Panel style={{ padding: 0, overflow: 'hidden' }}>
      <ScrollView horizontal>
        <View style={{ minWidth: total, flex: 1 }}>
          <View
            style={[
              ui.row,
              {
                gap: 0,
                backgroundColor: colors.background,
                paddingHorizontal: 18,
              },
            ]}
          >
            {columns.map((c) => (
              <Text
                key={c.key}
                style={[
                  ui.tableHead,
                  { width: c.width || 150, color: colors.textSecondary },
                ]}
              >
                {c.label}
              </Text>
            ))}
          </View>
          {rows.map((row, i) => (
            <MotionPressable
              key={row.id || row.code || i}
              accessibilityRole={onRow ? 'button' : undefined}
              onPress={() => onRow?.(row)}
              style={({ pressed, hovered }: any) => [
                ui.row,
                {
                  gap: 0,
                  paddingHorizontal: 18,
                  borderTopWidth: 1,
                  borderColor: colors.border,
                  backgroundColor:
                    pressed || hovered ? colors.hover : 'transparent',
                },
              ]}
            >
              {columns.map((c) => (
                <View
                  key={c.key}
                  style={{
                    width: c.width || 150,
                    paddingVertical: 15,
                    paddingRight: 16,
                  }}
                >
                  {c.render ? (
                    c.render(row)
                  ) : (
                    <Text
                      numberOfLines={2}
                      style={{
                        fontSize: 13,
                        lineHeight: 19,
                        color: colors.textPrimary,
                      }}
                    >
                      {String(row[c.key] ?? '—')}
                    </Text>
                  )}
                </View>
              ))}
            </MotionPressable>
          ))}
          {!rows.length && (
            <Text
              style={{ color: colors.textSecondary, padding: 30, fontSize: 14 }}
            >
              {empty}
            </Text>
          )}
        </View>
      </ScrollView>
    </Panel>
  );
}
export function Badge({ value }: { value: string }) {
  const { colors } = useTheme();
  const color =
    (
      {
        draft: colors.warning,
        posted: colors.success,
        void: colors.error,
        paid: colors.success,
        active: colors.success,
        matched: colors.success,
        unmatched: colors.warning,
      } as Record<string, string>
    )[value] || colors.textSecondary;
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 6,
        backgroundColor: color + '18',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color,
          textTransform: 'uppercase',
        }}
      >
        {value.replaceAll('_', ' ')}
      </Text>
    </View>
  );
}
export function Notice({
  text,
  error = false,
}: {
  text: string;
  error?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        padding: 14,
        borderRadius: 10,
        backgroundColor: error ? colors.errorDim : colors.infoDim,
        borderWidth: 1,
        borderColor: error ? colors.errorDim : colors.infoDim,
      }}
    >
      <Text
        style={{
          color: error ? colors.error : colors.info,
          lineHeight: 21,
          fontSize: 13,
        }}
      >
        {text}
      </Text>
    </View>
  );
}
export const ui = StyleSheet.create({
  field: {
    gap: 7,
    flexShrink: 0,
    minWidth: 0,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  fieldInRow: { flexGrow: 1, flexShrink: 0, flexBasis: 160, minWidth: 150 },
  modalBody: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    flexShrink: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  action: {
    minHeight: 44,
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  panel: {
    borderWidth: 1,
    borderRadius: workspaceUi.cardRadius,
    padding: workspaceUi.cardPadding,
    gap: 16,
    flexShrink: 0,
    minWidth: 0,
  },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600', flexShrink: 0 },
  input: {
    flexShrink: 0,
    minWidth: 0,
    lineHeight: 20,
    borderWidth: 1,
    borderRadius: workspaceUi.controlRadius,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  title: { fontSize: 19, fontWeight: '700' },
  tableHead: {
    fontSize: 11,
    fontWeight: '700',
    paddingVertical: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(6,15,30,.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  dialog: {
    maxWidth: 1080,
    flexShrink: 1,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selector: {
    flexShrink: 1,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    gap: 18,
  },
  option: {
    padding: 14,
    borderRadius: borderRadius.md,
    minHeight: 44,
    flexShrink: 0,
  },
});
