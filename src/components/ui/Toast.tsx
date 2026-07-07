import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Pressable,
  Platform,
  Dimensions,
} from 'react-native';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

// ─── Types ──────────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

// ─── Single Toast Item ──────────────────────────────────────────────────────
const ToastItem = React.memo(function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: string) => void;
}) {
  const { colors, isDark, clayShadows } = useTheme();
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;

  const duration = toast.duration || 4000;

  const icons: Record<ToastVariant, React.ReactNode> = {
    success: <CheckCircle2 size={18} color={colors.success} />,
    error: <AlertCircle size={18} color={colors.error} />,
    warning: <AlertTriangle size={18} color={colors.warning} />,
    info: <Info size={18} color={colors.info} />,
  };

  const accentColors: Record<ToastVariant, string> = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, tension: 200, friction: 18, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, { toValue: 0, duration, useNativeDriver: false }).start();

    const timer = setTimeout(() => dismiss(), duration);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -30, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onDismiss(toast.id));
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.elevated,
          transform: [{ translateY }],
          opacity,
        },
        clayStyle(clayShadows.clayElevated),
      ]}
    >
      {/* Accent glow strip */}
      <View style={[styles.toastAccent, { backgroundColor: `${accentColors[toast.variant]}30` }]}>
        <View style={[styles.toastAccentLine, { backgroundColor: accentColors[toast.variant] }]} />
      </View>
      <View style={styles.toastBody}>
        <View style={styles.toastIconWrap}>{icons[toast.variant]}</View>
        <Text style={[styles.toastMessage, { color: colors.textPrimary }]} numberOfLines={3}>
          {toast.message}
        </Text>
        <Pressable
          onPress={dismiss}
          style={({ pressed }: any) => [
            styles.toastClose,
            pressed && { opacity: 0.6 },
          ]}
          hitSlop={8}
        >
          <X size={14} color={colors.textTertiary} />
        </Pressable>
      </View>
      <Animated.View
        style={[
          styles.toastProgress,
          {
            backgroundColor: accentColors[toast.variant],
            width: progressWidth as any,
          },
        ]}
      />
    </Animated.View>
  );
});

// ─── Toast Provider ─────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant, duration }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 50,
    right: 16,
    zIndex: 60,
    maxWidth: 400,
    width: Platform.OS === 'web' ? 380 : Dimensions.get('window').width - 32,
    gap: 10,
  },
  toast: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  toastAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  toastAccentLine: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
  },
  toastBody: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    paddingLeft: 20,
    gap: 12,
  },
  toastIconWrap: {
    flexShrink: 0,
  },
  toastMessage: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  toastClose: {
    padding: 6,
    borderRadius: 8,
    flexShrink: 0,
  },
  toastProgress: {
    height: 2,
    borderRadius: 2,
  },
});
