/**
 * Design tokens for the "포도알 채우기" (Grape Fill) app.
 * Extracted from the "밤의 포도밭" (Night Vineyard) theme in the design doc.
 * The app has a single fixed dark theme — there is no light mode.
 *
 * Icon convention (lucide-react-native, via HeaderBar / bunch/[id].tsx):
 * - 뒤로가기: ChevronLeft
 * - 삭제: Trash2 — 평소엔 Colors.textTertiary(뉴트럴 그레이), 삭제 확인
 *   모달의 "삭제" 버튼 안에서만 Colors.textDanger(빨강)로 강조한다.
 *   새 화면에 삭제 버튼을 추가할 때도 이 두 색만 쓰고 그 외 색으로 바꾸지 말 것.
 */
import type { ViewStyle } from 'react-native';

export const Colors = {
  // Page backgrounds
  bgTop: '#171125',
  bgBottom: '#241a33',
  bgGradient: 'linear-gradient(180deg, #171125, #241a33)',
  // Radial "spotlight" background used on the login and completion screens
  heroGradient:
    'radial-gradient(120% 68% at 50% 19%, #3b2554 0%, #1d1429 55%, #171125 100%)',

  // Text
  textPrimary: '#efe9f7',
  textSecondary: '#b1a5c7',
  textTertiary: '#6f6485',
  textDisabled: '#5c5473',
  textDanger: '#d98a8a',
  /** Lighter lavender used for icon-button glyphs (e.g. the circular back button). */
  iconMuted: '#c3b8d6',

  // Accent
  gold: '#e8c98a',
  purple500: '#7b4fc4',
  purple400: '#a56fd8',
  primaryGradient: 'linear-gradient(90deg, #7b4fc4, #a56fd8)',

  // Surfaces
  surface: 'rgba(255,255,255,0.05)',
  surfaceSubtle: 'rgba(255,255,255,0.045)',
  /** Background for small circular icon buttons (e.g. the back button). */
  surfaceIcon: 'rgba(255,255,255,0.07)',
  surfaceStrong: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.07)',
  borderMuted: 'rgba(255,255,255,0.1)',
  borderStrong: 'rgba(255,255,255,0.12)',
  divider: 'rgba(255,255,255,0.05)',
  dashedBorder: 'rgba(255,255,255,0.16)',

  // Grape grains
  grapeGlowGradient:
    'radial-gradient(circle at 32% 26%, #c6a4e8 0%, #8b5fd0 42%, #4b2a86 100%)',
  grapeGlowShadow: 'rgba(150,100,225,0.45)',
  grapeHeroGradient:
    'radial-gradient(circle at 32% 26%, #d7bcf2 0%, #9a68dd 42%, #522f8f 100%)',
  grapeHeroShadow: 'rgba(160,110,235,0.5)',
  grapeDotGradient: 'radial-gradient(circle at 32% 28%, #c6a4e8, #7b4fc4 60%, #4b2a86)',
  grapeHighlight: 'rgba(255,255,255,0.7)',
  grapeEmptyBg: 'rgba(255,255,255,0.04)',
  grapeEmptyBorder: 'rgba(255,255,255,0.13)',

  leaf: '#7c9464',
  stem: '#8a7350',

  google: '#efe9f7',
  googleText: '#1d1429',
  kakao: '#f7e359',
  kakaoText: '#1d1429',

  white: '#ffffff',
  black: '#000000',
} as const;

export const Fonts = {
  serif: 'GowunBatang_700Bold',
  serifRegular: 'GowunBatang_400Regular',
  sans: 'NotoSansKR_400Regular',
  sansLight: 'NotoSansKR_300Light',
  sansMedium: 'NotoSansKR_500Medium',
  sansBold: 'NotoSansKR_700Bold',
} as const;

export const FontSize = {
  xxs: 10,
  xs: 11,
  sm: 12.5,
  base: 13.5,
  md: 15,
  lg: 16,
  xl: 19,
  xxl: 22,
  display: 25,
  hero: 29,
} as const;

export const Spacing = {
  xxs: 3,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
} as const;

export const Radius = {
  sm: 9,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  huge: 20,
  card: 26,
  pill: 999,
} as const;

/**
 * Native (Fabric) reads gradients from `experimental_backgroundImage`, but
 * react-native-web 0.21 doesn't translate that key to CSS — it only forwards
 * the plain `backgroundImage` property through to the DOM. Setting both keys
 * makes gradient backgrounds render on every platform.
 */
export function gradientBackground(gradient: string): ViewStyle {
  return {
    experimental_backgroundImage: gradient,
    backgroundImage: gradient,
  } as ViewStyle;
}
