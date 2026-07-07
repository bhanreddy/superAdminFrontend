import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Copy, Check } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useTheme } from '../../contexts/ThemeContext';

interface CodeBlockProps {
  content: string;
}

export function CodeBlock({ content }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false);
  const { colors, isDark } = useTheme();

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0D0D14' : colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)' }]}>
        <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>Environment / JSON</Text>
        <Pressable 
          style={[styles.copyButton, { backgroundColor: isDark ? colors.surface : colors.background }]} 
          onPress={handleCopy}
        >
          {copied ? (
            <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.copiedWrapper}>
              <Check size={14} color={colors.success} />
              <Text style={[styles.copyText, { color: colors.success }]}>Copied!</Text>
            </Animated.View>
          ) : (
            <>
              <Copy size={14} color={colors.textSecondary} />
              <Text style={[styles.copyText, { color: colors.textSecondary }]}>Copy All</Text>
            </>
          )}
        </Pressable>
      </View>
      <ScrollView horizontal bounces={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.codeText, { color: isDark ? colors.textPrimary : '#1A1A1A' }]}>{content}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 4,
  },
  copyText: {
    fontSize: 12,
    lineHeight: 16,
    marginLeft: 4,
    fontWeight: '600',
  },
  copiedWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 250,
  },
  scrollContent: {
    padding: 16,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 22,
    letterSpacing: -0.3,
  },
});
