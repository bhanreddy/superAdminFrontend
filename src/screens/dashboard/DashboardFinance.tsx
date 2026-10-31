import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Picker } from '@react-native-picker/picker';
import { ArrowUpRight } from 'lucide-react-native';
import {
  ds,
  EmptyNote,
  Panel,
  ResourceStatus,
  SectionHeading,
  useDashboardPalette,
} from './DashboardPrimitives';
import { dashboardStyles as st } from './dashboardStyles';
import {
  money,
  number,
  PERIODS,
  spendComposition,
  type FinancePeriod,
} from './dashboardModel';
import type { DashboardData } from './useDashboardData';

export function FinancialPulse({
  resource,
  period,
  onPeriodChange,
  phone,
  wide,
  onNavigate,
}: {
  resource: DashboardData['financial'];
  period: FinancePeriod;
  onPeriodChange: (period: FinancePeriod) => void;
  phone: boolean;
  wide: boolean;
  onNavigate: (route: string) => void;
}) {
  const p = useDashboardPalette();
  const financial = resource.data;
  return (
    <View
      style={[
        st.hero,
        { backgroundColor: p.hero, flex: wide ? 1.7 : undefined },
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'space-between',
        }}
      >
        <Text style={[ds.eyebrow, { color: '#C9DDCA', marginBottom: 0 }]}>
          FINANCIAL PULSE
        </Text>
        <View style={[st.pill, { borderColor: '#567765' }]}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: p.lime,
            }}
          />
          <Text
            style={{
              color: '#DFEADB',
              fontSize: 10,
              fontWeight: '600',
            }}
          >
            NEXSYRUS BOOKS
          </Text>
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 5,
          marginTop: 20,
          marginBottom: 14,
        }}
      >
        {PERIODS.map((option) => (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: period === option.value }}
            aria-pressed={period === option.value}
            onPress={() => onPeriodChange(option.value)}
            style={{
              minHeight: 44,
              paddingHorizontal: 11,
              borderRadius: 8,
              justifyContent: 'center',
              backgroundColor:
                period === option.value ? '#315C46' : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: period === option.value ? '#F5F9F0' : '#BFD2C0',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <ResourceStatus resource={resource} label="financial summary" inverse>
        <Text style={{ color: '#D2E2D0', fontSize: 13 }}>
          Posted revenue ·{' '}
          {PERIODS.find((o) => o.value === period)?.label.toLowerCase()}
        </Text>
        <Text
          accessibilityLabel={`Posted revenue ${money(financial?.revenue)}`}
          style={{
            color: p.heroText,
            fontSize: phone ? 44 : 57,
            fontWeight: '500',
            letterSpacing: -2,
            marginVertical: 12,
          }}
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {money(financial?.revenue)}
        </Text>
        <Text style={{ color: '#C6D9C5', fontSize: 12, lineHeight: 19 }}>
          A view of your posted ledger. Billing receipts are shown separately.
        </Text>
        <View style={[st.heroMetrics, { borderColor: '#466750' }]}>
          {[
            ['Expenses', money(financial?.expenses)],
            ['Net result', money(financial?.net_profit)],
            [
              'Profit margin',
              financial?.profit_margin == null
                ? '—'
                : `${number(financial.profit_margin).toFixed(1)}%`,
            ],
          ].map(([label, value]) => (
            <View
              key={label}
              style={{ flex: 1, minWidth: phone ? 105 : 120, gap: 9 }}
            >
              <Text style={{ color: '#C6D9C5', fontSize: 11 }}>{label}</Text>
              <Text
                style={{
                  color: label === 'Net result' ? p.lime : p.heroText,
                  fontSize: 21,
                  fontWeight: '600',
                  letterSpacing: -0.5,
                }}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </ResourceStatus>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open financial reports"
        onPress={() => onNavigate('/(app)/books?module=reports')}
        style={[st.heroLink, { backgroundColor: p.lime }]}
      >
        <Text
          style={{
            color: '#193B2C',
            fontSize: 12,
            fontWeight: '700',
          }}
        >
          Explore your books
        </Text>
        <ArrowUpRight size={16} color="#193B2C" />
      </Pressable>
    </View>
  );
}
export function SpendComposition({
  resource,
}: {
  resource: DashboardData['analytics'];
}) {
  const p = useDashboardPalette();
  const spend = useMemo(
    () => spendComposition(resource.data?.expenseV2Rows || []),
    [resource.data],
  );
  const spendTotal = spend.reduce((n, r) => n + r.amount, 0);
  return (
    <Panel style={{ flex: 1 }}>
      <SectionHeading
        eyebrow="SPENDING IN FOCUS"
        title="Where this month goes"
      />
      <ResourceStatus label="spending categories" resource={resource}>
        {spend.length ? (
          <View style={{ gap: 17 }}>
            {spend.slice(0, 5).map((r) => (
              <View key={r.label} style={{ gap: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <Text style={{ color: p.ink, fontSize: 13, flex: 1 }}>
                    {r.label.replaceAll('_', ' ')}
                  </Text>
                  <Text style={{ color: p.muted, fontSize: 13 }}>
                    {money(r.amount)}
                  </Text>
                </View>
                <View
                  style={{
                    height: 5,
                    borderRadius: 3,
                    backgroundColor: p.inset,
                  }}
                >
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      width: `${(r.amount / spendTotal) * 100}%`,
                      backgroundColor: p.green,
                    }}
                  />
                </View>
              </View>
            ))}
            <Text style={{ color: p.muted, fontSize: 11 }}>
              Approved operating expenses · current calendar month
            </Text>
          </View>
        ) : (
          <EmptyNote
            title="No approved spend to break down."
            detail="Categories appear as this month's operating expenses are approved."
          />
        )}
      </ResourceStatus>
    </Panel>
  );
}
export function BillingContext({
  financial: financialResource,
  units,
  period,
  unit,
  onUnitChange,
}: {
  financial: DashboardData['financial'];
  units: DashboardData['units'];
  period: FinancePeriod;
  unit: string;
  onUnitChange: (unit: string) => void;
}) {
  const p = useDashboardPalette();
  const financial = financialResource.data;
  return (
    <Panel style={{ flex: 1 }}>
      <SectionHeading
        eyebrow="FINANCE WITH CONTEXT"
        title="Receipts & business units"
      />
      <ResourceStatus resource={financialResource} label="billing receipts">
        <Text style={{ color: p.muted, fontSize: 12 }}>
          Client billing collected ·{' '}
          {PERIODS.find((o) => o.value === period)?.label.toLowerCase()}
        </Text>
        <Text
          style={{
            color: p.ink,
            fontSize: 32,
            fontWeight: '500',
            marginVertical: 12,
            letterSpacing: -1,
          }}
        >
          {money(financial?.client_billing_collected)}
        </Text>
      </ResourceStatus>
      <Text style={[ds.body, { color: p.muted, marginBottom: 12 }]}>
        Inspect unit collections without changing the platform-wide Books totals
        above.
      </Text>
      <ResourceStatus resource={units} label="business units">
        <View
          style={{
            borderWidth: 1,
            borderColor: p.line,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <Picker
            accessibilityLabel="Collection business unit"
            selectedValue={unit}
            onValueChange={(value) => onUnitChange(String(value))}
            style={{
              color: p.ink,
              backgroundColor: p.surface,
              minHeight: 46,
            }}
            dropdownIconColor={p.muted}
          >
            <Picker.Item label="All business units" value="ALL" />
            {(units.data || []).map((u) => (
              <Picker.Item key={u.id} label={u.name} value={u.id} />
            ))}
          </Picker>
        </View>
      </ResourceStatus>
      {unit !== 'ALL' && financial ? (
        <Text style={{ color: p.green, fontSize: 13, marginTop: 12 }}>
          Selected unit collections:{' '}
          {money(financial.business_unit_collections)}
        </Text>
      ) : null}
    </Panel>
  );
}
