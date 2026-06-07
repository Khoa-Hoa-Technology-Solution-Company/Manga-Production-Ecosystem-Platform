import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, CheckSquare, DollarSign, Heart, ArrowUp } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
    label: 'Reader Votes',
    value: '184.2K',
    note: 'This week',
    icon: Heart,
    badge: '+12.4%',
    badgeVariant: 'secondary' as const,
  },
];

function DashboardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>TỔNG QUAN</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>Dashboard</ThemedText>
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
                <View key={index} style={styles.kpiCard}>
                  <View style={styles.kpiHeader}>
                    <ThemedText style={styles.kpiLabel}>{item.label}</ThemedText>
                    <View style={styles.iconBox}>
                      <Icon size={16} color="#94a3b8" />
                    </View>
                  </View>
                  
                  <View style={styles.kpiContent}>
                    <View style={styles.valueRow}>
                      <ThemedText style={styles.kpiValue}>{item.value}</ThemedText>
                      {item.delta && (
                        <View style={styles.deltaBox}>
                          <ArrowUp size={12} color="#10b981" />
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
                    <ThemedText style={styles.kpiNote}>{item.note}</ThemedText>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Workflow Board Placeholder */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>Workflow Board</ThemedText>
            <ThemedText style={styles.placeholderText}>No workflows available.</ThemedText>
          </View>

          {/* Series Ranking Placeholder */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>Series Ranking</ThemedText>
            <ThemedText style={styles.placeholderText}>No rankings available.</ThemedText>
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
  headerSubtitle: { color: '#38bdf8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { 
    width: '48%', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 16, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 10,
  },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  kpiLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  kpiContent: { gap: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  deltaBox: { flexDirection: 'row', alignItems: 'center' },
  deltaText: { color: '#10b981', fontSize: 12, fontWeight: 'bold' },
  badgeBox: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeDestructive: { backgroundColor: 'rgba(239,68,68,0.2)' },
  badgeSecondary: { backgroundColor: 'rgba(16,185,129,0.2)' },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  badgeTextDestructive: { color: '#ef4444' },
  badgeTextSecondary: { color: '#10b981' },
  kpiNote: { color: '#64748b', fontSize: 11 },

  sectionCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginTop: 10 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  placeholderText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginVertical: 20 },
});

export default withProtectedReaderRoute(DashboardScreen);
