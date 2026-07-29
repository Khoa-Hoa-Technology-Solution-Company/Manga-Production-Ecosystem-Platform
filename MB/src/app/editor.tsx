import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, FileSearch, ChevronRight, Activity, Star, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { dashboardAPI, editorAPI, seriesAPI } from '@/lib/api';
import { withProtectedEditorRoute } from '@/components/protected-route';
import { useTranslation } from 'react-i18next';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function EditorScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [pendingSeries, setPendingSeries] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [workflowRes, portfolioRes] = await Promise.all([
        dashboardAPI.getWorkflow().catch(() => ({ workflow: { Reviewing: { items: [], count: 0 } } })),
        editorAPI.getPortfolio().catch(() => ({ portfolio: [], invites: [] }))
      ]);

      const reviewingData = workflowRes.workflow?.Reviewing;
      const reviewingItems = Array.isArray(reviewingData) ? reviewingData : (Array.isArray(reviewingData?.items) ? reviewingData.items : []);
      const pendingCount = Array.isArray(reviewingData) ? reviewingData.length : (reviewingData?.count || reviewingItems.length || 0);

      setPendingReviews(reviewingItems);
      setInvites(Array.isArray(portfolioRes?.invites) ? portfolioRes.invites : []);
      setPendingSeries((Array.isArray(portfolioRes?.portfolio) ? portfolioRes.portfolio : []).filter((item: any) => item.series?.status === 'Pending_Editor'));
      setAnalytics({
        activeSeries: Array.isArray(portfolioRes?.portfolio) ? portfolioRes.portfolio.length : 0,
        pendingCount: pendingCount,
        // These values are not returned by the current API; do not present fabricated analytics.
        approvedCount: 0,
        rating: 0
      });
    } catch (err: any) {
      setError(err.message || t('mobile.editor.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const handleReview = (chapterId: string) => {
    router.push(`/editor/review/${chapterId}` as any);
  };

  const handleInvitation = async (seriesId: string, action: 'accept' | 'decline') => {
    try {
      await seriesAPI.respondToHandshake(seriesId, action);
      Alert.alert(t('common.success'), action === 'accept' ? t('mobile.editor.accepted') : t('mobile.editor.rejected'));
      await loadDashboard();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('mobile.editor.updateError'));
    }
  };

  const handleForwardToEb = async (seriesId: string) => {
    try {
      await seriesAPI.editorDecision(seriesId, 'approve');
      Alert.alert(t('common.success'), t('mobile.editor.transferred'));
      await loadDashboard();
    } catch (err: any) {
      Alert.alert(t('mobile.editor.cannotTransfer'), err.message || t('mobile.editor.transferHint'));
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{t('mobile.editor.eyebrow')}</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>{t('mobile.editor.title')}</ThemedText>
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
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
              <Activity size={20} color="#7a5a43" />
              <ThemedText style={styles.statValue}>{analytics?.activeSeries || 0}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>{t('mobile.editor.works')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
              <Clock size={20} color="#a97822" />
              <ThemedText style={styles.statValue}>{analytics?.pendingCount || 0}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>{t('mobile.editor.pending')}</ThemedText>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
              <Star size={20} color="#a97822" />
              <ThemedText style={styles.statValue}>{analytics?.rating || 0}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.statLabel}>{t('mobile.editor.rating')}</ThemedText>
            </View>
          </View>

          {invites.length > 0 && (
            <View style={styles.invitesSection}>
              <ThemedText themeColor="textSecondary" style={styles.sectionTitle}>{t('mobile.editor.invitations')}</ThemedText>
              {invites.map(series => (
                <View key={series._id} style={[styles.reviewCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
                  <View style={styles.cardInfo}>
                    <ThemedText style={styles.chapterTitle}>{series.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.timeText}>
                      Mangaka: {series.mangakaId?.displayName || t('mobile.editor.unknownAuthor')}
                    </ThemedText>
                  </View>
                  <View style={styles.inviteActions}>
                    <Pressable style={[styles.inviteAction, styles.declineAction]} onPress={() => handleInvitation(series._id, 'decline')}>
                      <ThemedText style={styles.inviteActionText}>{t('mobile.editor.reject')}</ThemedText>
                    </Pressable>
                    <Pressable style={[styles.inviteAction, styles.acceptAction]} onPress={() => handleInvitation(series._id, 'accept')}>
                      <ThemedText style={styles.inviteActionText}>{t('mobile.editor.accept')}</ThemedText>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}

          {pendingSeries.length > 0 && (
            <View style={styles.invitesSection}>
              <ThemedText themeColor="textSecondary" style={styles.sectionTitle}>{t('mobile.editor.pendingTransfer')}</ThemedText>
              {pendingSeries.map(item => (
                <View key={item.series._id} style={[styles.reviewCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
                  <View style={styles.cardInfo}>
                    <ThemedText style={styles.chapterTitle}>{item.series.title}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.timeText}>{t('mobile.editor.transferHint')}</ThemedText>
                  </View>
                  <Pressable style={[styles.inviteAction, styles.acceptAction]} onPress={() => handleForwardToEb(item.series._id)}>
                    <ThemedText style={styles.inviteActionText}>{t('mobile.editor.transfer')}</ThemedText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          <ThemedText themeColor="textSecondary" style={styles.sectionTitle}>{t('mobile.editor.drafts')}</ThemedText>

          {loading ? (
            <ActivityIndicator size="large" color="#7a5a43" style={{ marginTop: 50 }} />
          ) : pendingReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>{t('mobile.editor.emptyDrafts')}</ThemedText>
            </View>
          ) : (
            pendingReviews.map(chapter => (
              <Pressable key={chapter._id} style={[styles.reviewCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]} onPress={() => handleReview(chapter._id)}>
                <View style={styles.iconBox}>
                  <FileSearch size={20} color="#7a5a43" />
                </View>
                <View style={styles.cardInfo}>
                  <ThemedText themeColor="textSecondary" style={styles.seriesTitle} numberOfLines={1}>
                    {chapter.seriesId?.title || t('mobile.editor.unknownSeries')}
                  </ThemedText>
                  <ThemedText style={styles.chapterTitle} numberOfLines={1}>
                    {chapter.title || `Chapter ${chapter.chapterNumber}`}
                  </ThemedText>
                  <ThemedText themeColor="textSecondary" style={styles.timeText}>
                    Cập nhật: {new Date(chapter.updatedAt || Date.now()).toLocaleDateString('vi-VN')}
                  </ThemedText>
                </View>
                <ChevronRight size={20} color={theme.textSecondary} />
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
  headerSubtitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, lineHeight: 32, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(185,66,52,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#c85745', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 4 },

  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 },
  
  emptyState: { alignItems: 'center', marginTop: 40, gap: 10 },
  emptyText: { fontSize: 14 },
  
  reviewCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(122,90,67,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  seriesTitle: { fontSize: 12, fontWeight: '600', marginBottom: 2 },
  chapterTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  timeText: { fontSize: 11 },
  invitesSection: { gap: 10, marginBottom: 8 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  inviteAction: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  declineAction: { backgroundColor: '#59615b' },
  acceptAction: { backgroundColor: '#6b4d3a' },
  inviteActionText: { color: '#fffaf0', fontSize: 12, fontWeight: '700' }
});

export default withProtectedEditorRoute(EditorScreen);

