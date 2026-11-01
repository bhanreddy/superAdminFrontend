import React from 'react';
import { brandColors } from '../../constants/experienceColors';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/** An architectural illustration: many parts, one institution. */
export function InstitutionLandscape() {
  return (
    <View
      style={{ flex: 1 }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
    >
      <Svg width="100%" height="100%" viewBox="0 0 500 270">
        <Circle cx="370" cy="79" r="47" fill={brandColors.honey} />
        <Circle
          cx="370"
          cy="79"
          r="60"
          fill="none"
          stroke={brandColors.honey}
          strokeWidth="0.8"
        />
        <Path
          d="M20 227 C115 205 375 207 480 227"
          fill="none"
          stroke={brandColors.peach}
          strokeWidth="1"
        />
        <Ellipse cx="253" cy="240" rx="210" ry="16" fill={brandColors.rose} />
        <Path d="M52 115 L155 81 L155 224 L52 224 Z" fill={brandColors.peach} />
        <Path d="M52 115 L74 123 L155 96 L155 81 Z" fill={brandColors.paper} />
        <Path d="M52 115 L74 123 L74 224 L52 224 Z" fill={brandColors.rose} />
        <G fill={brandColors.paper}>
          <Rect x="89" y="136" width="9" height="22" />
          <Rect x="115" y="127" width="9" height="22" />
          <Rect x="89" y="174" width="9" height="22" />
          <Rect x="115" y="165" width="9" height="22" />
        </G>
        <Path d="M304 132 L406 112 L406 222 L304 222 Z" fill={brandColors.blueBright} />
        <Path d="M304 132 L326 142 L429 122 L406 112 Z" fill={brandColors.blueSoft} />
        <Path d="M326 142 L429 122 L429 222 L326 222 Z" fill={brandColors.blueBright} />
        <G fill={brandColors.navy}>
          <Path d="M344 159 L351 158 L351 183 L344 184 Z" />
          <Path d="M368 154 L375 153 L375 178 L368 179 Z" />
          <Path d="M392 150 L399 149 L399 174 L392 175 Z" />
        </G>
        <Path d="M148 88 L283 61 L320 79 L186 107 Z" fill={brandColors.paper} />
        <Path d="M148 88 L186 107 L186 225 L148 210 Z" fill={brandColors.peach} />
        <Path d="M186 107 L320 79 L320 225 L186 225 Z" fill={brandColors.paperDeep} />
        <Path
          d="M205 225 L205 161 C205 128 263 114 263 149 L263 225 Z"
          fill={brandColors.redDark}
        />
        <Path
          d="M216 225 L216 166 C216 140 252 129 252 155 L252 225 Z"
          fill={brandColors.ink}
        />
        <Line
          x1="234"
          y1="145"
          x2="234"
          y2="225"
          stroke={brandColors.honey}
          strokeWidth="0.8"
        />
        <Path d="M281 110 L295 107 L295 139 L281 142 Z" fill={brandColors.blue} />
        <Path d="M281 157 L295 154 L295 186 L281 189 Z" fill={brandColors.blue} />
        <Path d="M173 224 L321 224 L337 233 L156 233 Z" fill={brandColors.peach} />
        <Path d="M156 233 L337 233 L345 241 L147 241 Z" fill={brandColors.paper} />
        <Path d="M147 241 L345 241" stroke={brandColors.peach} strokeWidth="1" />
        <Path
          d="M418 222 L418 169"
          fill="none"
          stroke={brandColors.navy}
          strokeWidth="2"
        />
        <Ellipse cx="419" cy="155" rx="23" ry="32" fill={brandColors.blueBright} />
        <Path
          d="M418 183 L418 153 M418 174 L427 163 M418 166 L410 157"
          fill="none"
          stroke={brandColors.blue}
          strokeWidth="1"
        />
        <Path
          d="M39 224 L39 193 M39 214 C20 210 23 192 39 203 M39 208 C55 199 57 187 42 194"
          fill={brandColors.blueBright}
          stroke={brandColors.blueBright}
          strokeWidth="1.2"
        />
        <Line
          x1="34"
          y1="248"
          x2="456"
          y2="248"
          stroke={brandColors.honey}
          strokeWidth="0.8"
        />
        <Path
          d="M257 33 L257 14 M248 23 L267 23"
          stroke={brandColors.honey}
          strokeWidth="1"
        />
        <Circle cx="88" cy="58" r="3" fill={brandColors.peach} />
        <Line
          x1="90"
          y1="81"
          x2="119"
          y2="71"
          stroke={brandColors.peach}
          strokeWidth="0.7"
        />
      </Svg>
    </View>
  );
}
