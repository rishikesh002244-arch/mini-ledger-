import { Platform, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  paper: '#F4F2E9',
  paperDark: '#EDE9DC',
  surface: '#FFFFFF',
  surfaceMuted: '#FAF9F4',

  ink: '#12261E',
  inkSoft: '#4C6459',
  muted: '#7E8F87',
  faint: '#A8B4AD',

  forest: '#0B3B2C',
  forestDeep: '#06271D',
  forestLight: '#165741',
  accent: '#D9F27C',
  accentDeep: '#BDE04A',
  accentMuted: '#EFF8C9',

  coral: '#D84C3B',
  coralDeep: '#B53727',
  coralSoft: '#FBEAE5',

  gold: '#D8A63C',
  goldSoft: '#FCF3DD',

  border: '#E5E1D3',
  line: '#EFECE2',
  white: '#FFFFFF',
  overlay: 'rgba(6, 39, 29, 0.58)',

  gradientTop: '#E8EFCE',
  gradientMid: '#F4F2E9',
} as const;

export const fonts = {
  body: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extraBold: 'Manrope_800ExtraBold',
  display: 'SpaceGrotesk_700Bold',
  displayMedium: 'SpaceGrotesk_500Medium',
  displaySemibold: 'SpaceGrotesk_600SemiBold',
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const shadow = {
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#1C3329',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.07,
      shadowRadius: 20,
    },
    android: { elevation: 3 },
    default: {},
  }),
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B3B2C',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.28,
      shadowRadius: 18,
    },
    android: { elevation: 8 },
    default: {},
  }),
} as const;

export const text = {
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  } as TextStyle,
  display: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: colors.ink,
  } as TextStyle,
  h1: {
    fontFamily: fonts.displaySemibold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: colors.ink,
  } as TextStyle,
  h2: {
    fontFamily: fonts.displaySemibold,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.4,
    color: colors.ink,
  } as TextStyle,
  title: {
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  } as TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  } as TextStyle,
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
  } as TextStyle,
  caption: {
    fontFamily: fonts.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.muted,
  } as TextStyle,
};
