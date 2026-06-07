import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, FileSearch, ChevronRight, Activity, Users, Star, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dashboardAPI, editorAPI } from '@/lib/api';
import { withProtectedEditorRoute } from '@/components/protected-route';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function EditorScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflowRes, portfolioRes] = await Promise.all([
        dashboardAPI.getWorkflow().catch(() => ({ workflow: { Reviewing: [] } })),
        editorAPI.getPortfolio().catch(() => ({ portfolio: [] }))
      ]);
      setPendingReviews(workflowRes.workflow?.Reviewing || []);
      setAnalytics({
        activeSeries: portfolioRes.portfolio?.length || 0,
        pendingCount: workflowRes.workflow?.Reviewing?.length || 0,
        approvedCount: 15, // Mock historical stat
        rating: 4.8
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (chapterId: string) => {
    router.push(`/editor/review/${chapterId}` as any);
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>TRUNG TÂM BIÊN TẬP</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>Dashboard</ThemedText>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
             <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Analytics Cards */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Activity size={20} color="#a855f7" />
              <ThemedText style={styles.statValue}>{analytics?.activeSeries || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Tác phẩm</ThemedText>
            </View>
            <View style={styles.statCard}>
              <Clock size={20} color="#f59e0b" />
              <ThemedText style={styles.statValue}>{analytics?.pendingCount || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Chờ duyệt</ThemedText>
            </View>
            <View style={styles.statCard}>
              <Star size={20} color="#eab308" />
              <ThemedText style={styles.statValue}>{analytics?.rating || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Đánh giá</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.sectionTitle}>BẢN THẢO CẦN DUYỆT</ThemedText>

          {loading ? (
            <ActivityIndicator size="large" color="#a855f7" style={{ marginTop: 50 }} />
          ) : pendingReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#64748b" />
              <ThemedText style={styles.emptyText}>Tuyệt vời! Không có bản thảo nào đang tồn đọng.</ThemedText>
            </View>
          ) : (
            pendingReviews.map(chapter => (
              <Pressable key={chapter._id} style={styles.reviewCard} onPress={() => handleReview(chapter._id)}>
                <View style={styles.iconBox}>
                  <FileSearch size={20} color="#a855f7" />
                </View>
                <View style={styles.cardInfo}>
                  <ThemedText style={styles.seriesTitle} numberOfLines={1}>
                    {chapter.seriesId?.title || 'Unknown Series'}
                  </ThemedText>
                  <ThemedText style={styles.chapterTitle} numberOfLines={1}>
                    {chapter.title || `Chapter ${chapter.chapterNumber}`}
                  </ThemedText>
                  <ThemedText style={styles.timeText}>
                    Cập nhật: {new Date(chapter.updatedAt || Date.now()).toLocaleDateString('vi-VN')}
                  </ThemedText>
                </View>
                <ChevronRight size={20} color="#64748b" />
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three },
  headerSubtitle: { color: '#a855f7', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#fb7185', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { color: '#94a3b8', fontSize: 12, marginTop: 4 },

  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  
  emptyState: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  
  reviewCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  seriesTitle: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  chapterTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  timeText: { color: '#94a3b8', fontSize: 11 }
});

export default withProtectedEditorRoute(EditorScreen);

