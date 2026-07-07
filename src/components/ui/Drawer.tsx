import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  ScrollView,
  Dimensions,
  Modal,
  type ScaledSize,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface DrawerProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  width?: number;
  children: React.ReactNode;
}

export const Drawer = React.memo(function Drawer({
  visible,
  onClose,
  title,
  width = 480,
  children,
}: DrawerProps) {
  const { colors, isDark, zIndex, clayShadows } = useTheme();
  const insets = useSafeAreaInsets();

  const [windowSize, setWindowSize] = useState<ScaledSize>(() => Dimensions.get('window'));
  const onDimensionChange = useCallback(({ window }: { window: ScaledSize }) => {
    setWindowSize(window);
  }, []);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', onDimensionChange);
    return () => sub.remove();
  }, [onDimensionChange]);

  const screenW = windowSize.width;
  const drawerW = Math.min(screenW, screenW < 600 ? screenW : width);

  const slideAnim = useRef(new Animated.Value(drawerW)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);

  useEffect(() => {
    if (visible) {
      mounted.current = true;
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 200,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted.current) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: drawerW,
          tension: 200,
          friction: 22,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, drawerW, slideAnim, backdropOpacity]);

  useEffect(() => {
    if (Platform.OS !== 'web' || !visible) return;
    const handler = (e: { key?: string }) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler as any);
    return () => document.removeEventListener('keydown', handler as any);
  }, [visible, onClose]);

  if (!visible && !mounted.current) return null;

  const padL = 24 + Math.max(insets.left, 0);
  const padR = 24 + Math.max(insets.right, 0);
  const padBottom = 48 + Math.max(insets.bottom, 0);

  const inner = (
    <View style={[styles.root, { zIndex: zIndex.modal }]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: drawerW,
            paddingTop: Math.max(insets.top, 0),
            backgroundColor: colors.surface,
            transform: [{ translateX: slideAnim }],
          },
          Platform.OS === 'web' ? {
            boxShadow: isDark
              ? '-16px 0 40px rgba(0,0,0,0.4), -4px 0 16px rgba(0,0,0,0.3)'
              : '-16px 0 40px rgba(0,0,0,0.06), -4px 0 16px rgba(0,0,0,0.03)',
          } as any : {
            shadowColor: '#000',
            shadowOffset: { width: -8, height: 0 },
            shadowOpacity: isDark ? 0.3 : 0.1,
            shadowRadius: 24,
            elevation: 10,
          },
        ]}
      >
        {title && (
          <View
            style={[
              styles.header,
              {
                paddingLeft: padL,
                paddingRight: padR,
              },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? '0 2px 8px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.03)',
              } as any : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.15 : 0.04,
                shadowRadius: 6,
              },
            ]}
          >
            <View style={styles.headerTitleWrap}>
              <Text
                style={[styles.headerTitle, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {title}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              style={({ pressed, hovered }: any) => [
                styles.closeBtn,
                {
                  backgroundColor: hovered ? colors.hover : colors.clayInnerLight,
                },
                clayStyle(clayShadows.subtle),
                pressed && { transform: [{ scale: 0.93 }] },
                Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.2s ease' } as any : {},
              ]}
              hitSlop={8}
            >
              <X size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentInner,
            {
              paddingLeft: padL,
              paddingRight: padR,
              paddingBottom: padBottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
    >
      {inner}
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    height: '100%',
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    paddingVertical: 18,
  },
  headerTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'web' ? -0.2 : 0,
  },
  closeBtn: {
    flexShrink: 0,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    flexGrow: 1,
  },
});
