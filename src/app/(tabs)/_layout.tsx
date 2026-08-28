import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontSize, Fonts, Spacing } from '@/constants/theme';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarIcon: () => null,
        tabBarIconStyle: styles.hiddenIcon,
        tabBarActiveTintColor: Colors.gold,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        // React Navigation's default tab bar chrome (unset in this app) paints
        // its own border-top from the light-mode navigation theme, and on web
        // that atomic CSS class can win over ours regardless of style-array
        // order. Rendering the divider ourselves in `tabBarBackground` — a
        // layer this app fully owns — sidesteps that fight; the outer bar's
        // own border is zeroed out below so nothing else can paint over it.
        tabBarBackground: () => <View style={styles.barBackground} />,
        tabBarStyle: [styles.bar, { height: 56 + insets.bottom, paddingBottom: insets.bottom }],
      }}>
      <Tabs.Screen name="index" options={{ title: '송이' }} />
      {/* 기록 탭은 탭바에서 숨김(href: null) — 라우트/통계 로직은 그대로 유지되고
          직접 URL/딥링크(`/records`)로는 정상 진입한다. 재노출하려면 이 항목을
          `options={{ title: '기록' }}`로 되돌리면 된다. */}
      <Tabs.Screen name="records" options={{ href: null }} />
      <Tabs.Screen name="archive" options={{ title: '보관함' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    paddingTop: Spacing.md,
  },
  barBackground: {
    flex: 1,
    backgroundColor: Colors.bgBottom,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  item: {
    paddingTop: 0,
  },
  hiddenIcon: {
    width: 0,
    height: 0,
    margin: 0,
  },
  label: {
    fontFamily: Fonts.sansLight,
    fontSize: FontSize.md,
  },
});
