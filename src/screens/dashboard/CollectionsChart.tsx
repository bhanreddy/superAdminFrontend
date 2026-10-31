import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Line, Path, Circle } from 'react-native-svg';
import { collectionTrend, money, type AnalyticsRow } from './dashboardModel';
import {
  ds,
  EmptyNote,
  SectionHeading,
  useDashboardPalette,
} from './DashboardPrimitives';

export function CollectionsChart({
  income,
  expenses,
}: {
  income: AnalyticsRow[];
  expenses: AnalyticsRow[];
}) {
  const p = useDashboardPalette();
  const [range, setRange] = useState(6),
    [table, setTable] = useState(false);
  const points = useMemo(
    () => collectionTrend(income, expenses, range),
    [income, expenses, range],
  );
  const all = points
    .flatMap((r) => [r.collections, r.expenses])
    .filter((v): v is number => v !== null);
  const min = Math.min(0, ...all),
    max = Math.max(1, ...all),
    span = max - min;
  const y = (v: number) => 156 - ((v - min) / span) * 134;
  const x = (i: number) =>
    points.length < 2 ? 310 : 18 + i * (584 / (points.length - 1));
  const path = (key: 'collections' | 'expenses') => {
    let gap = true;
    return points
      .map((r, i) => {
        const v = r[key];
        if (v == null) {
          gap = true;
          return '';
        }
        const command = `${gap ? 'M' : 'L'} ${x(i)} ${y(v)}`;
        gap = false;
        return command;
      })
      .join(' ');
  };
  return (
    <>
      <SectionHeading
        eyebrow="THE LONG VIEW"
        title="Collections & spend"
        action={
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {[3, 6].map((n) => (
              <Pressable
                key={n}
                accessibilityRole="button"
                accessibilityLabel={`Show ${n} months`}
                accessibilityState={{ selected: range === n }}
                aria-pressed={range === n}
                onPress={() => setRange(n)}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: 9,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: range === n ? p.inset : 'transparent',
                }}
              >
                <Text
                  style={{
                    color: range === n ? p.green : p.muted,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {n}M
                </Text>
              </Pressable>
            ))}
          </View>
        }
      />
      {points.length ? (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 18,
              marginBottom: 18,
            }}
          >
            {[
              ['Approved collections', p.green],
              ['Approved expenses', p.blue],
            ].map(([label, color]) => (
              <View
                key={label}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}
              >
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <Text style={{ color: p.muted, fontSize: 12 }}>{label}</Text>
              </View>
            ))}
          </View>
          <View
            accessible
            accessibilityLabel={`Monthly approved collections and expenses. ${points.map((r) => `${r.label}: collections ${r.collections == null ? 'unavailable' : money(r.collections)}, expenses ${r.expenses == null ? 'unavailable' : money(r.expenses)}`).join('. ')}`}
          >
            <Svg
              width="100%"
              height={185}
              viewBox="0 0 620 180"
              preserveAspectRatio="none"
              accessible={false}
            >
              {[22, 67, 112, 156].map((v) => (
                <Line
                  key={v}
                  x1={0}
                  y1={v}
                  x2={620}
                  y2={v}
                  stroke={p.line}
                  strokeWidth={1}
                  strokeDasharray="3 5"
                />
              ))}
              {min < 0 ? (
                <Line
                  x1={0}
                  x2={620}
                  y1={y(0)}
                  y2={y(0)}
                  stroke={p.muted}
                  strokeWidth={1}
                />
              ) : null}
              <Path
                d={path('expenses')}
                fill="none"
                stroke={p.blue}
                strokeWidth={2.5}
                strokeDasharray="5 5"
              />
              <Path
                d={path('collections')}
                fill="none"
                stroke={p.green}
                strokeWidth={3}
              />
              {points.map((r, i) => (
                <React.Fragment key={r.key}>
                  {r.collections != null ? (
                    <Circle
                      cx={x(i)}
                      cy={y(r.collections)}
                      r={4}
                      fill={p.surface}
                      stroke={p.green}
                      strokeWidth={2}
                    />
                  ) : null}
                  {r.expenses != null ? (
                    <Circle cx={x(i)} cy={y(r.expenses)} r={3} fill={p.blue} />
                  ) : null}
                </React.Fragment>
              ))}
            </Svg>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: 3,
            }}
          >
            {points.map((r) => (
              <Text key={r.key} style={{ color: p.muted, fontSize: 10 }}>
                {r.label}
              </Text>
            ))}
          </View>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
            }}
          >
            <Text style={[ds.body, { color: p.muted, flex: 1, minWidth: 150 }]}>
              Monthly operations · separate from Books revenue.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: table }}
              aria-expanded={table}
              onPress={() => setTable((v) => !v)}
              style={{ minHeight: 44, justifyContent: 'center' }}
            >
              <Text style={{ color: p.green, fontSize: 12, fontWeight: '700' }}>
                {table ? 'Hide values' : 'View values'}
              </Text>
            </Pressable>
          </View>
          {table ? (
            <View
              style={{
                gap: 9,
                borderTopWidth: 1,
                borderColor: p.line,
                paddingTop: 12,
              }}
            >
              {points.map((r) => (
                <View
                  key={r.key}
                  style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}
                >
                  <Text style={{ color: p.muted, width: 52, fontSize: 12 }}>
                    {r.label}
                  </Text>
                  <Text style={{ color: p.green, flex: 1, fontSize: 12 }}>
                    In {r.collections == null ? '—' : money(r.collections)}
                  </Text>
                  <Text style={{ color: p.blue, flex: 1, fontSize: 12 }}>
                    Out {r.expenses == null ? '—' : money(r.expenses)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyNote
          title="The story starts with your first entry."
          detail="Approved collection and expense history will appear here. Missing history is never replaced with example figures."
        />
      )}
    </>
  );
}
