import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ChevronRight, Search } from 'lucide-react-native';
import {
  DashButton,
  EmptyNote,
  Panel,
  ResourceStatus,
  SectionHeading,
  useDashboardPalette,
} from './DashboardPrimitives';
import { dashboardStyles as st } from './dashboardStyles';
import { filterSchools, schoolState } from './dashboardModel';
import type { DashboardData } from './useDashboardData';

export function SchoolPortfolio({
  resource,
  phone,
  onNavigate,
}: {
  resource: DashboardData['schools'];
  phone: boolean;
  onNavigate: (route: string) => void;
}) {
  const p = useDashboardPalette(),
    router = useRouter();
  const [query, setQuery] = useState(''),
    [schoolFilter, setSchoolFilter] = useState('All');
  const schools = useMemo(
    () => filterSchools(resource.data || [], query, schoolFilter),
    [resource.data, query, schoolFilter],
  );
  return (
    <Panel>
      <SectionHeading
        eyebrow="YOUR SCHOOL NETWORK"
        title="A portfolio of possibilities"
        action={
          <DashButton
            label="School directory"
            onPress={() => onNavigate('/(app)/schools')}
          />
        }
      />
      <View
        style={{
          flexDirection: phone ? 'column' : 'row',
          flexWrap: 'wrap',
          gap: 14,
          alignItems: phone ? 'stretch' : 'center',
          marginBottom: 12,
        }}
      >
        <View
          style={[
            st.search,
            {
              borderColor: p.line,
              backgroundColor: p.inset,
              flex: phone ? undefined : 1,
            },
          ]}
        >
          <Search size={16} color={p.muted} />
          <TextInput
            accessibilityLabel="Search school portfolio"
            placeholder="Find a school or code…"
            placeholderTextColor={p.muted}
            value={query}
            onChangeText={setQuery}
            style={{
              color: p.ink,
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              paddingVertical: 12,
            }}
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear school search"
              onPress={() => setQuery('')}
              style={{
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: p.green, fontSize: 12 }}>Clear</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {['All', 'Live', 'Onboarding', 'Paused'].map((status) => (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityState={{
                selected: schoolFilter === status,
              }}
              aria-pressed={schoolFilter === status}
              onPress={() => setSchoolFilter(status)}
              style={{
                minHeight: 44,
                paddingHorizontal: 12,
                borderRadius: 8,
                backgroundColor:
                  schoolFilter === status ? p.inset : 'transparent',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  color: schoolFilter === status ? p.green : p.muted,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {status}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <ResourceStatus resource={resource} label="school portfolio">
        {schools.length ? (
          <>
            {schools.slice(0, 5).map((s, i) => {
              const status = schoolState(s);
              return (
                <Pressable
                  key={`${s.cluster_id || 'selected'}:${s.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${s.name}, ${s.code}, ${status}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(app)/schools/[id]',
                      params: {
                        id: String(s.id),
                        ...(s.cluster_id ? { cluster_id: s.cluster_id } : {}),
                      },
                    } as any)
                  }
                  style={({ hovered, pressed }: any) => [
                    st.schoolRow,
                    {
                      borderTopWidth: i ? 1 : 0,
                      borderColor: p.line,
                      backgroundColor: hovered ? p.inset : 'transparent',
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={[st.monogram, { backgroundColor: p.inset }]}>
                    <Text
                      style={{
                        color: p.green,
                        fontWeight: '700',
                        fontSize: 16,
                      }}
                    >
                      {s.name
                        .split(' ')
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((v) => v[0])
                        .join('')
                        .toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
                    <Text
                      style={{
                        color: p.ink,
                        fontSize: 16,
                        fontWeight: '600',
                      }}
                    >
                      {s.name}
                    </Text>
                    <Text style={{ color: p.muted, fontSize: 11 }}>
                      {s.code}
                      {!phone && s.address ? ` · ${s.address}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      st.pill,
                      {
                        backgroundColor:
                          status === 'Onboarding' ? p.amberBg : p.inset,
                        borderColor: 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: status === 'Onboarding' ? p.amber : p.green,
                        fontSize: 10,
                        fontWeight: '600',
                      }}
                    >
                      {status}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={p.muted} />
                </Pressable>
              );
            })}
            <Text style={{ color: p.muted, fontSize: 11, paddingTop: 15 }}>
              {Math.min(schools.length, 5)} shown · {schools.length} matching{' '}
              {schools.length === 1 ? 'school' : 'schools'}
            </Text>
          </>
        ) : (
          <EmptyNote
            title={
              query || schoolFilter !== 'All'
                ? 'No schools match this view.'
                : 'Your next partnership starts here.'
            }
            detail={
              query || schoolFilter !== 'All'
                ? 'Try another name or select All to broaden your view.'
                : 'Registered schools will appear in your portfolio.'
            }
          />
        )}
      </ResourceStatus>
    </Panel>
  );
}
