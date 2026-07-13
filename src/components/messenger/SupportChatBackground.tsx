import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, Path, Pattern, Polygon, Rect } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';

/** Same stationery-pattern visual language used by SchoolIMS SchoolBackground. */
export function SupportChatBackground() {
  const { colors, isDark } = useTheme();
  const stroke = colors.primary;
  const icon = { stroke, fill: 'none', strokeWidth: 1.25, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id="support-school-pattern" width="180" height="180" patternUnits="userSpaceOnUse">
            <Rect width="180" height="180" fill={isDark ? colors.background : '#FBFAF6'} />
            <G {...icon} opacity={isDark ? 0.17 : 0.15}>
              <G transform="translate(34,35)"><Circle r="12" /><Line x1="0" y1="-12" x2="0" y2="12" /><Line x1="-12" y1="0" x2="12" y2="0" /></G>
              <G transform="translate(114,31) rotate(-18)"><Rect x="-17" y="-5" width="34" height="10" rx="2" /><Line x1="-11" y1="-5" x2="-11" y2="0" /><Line x1="-4" y1="-5" x2="-4" y2="-1" /><Line x1="3" y1="-5" x2="3" y2="0" /><Line x1="10" y1="-5" x2="10" y2="-1" /></G>
              <G transform="translate(74,94)"><Path d="M0,-14 C-3,-11 -12,-5 -12,4 C-12,12 -7,16 -4,18 H4 C7,16 12,12 12,4 C12,-5 3,-11 0,-14Z" /><Line x1="0" y1="-14" x2="0" y2="-20" /><Path d="M0,-18 Q8,-24 10,-18" /></G>
              <G transform="translate(145,105)"><Polygon points="0,-17 -16,14 16,14" /><Path d="M-10,11 L-10,6 L-5,6" /></G>
              <G transform="translate(28,146)"><Path d="M-16,8 A16,16 0 0 1 16,8" /><Line x1="-16" y1="8" x2="16" y2="8" /><Circle cy="8" r="1.5" /></G>
              <G transform="translate(108,153)"><Path d="M-15,8 Q0,-8 15,8" /><Line x1="-13" y1="8" x2="13" y2="8" /><Line x1="0" y1="-1" x2="0" y2="8" /></G>
              <Circle cx="156" cy="61" r="2" fill={stroke} /><Path d="M18,82 h8 M22,78 v8" /><Path d="M151,151 l4,4 m0,-4 l-4,4" />
            </G>
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#support-school-pattern)" />
      </Svg>
    </View>
  );
}
