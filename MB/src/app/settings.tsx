import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Settings, User, Bell, Shield, HelpCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const settingsGroups = [
  {
    title: 'Tài khoản',
    items: [
      { icon: User, label: 'Thông tin cá nhân' },
      { icon: Shield, label: 'Bảo mật & Mật khẩu' },
    ]
  },
  {
    title: 'Cài đặt chung',
    items: [
      { icon: Bell, label: 'Thông báo' },
      { icon: Settings, label: 'Giao diện' },
      { icon: HelpCircle, label: 'Trợ giúp & Hỗ trợ' },
    ]
  }
];

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>TÙY CHỈNH</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>Cài đặt (WIP)</ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]}
          showsVerticalScrollIndicator={false}
        >
          {settingsGroups.map((group, gIdx) => (
            <View key={gIdx} style={styles.groupContainer}>
              <ThemedText style={styles.groupTitle}>{group.title}</ThemedText>
              <View style={styles.groupCard}>
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <View key={iIdx} style={[styles.settingItem, iIdx < group.items.length - 1 && styles.borderBottom]}>
                      <View style={styles.iconBox}>
                        <Icon size={18} color="#94a3b8" />
                      </View>
                      <ThemedText style={styles.settingLabel}>{item.label}</ThemedText>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three },
  headerSubtitle: { color: '#8b5cf6', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  
  groupContainer: { marginBottom: 10 },
  groupTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 10, marginLeft: 8, textTransform: 'uppercase' },
  groupCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  settingLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
});
