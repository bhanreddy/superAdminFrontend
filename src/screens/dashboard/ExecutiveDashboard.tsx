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
import { dashboardStyles as st } from './dashboardStyles';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Layers } from 'lucide-react-native';
import { useAuth } from '../../hooks/useAuth';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import { useCluster } from '../../contexts/ClusterContext';
import { PERMISSIONS } from '../../constants/rbac';
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
  // A different account or cluster gets a new controller and no previous-account data.
  const scope = `${user?.id || founder?.id || currentAdmin?.id || 'signed-in'}:${selectedCluster?.cluster_id || 'default'}`;
  return <ExecutiveWorkspace key={scope} scope={scope} />;
}
function ExecutiveWorkspace({ scope }: { scope: string }) {
  const p = useDashboardPalette(),
    router = useRouter();
  const { width } = useWindowDimensions();
  const phone = width < 600,
    wide = width >= 1250;
  const { can, currentAdmin, founder, user, roleLabel } = useAuth();
  const { canApproveReject } = useFounderAuth();
  const { selectedCluster } = useCluster();
  const [tab, setTab] = useState<'Overview' | 'Workspaces'>('Overview');
  const [period, setPeriod] = useState<FinancePeriod>('THIS_MONTH'),
    [unit, setUnit] = useState('ALL');
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
    'your team'
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: p.canvas }}
      contentContainerStyle={{ padding: phone ? 16 : 30, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={d.refreshing}
          onRefresh={() => void d.refresh()}
          tintColor={p.green}
        />
      }
    >
      <View
        style={{ maxWidth: 1500, width: '100%', alignSelf: 'center', gap: 24 }}
      >
        <View style={[st.header, phone && { alignItems: 'stretch' }]}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={[ds.eyebrow, { color: p.muted }]}>
              {date.toLocaleDateString('en-IN', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Text
              accessibilityRole="header"
              style={{
                color: p.ink,
                fontSize: phone ? 31 : 38,
                lineHeight: phone ? 38 : 46,
                fontWeight: '600',
                letterSpacing: -1.5,
              }}
            >
              The big picture.
            </Text>
            <Text style={[ds.body, { color: p.muted, marginTop: 7 }]}>
              Welcome back, {name}. Make space for what matters next.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            <DashButton
              label="Refresh"
              icon={false}
              busy={d.refreshing}
              onPress={() => void d.refresh()}
            />
            {can(PERMISSIONS.SCHOOLS_CREATE) ? (
              <DashButton
                label="Add school"
                primary
                onPress={() => go('/(app)/schools/add')}
              />
            ) : null}
          </View>
        </View>

        <View style={[st.nav, { borderColor: p.line }]}>
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: 'row', gap: phone ? 20 : 30 }}
          >
            {(['Overview', 'Workspaces'] as const).map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                aria-selected={tab === t}
                onPress={() => setTab(t)}
                style={{
                  minHeight: 50,
                  borderBottomWidth: 2,
                  borderBottomColor: tab === t ? p.green : 'transparent',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    color: tab === t ? p.green : p.muted,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {t}
                  {t === 'Workspaces' ? `  ${workspaces.length}` : ''}
                </Text>
              </Pressable>
            ))}
          </View>
          {!phone ? (
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
            >
              <Layers size={13} color={p.muted} />
              <Text style={{ color: p.muted, fontSize: 11 }}>
                {selectedCluster?.label || 'Selected workspace'}
              </Text>
            </View>
          ) : null}
        </View>

        {sourceErrors ? (
          <View
            accessibilityRole="alert"
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: p.amberBg,
            }}
          >
            <Text style={[ds.body, { color: p.amber }]}>
              {sourceErrors} data{' '}
              {sourceErrors === 1 ? 'source is' : 'sources are'} unavailable.
              Available sections remain usable; retry the affected sections
              below.
            </Text>
          </View>
        ) : null}

        {tab === 'Overview' ? (
          <>
            <View
              style={{
                flexDirection: wide ? 'row' : 'column',
                gap: 22,
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
            </View>

            <NetworkOverview resource={d.stats} phone={phone} onNavigate={go} />

            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 22 }}>
              <Panel style={{ flex: wide ? 1.7 : undefined }}>
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
            </View>

            {canReadSchools ? (
              <SchoolPortfolio
                resource={d.schools}
                phone={phone}
                onNavigate={go}
              />
            ) : null}

            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 22 }}>
              <SpendComposition resource={d.analytics} />
              <BillingContext
                financial={d.financial}
                units={d.units}
                period={period}
                unit={unit}
                onUnitChange={setUnit}
              />
            </View>
          </>
        ) : (
          <WorkspaceDirectory
            entries={workspaces}
            phone={phone}
            wide={wide}
            onNavigate={go}
          />
        )}
        <View
          style={{
            borderTopWidth: 1,
            borderColor: p.line,
            paddingTop: 20,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: p.muted, fontSize: 10, letterSpacing: 1 }}>
            NEXSYRUS / {roleLabel || 'WORKSPACE'}
          </Text>
          <Text style={{ color: p.muted, fontSize: 11 }}>
            {sourceErrors
              ? 'Some data sources need attention'
              : d.refreshing
                ? 'Refreshing your workspace…'
                : 'Your workspace, in perspective.'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
