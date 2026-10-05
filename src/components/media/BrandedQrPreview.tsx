import React, { useMemo } from 'react';
import Svg, { G, Rect, Path, Image } from 'react-native-svg';

export type QrArtifact = {
    modules: number;
    cells: [number, number][];
    color: string;
    variant?: string;
    logo: { x: number; y: number; size: number; imageDataUri?: string };
};

// One matrix path avoids mounting thousands of native SVG nodes on every preview.
export const BrandedQrPreview = React.memo(function BrandedQrPreview({ artifact: a, size = 260 }: { artifact: QrArtifact; size?: number }) {
    const path = useMemo(() => a.cells.map(([x, y]) => `M${x+4} ${y+4}h1v1h-1z`).join(''), [a.cells]);
    const n = a.modules + 8, l = a.logo;
    const margin = a.variant === 'minimal' ? 0 : a.variant === 'square' ? 1 : 3;
    const total = n + margin * 2;
    return <Svg accessibilityLabel="Nexsyrus learning QR preview" width={size} height={size} viewBox={`0 0 ${total} ${total}`}>
        <Rect width={total} height={total} fill="#FFFFFF" />
        {a.variant === 'premium-frame' ? <>
            <Rect x={.5} y={.5} width={total-1} height={total-1} rx={2} fill="none" stroke={a.color} strokeWidth={.6} />
            <Path d={`M3 1.5H${total-3}M3 ${total-1.5}H${total-3}`} stroke={a.color} strokeWidth={.4} />
        </> : margin > 0 && <Rect x={.3} y={.3} width={total-.6} height={total-.6} rx={a.variant === 'soft-rounded' ? 3 : 0} fill="none" stroke={a.color} strokeWidth={.4} />}
        <G transform={`translate(${margin},${margin})`}>
            <Rect width={n} height={n} fill="#FFFFFF" />
            <Path d={path} fill={a.color} />
            <Rect x={l.x+4} y={l.y+4} width={l.size} height={l.size} fill="#FFFFFF" />
            <Image x={l.x+4.75} y={l.y+4.75} width={l.size-1.5} height={l.size-1.5} preserveAspectRatio="xMidYMid meet"
                href={a.logo.imageDataUri ? { uri: a.logo.imageDataUri } : require('../../../assets/logo.png')} />
        </G>
    </Svg>;
});
