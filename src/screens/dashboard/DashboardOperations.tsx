import { MotionPressable } from '../../components/ui/MotionPressable';
import React from 'react';
import { brandColors } from '../../constants/experienceColors';
import { useTheme } from '../../contexts/ThemeContext';
import { StatCard } from '../../components/ui/StatCard';
import { Pressable, Text, View } from 'react-native';

import {
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  ChevronRight,
  Circle,
  Layers,
  MessageCircle,
  Receipt,
  School,
  Target,
  Users,
} from 'lucide-react-native';
import {
  Panel,
  ResourceStatus,
  SectionHeading,
  useDashboardPalette,
} from './DashboardPrimitives';
import { dashboardStyles as st } from './dashboardStyles';
import { money, number } from './dashboardModel';
import type { DashboardData, Resource } from './useDashboardData';

export function ReviewQueue({
  data: d,
  canApprove,
  wide,
  onNavigate,
}: {
  data: DashboardData;
  canApprove: boolean;
  wide: boolean;
  onNavigate: (route: string) => void;
}) {
  const p = useDashboardPalette();
  function queueRow(
    label: string,
    detail: string,
    value: string,
    route: string,
    index: number,
    resource: Resource<any>
  ) {
    return (
      <View
        key={label}
        style={{ borderTopWidth: index ? 1 : 0, borderColor: p.line }}
      >
        <ResourceStatus label={label.toLowerCase()} resource={resource}>
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${value}. ${detail}`}
            onPress={() => onNavigate(route)}
            style={({ pressed, hovered }: any) => [
              st.queueRow,
              {
                opacity: pressed ? 0.7 : 1,
                backgroundColor: hovered ? p.inset : 'transparent',
              },
            ]}
          >
            <Text style={{ color: p.muted, fontSize: 11, width: 20 }}>
              0{index + 1}
            </Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: p.ink, fontWeight: '600', fontSize: 14 }}>
                {label}
              </Text>
              <Text
                style={{
                  color: p.muted,
                  fontSize: 12,
                  marginTop: 5,
                  lineHeight: 18,
                }}
              >
                {detail}
              </Text>
            </View>
            <Text style={{ color: p.action, fontWeight: '700', fontSize: 17 }}>
              {value}
            </Text>
            <ChevronRight size={16} color={p.muted} />
          </MotionPressable>
        </ResourceStatus>
      </View>
    );
  }
  return (
    <Panel tone="rose" style={{ flex: wide ? 1 : undefined }}>
      <SectionHeading
        eyebrow="ACTION CENTER"
        title="Your attention, needed"
        action={
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: p.inset,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowUpRight size={17} color={p.action} />
          </View>
        }
      />
      {queueRow(
        'Unassigned enquiries',
        'Give every conversation an owner',
        d.enquiries.data
          ? String(number(d.enquiries.data.unassignedEnquiries))
          : '—',
        '/(app)/console/enquiries',
        0,
        d.enquiries
      )}
      {canApprove
        ? queueRow(
            'Expense approvals',
            'Review submitted operating expenses',
            d.expenses.data ? String(d.expenses.data.length) : '—',
            '/(app)/console/expense-approvals',
            1,
            d.expenses
          )
        : null}
      {canApprove
        ? queueRow(
            'Pending collections',
            'Amount awaiting a review',
            d.analytics.data?.pending
              ? money(d.analytics.data.pending.pending_collections)
              : '—',
            '/(app)/console/collection-approvals',
            2,
            d.analytics
          )
        : null}
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          borderTopWidth: 1,
          borderColor: p.line,
          paddingTop: 18,
          marginTop: 8,
        }}
      >
        <Circle size={10} color={p.action} />
        <Text
          style={{
            color: p.muted,
            fontSize: 11,
            flex: 1,
            lineHeight: 17,
          }}
        >
          Live queues · reviews happen in their workspace.
        </Text>
      </View>
    </Panel>
  );
}
export function NetworkOverview({
  resource,
  phone,
  onNavigate,
}: {
  resource: DashboardData['stats'];
  phone: boolean;
  onNavigate: (route: string) => void;
}) {
  const p = useDashboardPalette();
  const { isDark } = useTheme();
  const active = resource.data?.active_schools;
  return (
    <ResourceStatus label="network overview" resource={resource}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {[
          {
            accent: isDark ? brandColors.blueBright : brandColors.blue,
            label: 'Partner schools',
            value: resource.data?.total_schools,
            detail: 'Across your network',
            Icon: School,
            route: '/(app)/schools',
          },
          {
            accent: isDark ? brandColors.amberBright : brandColors.amber,
            label: 'Active schools',
            value: active,
            detail: 'Currently enabled',
            Icon: CheckCheck,
            route: '/(app)/schools',
          },
          {
            accent: isDark ? brandColors.redBright : brandColors.rose,
            label: 'Students',
            value: resource.data?.total_students,
            detail: 'Registered learners',
            Icon: Users,
            route: '/(app)/students',
          },
          {
            accent: isDark ? brandColors.violetBright : brandColors.violet,
            label: 'Staff',
            value: resource.data?.total_staff,
            detail: 'Across partner schools',
            Icon: BookOpen,
            route: '/(app)/schools',
          },
        ].map(({ label, value, detail, Icon, route, accent }) => (
          <View
            key={label}
            style={{
              flexBasis: phone ? '44%' : '21%',
              flexGrow: 1,
              minWidth: 0,
            }}
          >
            <StatCard
              title={label}
              value={number(value).toLocaleString('en-IN')}
              description={detail}
              accentColor={accent}
              icon={<Icon size={20} color={accent} />}
              onPress={() => onNavigate(route)}
            />
          </View>
        ))}
      </View>
    </ResourceStatus>
  );
}
export function DashboardLaunchpad({
  wide,
  workspaceCount,
  onNavigate,
  onBrowse,
}: {
  wide: boolean;
  workspaceCount: number;
  onNavigate: (route: string) => void;
  onBrowse: () => void;
}) {
  const p = useDashboardPalette();
  return (
    <Panel tone="lavender" style={{ flex: wide ? 1 : undefined }}>
      <SectionHeading eyebrow="QUICK ACCESS" title="Make your next move" />
      <View style={{ gap: 3 }}>
        {[
          [
            'Create an expense',
            'Keep receipts and spending together',
            '/(app)/console/expenses',
            Receipt,
          ],
          [
            'Open CRM',
            'Move a relationship forward',
            '/(app)/console/crm',
            Target,
          ],
          [
            'Talk to your team',
            'Pick up the conversation in Connect',
            '/(app)/connect',
            MessageCircle,
          ],
          [
            'Browse all workspaces',
            `${workspaceCount} places to make progress`,
            '',
            Layers,
          ],
        ].map(([label, detail, route, Icon]: any, i) => (
          <MotionPressable
            key={label}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => (route ? onNavigate(route) : onBrowse())}
            style={({ hovered }: any) => [
              st.launchRow,
              {
                borderColor: p.line,
                borderTopWidth: i ? 1 : 0,
                backgroundColor: hovered ? p.inset : 'transparent',
              },
            ]}
          >
            <View style={[st.launchIcon, { backgroundColor: p.inset }]}>
              <Icon size={18} color={p.action} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text
                style={{
                  color: p.ink,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
              <Text
                style={{
                  color: p.muted,
                  fontSize: 11,
                  lineHeight: 17,
                }}
              >
                {detail}
              </Text>
            </View>
            <ArrowUpRight size={15} color={p.muted} />
          </MotionPressable>
        ))}
      </View>
    </Panel>
  );
}
