import { Platform, StyleSheet } from 'react-native';

export const INPUT_PLACEHOLDER_COLOR = '#938FA8';

export const styles = StyleSheet.create({
  input: {
    borderWidth: 0,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    color: '#1A1825',
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: 'none',
      } as const,
      default: {},
    }),
  },
  searchBarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  inputInChrome: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: Platform.select({ web: 10, default: 8 }),
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineStyle: 'none',
        maxWidth: 4000,
        width: '100%',
        boxSizing: 'border-box',
      } as const,
      default: {},
    }),
  },
});
