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
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { useRouter } from 'expo-router';
import { Layers, LayoutGrid, BarChart3 } from 'lucide-react-native';
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
  const scope = `${
    user?.id || founder?.id || currentAdmin?.id || 'signed-in'
  }:${selectedCluster?.cluster_id || 'default'}`;
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
    canApproveReject
  );

  const workspaces = dashboardWorkspaces.filter(
    (w) =>
      !('permission' in w) ||
      can(w.permission) ||
      ('alternate' in w && can(w.alternate))
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
      contentContainerStyle={{ padding: phone ? 18 : 36, paddingBottom: 48 }}
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
        <View
          style={[
            st.header,
            {
              backgroundColor: p.hero,
              borderRadius: 22,
              padding: phone ? 24 : 32,
              minHeight: phone ? 210 : 174,
              overflow: 'hidden',
              position: 'relative',
            },
            Platform.OS === 'web' &&
              ({
                backgroundImage:
                  'linear-gradient(115deg, #101F35 0%, #172D4B 65%, #244467 100%)',
              } as any),
            phone && { alignItems: 'stretch' },
          ]}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 290,
              height: 150,
              borderRadius: 24,
              transform: [{ rotate: '-24deg' }],
              borderWidth: 1,
              borderColor: '#E4B86B22',
              right: 160,
              top: -70,
            }}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              width: 190,
              height: 190,
              borderRadius: 28,
              transform: [{ rotate: '-24deg' }],
              borderWidth: 1,
              borderColor: '#FFFFFF12',
              right: -50,
              bottom: -130,
            }}
          />
          <View style={{ flex: 1, minWidth: 220 }}>
            <Text style={[ds.eyebrow, { color: '#E4B86B' }]}>
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
                color: '#FFFFFF',
                fontSize: phone ? 31 : 38,
                lineHeight: phone ? 38 : 46,
                fontWeight: '600',
                letterSpacing: -1.5,
              }}
            >
              {tab === 'Workspaces'
                ? 'Your work, connected.'
                : 'The big picture.'}
            </Text>
            <Text style={[ds.body, { color: '#CDDAED', marginTop: 7 }]}>
              {tab === 'Workspaces'
                ? 'Find your focus. Every tool and team, in one place.'
                : `Welcome back, ${name}. Make space for what matters next.`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
            <DashButton
              label="Refresh"
              inverse
              icon={false}
              busy={d.refreshing}
              onPress={() => void d.refresh()}
            />
            {can(PERMISSIONS.SCHOOLS_CREATE) ? (
              <DashButton
                label="Add school"
                inverse
                primary
                onPress={() => go('/(app)/schools/add')}
              />
            ) : null}
          </View>
        </View>

        <View
          style={[
            st.nav,
            {
              borderColor: p.line,
              backgroundColor: p.surface,
              borderWidth: 1,
              borderRadius: 12,
              padding: 5,
              paddingRight: 16,
            },
          ]}
        >
          <View
            accessibilityRole="tablist"
            style={{ flexDirection: 'row', gap: 4 }}
          >
            {(['Overview', 'Workspaces'] as const).map((t) => (
              <Pressable
                key={t}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === t }}
                aria-selected={tab === t}
                onPress={() => setTab(t)}
                style={({ hovered }: any) => ({
                  minHeight: 42,
                  borderRadius: 8,
                  paddingHorizontal: phone ? 12 : 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor:
                    tab === t ? p.greenFill : hovered ? p.inset : 'transparent',
                })}
              >
                {t === 'Overview' ? (
                  <BarChart3
                    size={15}
                    color={tab === t ? '#FFFFFF' : p.muted}
                  />
                ) : (
                  <LayoutGrid
                    size={15}
                    color={tab === t ? '#FFFFFF' : p.muted}
                  />
                )}
                <Text
                  style={{
                    color: tab === t ? '#FFFFFF' : p.muted,
                    fontWeight: '600',
                    fontSize: 12,
                  }}
                >
                  {t}
                </Text>
                {t === 'Workspaces' && (
                  <View
                    style={{
                      borderRadius: 5,
                      backgroundColor: tab === t ? '#FFFFFF20' : p.inset,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text
                      style={{
                        color: tab === t ? '#FFFFFF' : p.muted,
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {workspaces.length}
                    </Text>
                  </View>
                )}
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

        {sourceErrors && tab === 'Overview' ? (
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
            {sourceErrors && tab === 'Overview'
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
