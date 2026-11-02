import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowRight,
  CalendarDays,
  Layers,
  LayoutGrid,
  BarChart3,
} from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import { useCluster } from '../../contexts/ClusterContext';
import { useTheme } from '../../contexts/ThemeContext';
import { PERMISSIONS } from '../../constants/rbac';
import { borderRadius } from '../../constants/theme';
import { brandColors } from '../../constants/experienceColors';
import { MotionPressable } from '../../components/ui/MotionPressable';
import { MotionSection } from '../../components/ui/MotionSection';
import {
  FinancialPulse,
  SpendComposition,
  BillingContext,
} from './DashboardFinance';
import { SchoolPortfolio } from './SchoolPortfolio';
import {
  ReviewQueue,
  NetworkOverview,
  DashboardLaunchpad,
} from './DashboardOperations';
import { WorkspaceDirectory } from './WorkspaceDirectory';
import { useDashboardData } from './useDashboardData';
import {
  ds,
  DashButton,
  Panel,
  ResourceStatus,
  useDashboardPalette,
} from './DashboardPrimitives';
import { CollectionsChart } from './CollectionsChart';
import { type FinancePeriod } from './dashboardModel';
import { dashboardWorkspaces } from './dashboardWorkspaces';

export default function ExecutiveDashboard() {
  const { user, currentAdmin, founder } = useAuth();
  const { selectedCluster } = useCluster();
  const scope = `${
    user?.id || founder?.id || currentAdmin?.id || 'signed-in'
  }:${selectedCluster?.cluster_id || 'default'}`;
  return <ExecutiveWorkspace key={scope} scope={scope} />;
}

function ExecutiveWorkspace({ scope }: { scope: string }) {
  const p = useDashboardPalette(),
    router = useRouter();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [contentWidth, setContentWidth] = useState(0);
  const available = contentWidth || (width >= 1024 ? width - 316 : width - 36);
  const phone = available < 600,
    wide = available >= 960;
  const { can, currentAdmin, founder, user, roleLabel } = useAuth();
  const { canApproveReject } = useFounderAuth();
  const { selectedCluster } = useCluster();
  const [tab, setTab] = useState<'Workspaces' | 'Overview'>('Workspaces');
  const [period, setPeriod] = useState<FinancePeriod>('THIS_MONTH');
  const [unit, setUnit] = useState('ALL');
  const canReadSchools =
    can(PERMISSIONS.SCHOOLS_READ_ALL) || can(PERMISSIONS.SCHOOLS_READ_ASSIGNED);
  const d = useDashboardData(
    period,
    unit,
    scope,
    canReadSchools,
    canApproveReject,
  );
  const workspaces = dashboardWorkspaces.filter(
    (w) =>
      !('permission' in w) ||
      can(w.permission) ||
      ('alternate' in w && can(w.alternate)),
  );
  const name = (
    currentAdmin?.full_name ||
    founder?.full_name ||
    user?.user_metadata?.full_name ||
    'team'
  ).split(' ')[0];
  const go = (route: string) => router.push(route as any);
  const sourceErrors = [
    d.stats,
    d.schools,
    d.analytics,
    d.enquiries,
    d.expenses,
    d.financial,
    d.units,
  ].filter((r) => r.error).length;
  const date = new Date();
  const greeting =
    date.getHours() < 12
      ? 'Good morning'
      : date.getHours() < 17
      ? 'Good afternoon'
      : 'Good evening';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.canvas }}
      contentContainerStyle={{
        padding:
          tab === 'Workspaces' ? (width < 600 ? 16 : 24) : width < 600 ? 18 : 32,
        paddingBottom: 48,
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={d.refreshing}
          onRefresh={() => void d.refresh()}
          tintColor={p.action}
        />
      }
    >
      <View
        style={{
          maxWidth: 1480,
          width: '100%',
          alignSelf: 'center',
          gap: tab === 'Workspaces' ? 20 : 28,
        }}
        onLayout={(event) => setContentWidth(event.nativeEvent.layout.width)}
      >
        <MotionSection style={{ gap: tab === 'Workspaces' ? 16 : 24 }}>
          <View
            style={{
              flexDirection: phone ? 'column' : 'row',
              alignItems: phone ? 'stretch' : 'center',
              justifyContent: 'space-between',
              gap: tab === 'Workspaces' ? 16 : 24,
              padding: tab === 'Workspaces' ? (phone ? 16 : 20) : phone ? 24 : 32,
              minHeight: tab === 'Workspaces' ? 112 : phone ? 248 : 184,
              borderRadius: borderRadius.xl,
              backgroundColor: p.hero,
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 240,
                height: 240,
                right: 200,
                top: -150,
                borderWidth: 1,
                borderColor: brandColors.honey,
                borderRadius: 120,
                opacity: 0.22,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                width: 120,
                height: 120,
                right: -34,
                bottom: -86,
                borderWidth: 1,
                borderColor: brandColors.honey,
                borderRadius: 28,
                transform: [{ rotate: '-24deg' }],
                opacity: 0.22,
              }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: tab === 'Workspaces' ? 8 : 12,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: brandColors.honey,
                  }}
                />
                <Text
                  style={[
                    ds.eyebrow,
                    { color: brandColors.paper, marginBottom: 0 },
                  ]}
                >
                  YOUR WORKSPACE
                </Text>
              </View>
              <Text
                accessibilityRole="header"
                style={{
                  color: brandColors.paper,
                  fontSize:
                    tab === 'Workspaces' ? (phone ? 26 : 28) : phone ? 30 : 39,
                  lineHeight: tab === 'Workspaces' ? 36 : phone ? 38 : 48,
                  fontWeight: '600',
                  letterSpacing: -1.3,
                }}
              >
                {tab === 'Overview'
                  ? `${greeting}, ${name}.`
                  : phone
                  ? 'Your workspaces.'
                  : 'A place for every possibility.'}
              </Text>
              <Text
                style={{
                  color: brandColors.paper,
                  fontSize: 14,
                  lineHeight: 22,
                  marginTop: tab === 'Workspaces' ? 4 : 8,
                }}
              >
                {tab === 'Overview'
                  ? 'Your people, your schools, your next move. Beautifully connected.'
                  : phone
                  ? 'Find your focus. Make your next move.'
                  : 'The right tools. Less searching. More moving forward.'}
              </Text>
            </View>
            {(!phone || tab === 'Overview') && (
              <View
                style={{
                  gap: 14,
                  alignItems: phone ? 'flex-start' : 'flex-end',
                }}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
                >
                  <CalendarDays size={14} color={brandColors.honey} />
                  <Text style={{ color: brandColors.paper, fontSize: 12 }}>
                    {date.toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <View
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <DashButton
                    label="Refresh"
                    inverse
                    icon={false}
                    busy={d.refreshing}
                    onPress={() => void d.refresh()}
                  />
                  {can(PERMISSIONS.SCHOOLS_CREATE) && (
                    <DashButton
                      label="Add school"
                      inverse
                      primary
                      onPress={() => go('/(app)/schools/add')}
                    />
                  )}
                </View>
              </View>
            )}
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              borderBottomWidth: 1,
              borderColor: p.line,
              paddingBottom: tab === 'Workspaces' ? 12 : 16,
            }}
          >
            <View
              accessibilityRole="tablist"
              style={{
                flexDirection: 'row',
                padding: 4,
                borderRadius: borderRadius.md,
                backgroundColor: colors?.inputBg || p.inset,
                gap: 4,
              }}
            >
              {(['Workspaces', 'Overview'] as const).map((t) => {
                const selected = tab === t;
                const Icon = t === 'Overview' ? BarChart3 : LayoutGrid;
                return (
                  <MotionPressable
                    key={t}
                    accessibilityRole="tab"
                    accessibilityLabel={t}
                    accessibilityState={{ selected }}
                    aria-selected={selected}
                    onPress={() => setTab(t)}
                    style={({ hovered }) => ({
                      minHeight: 44,
                      borderWidth: 1,
                      borderColor: selected ? p.line : 'transparent',
                      paddingHorizontal: phone ? 12 : 18,
                      borderRadius: borderRadius.sm,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      backgroundColor: selected
                        ? p.surface
                        : hovered
                        ? p.inset
                        : 'transparent',
                    })}
                  >
                    <Icon size={16} color={selected ? p.action : p.muted} />
                    <Text
                      style={{
                        color: selected ? p.ink : p.muted,
                        fontSize: 13,
                        fontWeight: selected ? '600' : '500',
                      }}
                    >
                      {t}
                    </Text>
                    {t === 'Workspaces' && (
                      <View
                        style={{
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          backgroundColor: p.inset,
                        }}
                      >
                        <Text
                          style={{
                            color: p.action,
                            fontSize: 10,
                            fontWeight: '600',
                          }}
                        >
                          {workspaces.length}
                        </Text>
                      </View>
                    )}
                  </MotionPressable>
                );
              })}
            </View>
            {!phone && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 7,
                  flexShrink: 1,
                }}
              >
                <Layers size={14} color={p.muted} />
                <Text
                  numberOfLines={1}
                  style={{ color: p.muted, fontSize: 12, flexShrink: 1 }}
                >
                  {selectedCluster?.label || 'Selected workspace'}
                </Text>
              </View>
            )}
          </View>
        </MotionSection>

        {sourceErrors > 0 && tab === 'Overview' && (
          <View
            accessibilityRole="alert"
            style={{
              padding: 16,
              borderRadius: borderRadius.md,
              backgroundColor: p.amberBg,
            }}
          >
            <Text style={[ds.body, { color: p.amber }]}>
              {sourceErrors} data{' '}
              {sourceErrors === 1 ? 'source is' : 'sources are'} unavailable.
              Retry the affected sections below.
            </Text>
          </View>
        )}

        {tab === 'Overview' ? (
          <View key="overview" style={{ gap: 24 }}>
            <MotionSection index={1}>
              <NetworkOverview
                resource={d.stats}
                phone={phone}
                onNavigate={go}
              />
            </MotionSection>
            <MotionSection
              index={2}
              style={{
                flexDirection: wide ? 'row' : 'column',
                gap: 20,
                alignItems: 'stretch',
              }}
            >
              <FinancialPulse
                resource={d.financial}
                period={period}
                onPeriodChange={setPeriod}
                phone={phone}
                wide={wide}
                onNavigate={go}
              />
              <ReviewQueue
                data={d}
                canApprove={canApproveReject}
                wide={wide}
                onNavigate={go}
              />
            </MotionSection>
            <MotionSection
              index={3}
              style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}
            >
              <Panel tone="blue" style={{ flex: wide ? 1.7 : undefined }}>
                <ResourceStatus
                  label="collection history"
                  resource={d.analytics}
                >
                  <CollectionsChart
                    income={d.analytics.data?.incomeRows || []}
                    expenses={d.analytics.data?.expenseV2Rows || []}
                  />
                </ResourceStatus>
              </Panel>
              <DashboardLaunchpad
                wide={wide}
                workspaceCount={workspaces.length}
                onNavigate={go}
                onBrowse={() => setTab('Workspaces')}
              />
            </MotionSection>
            {canReadSchools && (
              <SchoolPortfolio
                resource={d.schools}
                phone={phone}
                onNavigate={go}
              />
            )}
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
              <SpendComposition resource={d.analytics} />
              <BillingContext
                financial={d.financial}
                units={d.units}
                period={period}
                unit={unit}
                onUnitChange={setUnit}
              />
            </View>
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Explore all workspaces"
              onPress={() => setTab('Workspaces')}
              style={({ hovered }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: 24,
                borderWidth: 1,
                borderColor: p.line,
                borderRadius: borderRadius.xl,
                backgroundColor: hovered ? p.inset : p.surface,
              })}
            >
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ color: p.ink, fontSize: 17, fontWeight: '600' }}>
                  Everything else, one click away.
                </Text>
                <Text style={{ color: p.muted, fontSize: 13, lineHeight: 20 }}>
                  Explore {workspaces.length} workspaces for your people,
                  schools and business.
                </Text>
              </View>
              <ArrowRight size={22} color={p.action} />
            </MotionPressable>
          </View>
        ) : (
          <MotionSection key="workspaces" index={1}>
            <WorkspaceDirectory
              entries={workspaces}
              phone={phone}
              wide={wide}
              onNavigate={go}
            />
          </MotionSection>
        )}
        <View
          style={{
            borderTopWidth: 1,
            borderColor: p.line,
            paddingTop: 20,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: p.muted, fontSize: 10, letterSpacing: 1.2 }}>
            NEXSYRUS / {roleLabel || 'WORKSPACE'}
          </Text>
          <Text style={{ color: p.muted, fontSize: 11 }}>
            {sourceErrors && tab === 'Overview'
              ? 'Some data sources need attention'
              : d.refreshing
              ? 'Refreshing your workspace…'
              : 'Built around your work.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
