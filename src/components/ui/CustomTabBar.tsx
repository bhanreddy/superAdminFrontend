import React, { useEffect, useRef } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  Easing,
} from 'react-native';
import { pressableWebStyles } from '../../utils/webPressable';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import {
  Home,
  School,
  Users,
  Briefcase,
  Settings,
  FileText,
  ShieldCheck,
  CalendarDays,
  Store,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const H_PADDING = 20;
const TAB_BAR_HEIGHT = 74;
const BAR_WIDTH = SCREEN_WIDTH - H_PADDING * 2;

const ACCENTS = ['#818CF8', '#34D399', '#FCD34D', '#F472B6', '#22D3EE'];
const getAccent = (i: number) => ACCENTS[i % ACCENTS.length];

type IconKey =
  | 'dashboard'
  | 'schools'
  | 'students'
  | 'staff'
  | 'settings'
  | 'reports'
  | 'admins'
  | 'calendar'
  | 'medical';

const Icons: Record<
  IconKey,
  (color: string, size: number, focused: boolean) => React.ReactNode
> = {
  dashboard: (c, s, f) => <Home color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  schools: (c, s, f) => <School color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  students: (c, s, f) => <Users color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  staff: (c, s, f) => <Briefcase color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  settings: (c, s, f) => <Settings color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  reports: (c, s, f) => <FileText color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  admins: (c, s, f) => <ShieldCheck color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  calendar: (c, s, f) => <CalendarDays color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
  medical: (c, s, f) => <Store color={c} size={s} strokeWidth={f ? 2.5 : 2} />,
};

const ICON_MAP: Record<string, IconKey> = {
  index: 'dashboard',
  'schools/index': 'schools',
  'schools/add': 'schools',
  'students/index': 'students',
  'staff/index': 'staff',
  'admins/index': 'admins',
  'admins/add': 'admins',
  'settings/index': 'settings',
  reports: 'reports',
  calendar: 'calendar',
  'medical/list': 'medical',
  'medical/add': 'medical',
};

function renderIcon(route: string, color: string, size: number, focused: boolean) {
  const key = ICON_MAP[route] || (route as IconKey) || 'dashboard';
  return Icons[key]?.(color, size, focused);
}

function useShimmer() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 2600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return anim;
}

const TabItem = React.memo(function TabItem({
  routeName,
  focused,
  accent,
  onPress,
}: {
  routeName: string;
  focused: boolean;
  accent: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.15 : 1,
      tension: 220,
      friction: 12,
      useNativeDriver: true,
    }).start();
  }, [focused]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tab, ...pressableWebStyles(pressed, { pressedOpacity: 1 })]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {renderIcon(routeName, focused ? accent : '#777', 24, focused)}
      </Animated.View>
    </Pressable>
  );
});

export const CustomTabBar = React.memo(function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark, colors, clayShadows } = useTheme();
  const shimmer = useShimmer();

  const VISIBLE_TABS = new Set([
    'index',
    'schools/index',
    'students/index',
    'medical/list',
    'admins/index',
  ]);

  const visibleRoutes = state.routes.filter(
    (route) => VISIBLE_TABS.has(route.name)
  );

  // Find the active index among VISIBLE routes, not all routes.
  const activeRoute = state.routes[state.index];
  let activeIdx = visibleRoutes.findIndex(r => r.key === activeRoute.key);
  if (activeIdx === -1) activeIdx = 0;

  const tabCount = visibleRoutes.length || 1;
  const tabWidth = BAR_WIDTH / tabCount;

  const segmentX = useRef(new Animated.Value(0)).current;
  const orbX = useRef(new Animated.Value(tabWidth / 2)).current;

  useEffect(() => {
    const targetX = activeIdx * tabWidth;
    
    Animated.spring(segmentX, {
      toValue: isNaN(targetX) ? 0 : targetX,
      tension: 140,
      friction: 16,
      useNativeDriver: true,
    }).start();

    const targetOrbX = activeIdx * tabWidth + tabWidth / 2;
    Animated.spring(orbX, {
      toValue: isNaN(targetOrbX) ? tabWidth / 2 : targetOrbX,
      tension: 180,
      friction: 18,
      useNativeDriver: true,
    }).start();
  }, [activeIdx, tabWidth]);

  const shimmerTx = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAR_WIDTH, BAR_WIDTH],
  });

  return (
    <View style={[
      styles.wrapper,
      Platform.OS === 'web' ? {
        boxShadow: isDark
          ? '0 -8px 32px rgba(0,0,0,0.35)'
          : '0 -8px 32px rgba(148, 163, 184, 0.05), 0 -1px 2px rgba(0,0,0,0.02)',
      } as any : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: 16,
        elevation: 10,
      },
    ]}>

      {/* segmented highlight */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.segmentHighlight,
          {
            width: tabWidth,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.06)',
            transform: [{ translateX: segmentX }],
          },
        ]}
      />

      {/* active orb */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeOrb,
          {
            transform: [{ translateX: orbX }],
            backgroundColor: isDark ? '#fff' : colors.primary,
          },
        ]}
      />

      <BlurView
        intensity={80}
        tint={isDark ? 'dark' : 'light'}
        style={styles.bar}
      >

        <Animated.View
          pointerEvents="none"
          style={[
            styles.shimmerStripe,
            { transform: [{ translateX: shimmerTx }] },
          ]}
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.04)', 'transparent']}
            style={{ flex: 1 }}
          />
        </Animated.View>

        <View style={styles.row}>
          {visibleRoutes.map((route, i) => {
            const focused = i === activeIdx;

            const onPress = () => {
              const routeInState = state.routes.find(r => r.key === route.key);
              if (routeInState && route.key !== activeRoute.key) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TabItem
                key={route.key}
                routeName={route.name}
                focused={focused}
                accent={getAccent(i)}
                onPress={onPress}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? 16 : 30,
    left: H_PADDING,
    right: H_PADDING,
    borderRadius: 28,
  },

  bar: {
    height: TAB_BAR_HEIGHT,
    borderRadius: 28,
    overflow: 'hidden',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    flex: 1,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },

  segmentHighlight: {
    position: 'absolute',
    height: TAB_BAR_HEIGHT - 14,
    top: 7,
    borderRadius: 22,
  },

  activeOrb: {
    position: 'absolute',
    bottom: -4,
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.9,
    shadowRadius: 8,
  },

  shimmerStripe: {
    position: 'absolute',
    width: 120,
    top: 0,
    bottom: 0,
  },
});