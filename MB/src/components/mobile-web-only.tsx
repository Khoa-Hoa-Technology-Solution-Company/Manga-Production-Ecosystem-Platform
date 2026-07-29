import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { MonitorUp } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WEB_APP_URL = process.env.EXPO_PUBLIC_WEB_APP_URL || 'https://manga-production-ecosystem-platform-web.onrender.com';

type MobileWebOnlyProps = {
  title: string;
};

export function MobileWebOnly({ title }: MobileWebOnlyProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const openWeb = async () => {
    try {
      await Linking.openURL(WEB_APP_URL);
    } catch {
      // Keep the screen usable when the device has no browser handler.
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={[styles.safeArea, { paddingBottom: BottomTabInset + insets.bottom }]} edges={['top', 'left', 'right']}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
          <View style={styles.iconWrap}><MonitorUp size={28} color="#b94234" /></View>
          <ThemedText type="title" style={[styles.title, { color: theme.text }]}>{title}</ThemedText>
          <ThemedText style={[styles.description, { color: theme.textSecondary }]}>{t('mobile.webOnly.description')}</ThemedText>
          <Pressable style={styles.button} onPress={() => void openWeb()} accessibilityRole="link">
            <ThemedText style={styles.buttonText}>{t('mobile.webOnly.openWeb')}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.three },
  card: { borderWidth: 1, borderRadius: 18, padding: Spacing.four, alignItems: 'flex-start', gap: Spacing.two },
  iconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#f3ddd2', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800' },
  description: { fontSize: 15, lineHeight: 23 },
  button: { marginTop: Spacing.two, minHeight: 44, alignSelf: 'stretch', borderRadius: 10, backgroundColor: '#b94234', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fffaf0', fontSize: 15, fontWeight: '800' },
});
