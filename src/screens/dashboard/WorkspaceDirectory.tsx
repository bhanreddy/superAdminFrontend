import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  Layers,
  MessageCircle,
  Receipt,
  School,
  Search,
  Target,
  Users,
  Wallet,
  BarChart3,
} from 'lucide-react-native';
import {
  ds,
  EmptyNote,
  SectionHeading,
  useDashboardPalette,
} from './DashboardPrimitives';
import { dashboardStyles as st } from './dashboardStyles';

import { dashboardWorkspaces } from './dashboardWorkspaces';
const ICONS = {
  school: School,
  check: CheckCheck,
  layers: Layers,
  book: BookOpen,
  wallet: Wallet,
  receipt: Receipt,
  users: Users,
  target: Target,
  chart: BarChart3,
  message: MessageCircle,
};
export function WorkspaceDirectory({
  entries: workspaces,
  phone,
  wide,
  onNavigate,
}: {
  entries: readonly (typeof dashboardWorkspaces)[number][];
  phone: boolean;
  wide: boolean;
  onNavigate: (route: string) => void;
}) {
  const p = useDashboardPalette();
  const [workspaceQuery, setWorkspaceQuery] = useState('');
  const shownWorkspaces = workspaces.filter((w) =>
    `${w.title} ${w.detail} ${w.category}`
      .toLowerCase()
      .includes(workspaceQuery.trim().toLowerCase()),
  );
  return (
    <>
      <View style={{ gap: 10 }}>
        <SectionHeading
          eyebrow="EVERYTHING IN ITS PLACE"
          title="Choose your next workspace"
        />
        <View
          style={[
            st.search,
            {
              backgroundColor: p.surface,
              borderColor: p.line,
              maxWidth: 600,
            },
          ]}
        >
          <Search size={17} color={p.muted} />
          <TextInput
            accessibilityLabel="Find a workspace"
            placeholder="Search workspace names or categories…"
            placeholderTextColor={p.muted}
            value={workspaceQuery}
            onChangeText={setWorkspaceQuery}
            style={{
              color: p.ink,
              flex: 1,
              minWidth: 0,
              fontSize: 16,
              paddingVertical: 14,
            }}
          />
        </View>
      </View>
      {shownWorkspaces.length ? (
        [...new Set(shownWorkspaces.map((w) => w.category))].map((category) => (
          <View key={category} style={{ gap: 12 }}>
            <Text
              accessibilityRole="header"
              style={[ds.eyebrow, { color: p.muted, marginBottom: 0 }]}
            >
              {category}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              {shownWorkspaces
                .filter((w) => w.category === category)
                .map((w) => {
                  const Icon = ICONS[w.icon];
                  return (
                    <Pressable
                      key={w.title}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${w.title}`}
                      onPress={() => onNavigate(w.route)}
                      style={({ hovered, pressed }: any) => [
                        st.workspaceCard,
                        {
                          backgroundColor: hovered ? p.inset : p.surface,
                          borderColor: p.line,
                          width: phone ? '100%' : wide ? '31.8%' : '48%',
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 20,
                        }}
                      >
                        <Icon size={22} color={p.green} />
                        <ArrowUpRight size={16} color={p.muted} />
                      </View>
                      <Text
                        style={{
                          color: p.ink,
                          fontSize: 17,
                          fontWeight: '600',
                        }}
                      >
                        {w.title}
                      </Text>
                      <Text style={[ds.body, { color: p.muted, marginTop: 7 }]}>
                        {w.detail}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        ))
      ) : (
        <EmptyNote
          title="No matching workspace."
          detail="Try schools, finance, content or another workspace name."
        />
      )}
    </>
  );
}
