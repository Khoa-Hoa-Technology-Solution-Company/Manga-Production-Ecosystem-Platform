import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, CheckSquare, DollarSign, Star, ArrowUp } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';
import { withProtectedReaderRoute } from '@/components/protected-route';

const metrics = [
  {
    label: 'Active Series',
    value: '12',
    delta: '+2',
    note: '+2 since last month',
    icon: BookOpen,
  },
  {
    label: 'Pending Tasks',
    value: '27',
    note: '5 due in 24h',
    icon: CheckSquare,
    badge: '8 urgent',
    badgeVariant: 'destructive' as const,
  },
  {
    label: 'Total Wages Paid',
    value: '¥4.82M',
    note: 'This quarter',
    icon: DollarSign,
    sparkline: true,
  },
  {
    label: 'Reader Ratings',
    value: '184.2K',
    note: 'This week',
    icon: Star,
    badge: '+12.4%',
    badgeVariant: 'secondary' as const,
  },
];

function DashboardScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>{t('mobile.dashboard.eyebrow')}</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>{t('mobile.dashboard.title')}</ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            {metrics.map((item, index) => {
              const Icon = item.icon;
              return (
                <View key={index} style={[styles.kpiCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
                  <View style={styles.kpiHeader}>
                    <ThemedText themeColor="textSecondary" style={styles.kpiLabel}>{item.label}</ThemedText>
                    <View style={styles.iconBox}>
                      <Icon size={16} color={theme.textSecondary} />
                    </View>
                  </View>
                  
                  <View style={styles.kpiContent}>
                    <View style={styles.valueRow}>
                      <ThemedText style={styles.kpiValue}>{item.value}</ThemedText>
                      {item.delta && (
                        <View style={styles.deltaBox}>
                          <ArrowUp size={12} color="#357053" />
                          <ThemedText style={styles.deltaText}>{item.delta}</ThemedText>
                        </View>
                      )}
                      {item.badge && (
                        <View style={[
                          styles.badgeBox, 
                          item.badgeVariant === 'destructive' ? styles.badgeDestructive : styles.badgeSecondary
                        ]}>
                          <ThemedText style={[
                            styles.badgeText,
                            item.badgeVariant === 'destructive' ? styles.badgeTextDestructive : styles.badgeTextSecondary
                          ]}>{item.badge}</ThemedText>
                        </View>
                      )}
                    </View>
                    <ThemedText themeColor="textSecondary" style={styles.kpiNote}>{item.note}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Workflow Board Placeholder */}
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
            <ThemedText style={styles.sectionTitle}>{t('mobile.dashboard.workflow')}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.placeholderText}>{t('mobile.dashboard.noWorkflow')}</ThemedText>
          </View>

          {/* Series Ranking Placeholder */}
          <View style={[styles.sectionCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
            <ThemedText style={styles.sectionTitle}>{t('mobile.dashboard.ranking')}</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.placeholderText}>{t('mobile.dashboard.noRanking')}</ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three },
  headerSubtitle: { color: '#59615b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  headerTitle: { color: '#1c2928', fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { 
    width: '48%', 
    borderRadius: 14,
    padding: 16, 
    borderWidth: 1, 
    marginBottom: 10,
  },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kpiLabel: { fontSize: 12, fontWeight: '600' },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#eee2cf', alignItems: 'center', justifyContent: 'center' },
  kpiContent: { gap: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  kpiValue: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  deltaBox: { flexDirection: 'row', alignItems: 'center' },
  deltaText: { color: '#357053', fontSize: 12, fontWeight: 'bold' },
  badgeBox: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeDestructive: { backgroundColor: 'rgba(164,58,50,0.2)' },
  badgeSecondary: { backgroundColor: 'rgba(53,112,83,0.2)' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  badgeTextDestructive: { color: '#a43a32' },
  badgeTextSecondary: { color: '#357053' },
  kpiNote: { fontSize: 11 },

  sectionCard: { borderRadius: 14, padding: 20, borderWidth: 1, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  placeholderText: { fontSize: 14, textAlign: 'center', marginVertical: 20 },
});

export default withProtectedReaderRoute(DashboardScreen);
