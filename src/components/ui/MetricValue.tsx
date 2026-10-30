import React, { useState } from 'react';
import { Text, TextProps } from 'react-native';

/** Keep currency and grouped digits together when a KPI card becomes narrow. */
export function MetricValue({
  value,
  style,
}: {
  value: string;
  style?: TextProps['style'];
}) {
  const [width, setWidth] = useState(0);
  const fontSize = width
    ? Math.max(16, Math.min(30, width / (Math.max(value.length, 1) * 0.63)))
    : 30;
  return (
    <Text
      accessibilityLabel={value}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.6}
      style={[
        { alignSelf: 'stretch', fontWeight: '700', letterSpacing: -0.5 },
        style,
        { fontSize },
      ]}
    >
      {value}
    </Text>
  );
}
