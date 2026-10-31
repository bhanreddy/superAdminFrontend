import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  WifiOff,
  Lock,
  Clock,
  X,
  RefreshCw,
} from 'lucide-react-native';
import { COMMAND_CENTER } from '../../constants/commandCenterTheme';

export type AlertType = 'error' | 'locked' | 'session_expired' | 'network' | 'warning' | 'success' | 'info';

export interface CommandCenterAlertProps {
  type?: AlertType;
  title?: string;
  message: string;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const CommandCenterAlert: React.FC<CommandCenterAlertProps> = ({
  type = 'error',
  title,
  message,
  onDismiss,
  onRetry,
}) => {
  const getAlertConfig = () => {
    switch (type) {
      case 'locked':
        return {
          icon: <Lock size={18} color={COMMAND_CENTER.statusError} />,
          bgColor: COMMAND_CENTER.statusErrorBg,
          borderColor: COMMAND_CENTER.statusErrorBorder,
          textColor: COMMAND_CENTER.statusError,
          defaultTitle: 'Account Access Suspended',
        };
      case 'session_expired':
        return {
          icon: <Clock size={18} color={COMMAND_CENTER.statusWarning} />,
          bgColor: COMMAND_CENTER.statusWarningBg,
          borderColor: COMMAND_CENTER.statusWarningBorder,
          textColor: COMMAND_CENTER.statusWarning,
          defaultTitle: 'Session Expired',
        };
      case 'network':
        return {
          icon: <WifiOff size={18} color={COMMAND_CENTER.statusWarning} />,
          bgColor: COMMAND_CENTER.statusWarningBg,
          borderColor: COMMAND_CENTER.statusWarningBorder,
          textColor: COMMAND_CENTER.statusWarning,
          defaultTitle: 'Network Unreachable',
        };
      case 'warning':
        return {
          icon: <AlertTriangle size={18} color={COMMAND_CENTER.statusWarning} />,
          bgColor: COMMAND_CENTER.statusWarningBg,
          borderColor: COMMAND_CENTER.statusWarningBorder,
          textColor: COMMAND_CENTER.statusWarning,
          defaultTitle: 'Authentication Warning',
        };
      case 'success':
        return {
          icon: <CheckCircle2 size={18} color={COMMAND_CENTER.statusActive} />,
          bgColor: 'rgba(48, 209, 88, 0.12)',
          borderColor: 'rgba(48, 209, 88, 0.3)',
          textColor: COMMAND_CENTER.statusActive,
          defaultTitle: 'Credentials Verified',
        };
      case 'info':
        return {
          icon: <AlertCircle size={18} color={COMMAND_CENTER.cobaltPrimary} />,
          bgColor: COMMAND_CENTER.statusInfoBg,
          borderColor: COMMAND_CENTER.statusInfoBorder,
          textColor: COMMAND_CENTER.cyanAccent,
          defaultTitle: 'Security Telemetry',
        };
      case 'error':
      default:
        return {
          icon: <AlertCircle size={18} color={COMMAND_CENTER.statusError} />,
          bgColor: COMMAND_CENTER.statusErrorBg,
          borderColor: COMMAND_CENTER.statusErrorBorder,
          textColor: COMMAND_CENTER.statusError,
          defaultTitle: 'Authentication Failed',
        };
    }
  };

  const config = getAlertConfig();
  const displayTitle = title || (type !== 'error' ? config.defaultTitle : undefined);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.iconBox}>{config.icon}</View>

      <View style={styles.contentBox}>
        {displayTitle && (
          <Text style={[styles.title, { color: config.textColor }]}>{displayTitle}</Text>
        )}
        <Text style={styles.message}>{message}</Text>

        {onRetry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry connection"
            onPress={onRetry}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.7 }]}
          >
            <RefreshCw size={12} color={COMMAND_CENTER.cobaltPrimary} />
            <Text style={styles.retryText}>Retry Connection</Text>
          </Pressable>
        )}
      </View>

      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss alert"
          onPress={onDismiss}
          style={({ pressed }) => [styles.dismissButton, pressed && { opacity: 0.7 }]}
        >
          <X size={15} color={COMMAND_CENTER.textTertiary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
  },
  iconBox: {
    paddingTop: 1,
  },
  contentBox: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COMMAND_CENTER.textSecondary,
    fontWeight: '400',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 12,
    fontWeight: '600',
    color: COMMAND_CENTER.cobaltPrimary,
  },
  dismissButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
