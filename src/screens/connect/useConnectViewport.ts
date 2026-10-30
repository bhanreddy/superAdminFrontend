import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

type Viewport = { height: number; offsetTop: number };

// Mobile web keyboards can shrink the visual viewport without changing 100vh.
// Coalesce keyboard/viewport events and leave pinch zoom to the browser.
export function useConnectViewport(enabled: boolean) {
  const measured = useRef<Viewport | null>(null);
  const [size, setSize] = useState<Viewport | null>(null);
  useEffect(() => {
    if (
      !enabled ||
      Platform.OS !== 'web' ||
      typeof window === 'undefined' ||
      !window.visualViewport
    )
      return;
    const viewport = window.visualViewport;
    let frame: number | undefined;
    const measure = () => {
      frame = undefined;
      if (viewport.scale !== 1) return;
      const next = {
        height: Math.round(viewport.height),
        offsetTop: Math.round(viewport.offsetTop),
      };
      if (
        next.height <= 0 ||
        (measured.current?.height === next.height &&
          measured.current.offsetTop === next.offsetTop)
      )
        return;
      measured.current = next;
      setSize(next);
    };
    const schedule = () => {
      if (frame === undefined) frame = window.requestAnimationFrame(measure);
    };
    measure();
    viewport.addEventListener('resize', schedule);
    viewport.addEventListener('scroll', schedule);
    return () => {
      viewport.removeEventListener('resize', schedule);
      viewport.removeEventListener('scroll', schedule);
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);
  return enabled ? size : null;
}
