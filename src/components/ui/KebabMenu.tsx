import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { MoreVertical } from 'lucide-react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';

interface MenuItem {
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
}

interface KebabMenuProps {
  items: MenuItem[];
}

export const KebabMenu = React.memo(function KebabMenu({ items }: KebabMenuProps) {
  const { colors, isDark, clayShadows } = useTheme();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<View>(null);
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (open) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, tension: 320, friction: 18, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 140, useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(0.92);
      opacityAnim.setValue(0);
    }
  }, [open]);

  const handleOpen = () => {
    if (!triggerRef.current) return;

    triggerRef.current.measureInWindow((x, y, width, height) => {
      const winW =
        Platform.OS === 'web' && typeof window !== 'undefined' && Number.isFinite(window.innerWidth)
          ? window.innerWidth
          : Dimensions.get('window').width;
      const triggerW = Number.isFinite(width) ? width : 0;
      const left = Number.isFinite(x) ? x : 0;
      const topY = Number.isFinite(y) ? y : 0;
      const h = Number.isFinite(height) ? height : 0;
      const right = winW - left - triggerW;
      const top = topY + h + 8;
      setMenuPos({
        top: Number.isFinite(top) ? top : 64,
        right: Number.isFinite(right) ? Math.max(8, right) : 8,
      });
      setOpen(true);
    });
  };

  const handleClose = () => setOpen(false);

  const handleItemPress = (item: MenuItem) => {
    handleClose();
    item.onPress();
  };

  return (
    <View style={sty.root}>
      <Pressable
        ref={triggerRef as any}
        onPress={handleOpen}
        style={({ pressed, hovered }: any) => [
          sty.trigger,
          {
            backgroundColor: hovered ? colors.hover : colors.clayInnerLight,
          },
          clayStyle(clayShadows.subtle),
          pressed && { transform: [{ scale: 0.93 }] },
          Platform.OS === 'web' ? { transition: 'all 0.2s ease', cursor: 'pointer' } as any : {},
        ]}
        hitSlop={8}
      >
        <MoreVertical size={16} color={colors.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={sty.overlay} />
        </TouchableWithoutFeedback>

        {menuPos && (
          <Animated.View
            style={[
              sty.menu,
              {
                top: menuPos.top,
                right: menuPos.right,
                backgroundColor: isDark ? colors.elevated : '#FFFFFF',
                borderColor: colors.clayBorderColor,
                borderWidth: 1,
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
              clayStyle(clayShadows.clayElevated),
            ] as any}
          >
            {items.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => handleItemPress(item)}
                style={({ pressed, hovered }: any) => [
                  sty.menuItem,
                  {
                    backgroundColor: pressed
                      ? colors.hover
                      : hovered
                        ? isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'
                        : 'transparent',
                  },
                  i === 0 && { borderTopLeftRadius: 17, borderTopRightRadius: 17 },
                  i === items.length - 1 && { borderBottomLeftRadius: 17, borderBottomRightRadius: 17 },
                  Platform.OS === 'web' ? { transition: 'background-color 0.15s ease', cursor: 'pointer' } as any : {},
                ]}
              >
                {item.icon && <View style={sty.menuIcon}>{item.icon}</View>}
                <Text
                  style={[
                    sty.menuLabel,
                    { color: item.danger ? colors.error : colors.textPrimary },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        )}
      </Modal>
    </View>
  );
});

const sty = StyleSheet.create({
  root: {
    position: 'relative',
  },
  trigger: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  } as any,
  menu: {
    position: 'absolute',
    minWidth: 190,
    borderRadius: 18,
    paddingVertical: 6,
    ...(Platform.OS === 'web'
      ? { transformOrigin: 'top right' }
      : {}),
  } as any,
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 11,
    marginHorizontal: 6,
  },
  menuIcon: {
    flexShrink: 0,
    width: 20,
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
