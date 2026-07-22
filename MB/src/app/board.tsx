import React, { useEffect, useState, useCallback } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, ActivityIndicator,
  Modal, TextInput, Alert, useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield, BookOpen, ThumbsUp, ThumbsDown, Send, X, Gavel,
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ebAPI } from '@/lib/api';
import { withProtectedEditorialBoardRoute } from '@/components/protected-route';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

const DEFAULT_RUBRIC_CRITERIA = [
  { key: 'artStyle', labelKey: 'editorialBoard.artStyle' },
  { key: 'storytelling', labelKey: 'editorialBoard.storytelling' },
  { key: 'characterDesign', labelKey: 'editorialBoard.characterDesign' },
  { key: 'pacing', labelKey: 'editorialBoard.pacing' },
  { key: 'commercialPotential', labelKey: 'editorialBoard.commercialPotential' },
];

function EditorialBoardScreen() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const [pendingSeries, setPendingSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voting Modal
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [voteComment, setVoteComment] = useState('');
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadPending = useCallback(() => {
    setLoading(true);
    setError(null);
    ebAPI.getPending()
      .then(res => setPendingSeries(res.series || []))
      .catch(err => setError(err.message || t('mobile.board.loadError')))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { loadPending(); }, [loadPending]);

  const openVoteModal = (series: any) => {
    setSelectedSeries(series);
    setVoteComment('');
    const initial: Record<string, number> = {};
    const criteria = series?.rubricTemplate?.criteria || DEFAULT_RUBRIC_CRITERIA;
    criteria.forEach((c: any) => { initial[c.key] = (series.userVoteRubric as any)?.[c.key] || 5; });
    setRubricScores(initial);
    setShowVoteModal(true);
  };

  const averageScore = (() => {
    const values = Object.values(rubricScores);
    if (values.length === 0) return 5;
    return values.reduce((a, b) => a + b, 0) / values.length;
  })();

  const autoDecision: 'approved' | 'rejected' = averageScore >= 5 ? 'approved' : 'rejected';

  const handleVote = () => {
    if (!selectedSeries) return;
    setSubmitting(true);
    ebAPI.castVote(selectedSeries._id, {
      decision: autoDecision,
      comments: voteComment,
      rubric: rubricScores,
    })
    .then(() => {
      Alert.alert(t('common.success'), t('mobile.board.savedVote'));
      setShowVoteModal(false);
      loadPending();
    })
    .catch(err => Alert.alert(t('common.error'), err.message))
    .finally(() => setSubmitting(false));
  };

  const submitFinalDecision = (seriesId: string, mode: 'immediate' | 'scheduled', schedule?: 'weekly' | 'monthly') => {
    const startAt = new Date();
    if (mode === 'scheduled') {
      if (schedule === 'weekly') startAt.setDate(startAt.getDate() + 7);
      else startAt.setMonth(startAt.getMonth() + 1);
    }
    ebAPI.makeFinalDecision(seriesId, {
      decision: 'approved',
      publicationMode: mode,
      publicationSchedule: schedule,
      publicationStartAt: mode === 'scheduled' ? startAt.toISOString() : undefined,
    })
      .then(() => {
        Alert.alert(
          mode === 'scheduled' ? 'Đã lên lịch' : 'Đã xuất bản',
          mode === 'scheduled'
            ? `Bắt đầu ${schedule === 'weekly' ? 'hàng tuần' : 'hàng tháng'} vào ${startAt.toLocaleString()}.`
            : 'Series đã Active và chapter được duyệt đầu tiên đã được xuất bản.'
        );
        loadPending();
      })
      .catch(err => Alert.alert('Lỗi', err.message));
  };

  const handleFinalDecision = (seriesId: string) => {
    Alert.alert(
      t('mobile.board.finalTitle'),
      t('mobile.board.finalMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('mobile.board.rejected'), style: 'destructive', onPress: () => {
          ebAPI.makeFinalDecision(seriesId, { decision: 'rejected', comments: 'Changes requested by Editorial Board majority.' })
            .then(() => loadPending())
            .catch(err => Alert.alert(t('common.error'), err.message));
        }},
        { text: 'Xuất bản ngay', onPress: () => submitFinalDecision(seriesId, 'immediate') },
        { text: 'Theo lịch', onPress: () => Alert.alert(
          'Chu kỳ xuất bản',
          'Chọn chu kỳ bắt đầu sau lần duyệt này.',
          [
            { text: 'Hàng tuần', onPress: () => submitFinalDecision(seriesId, 'scheduled', 'weekly') },
            { text: 'Hàng tháng', onPress: () => submitFinalDecision(seriesId, 'scheduled', 'monthly') },
            { text: 'Hủy', style: 'cancel' },
          ]
        ) },
        { text: t('mobile.board.publish'), onPress: () => {
          ebAPI.makeFinalDecision(seriesId, { decision: 'approved', publicationSchedule: 'weekly' })
            .then(() => {
              Alert.alert(t('mobile.board.publishedTitle'), t('mobile.board.published'));
              loadPending();
            })
            .catch(err => Alert.alert(t('common.error'), err.message));
        }},
      ]
    );
  };

  const getVoteCounts = (series: any) => {
    const votes = series.ebVotes || [];
    const approve = votes.filter((v: any) => v.decision === 'approve' || v.decision === 'approved').length;
    const reject = votes.filter((v: any) => v.decision === 'reject' || v.decision === 'rejected').length;
    return { approve, reject, total: approve + reject };
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={isDark ? ['#0e051d', '#130e2c', '#07020e'] : ['#faf5ff', '#f0f0ff', '#f8fafc']} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.headerSubtitle, { color: '#f59e0b' }]}>{t('mobile.board.eyebrow')}</ThemedText>
            <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>{t('mobile.board.title')}</ThemedText>
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
             <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.five }]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
          ) : pendingSeries.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color={isDark ? '#64748b' : '#94a3b8'} />
              <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>{t('mobile.board.empty')}</ThemedText>
            </View>
          ) : (
            pendingSeries.map(series => {
              const { approve, reject, total } = getVoteCounts(series);
              const approvePercent = total > 0 ? (approve / total) * 100 : 0;
              const rejectPercent = total > 0 ? (reject / total) * 100 : 0;

              return (
                <View key={series._id} style={[styles.seriesCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                  <View style={styles.cardHeader}>
                    <BookOpen size={20} color="#f59e0b" />
                    <ThemedText style={[styles.seriesTitle, { color: theme.text }]} numberOfLines={1}>{series.title}</ThemedText>
                    <View style={styles.badge}>
                      <ThemedText style={styles.badgeText}>{t('mobile.board.voteLabel')}</ThemedText>
                    </View>
                  </View>

                  <ThemedText style={[styles.descText, { color: theme.textSecondary }]} numberOfLines={2}>{series.description || t('mobile.board.noDescription')}</ThemedText>

                  {/* Vote Progress Bar */}
                  <View style={styles.voteProgressWrap}>
                    <View style={styles.voteLabels}>
                      <View style={styles.voteLabelRow}>
                        <ThumbsUp size={12} color="#22c55e" />
                        <ThemedText style={[styles.voteLabelText, { color: '#22c55e' }]}>{t('mobile.board.approveCount', { count: approve })}</ThemedText>
                      </View>
                      <View style={styles.voteLabelRow}>
                        <ThemedText style={[styles.voteLabelText, { color: '#ef4444' }]}>{t('mobile.board.rejectCount', { count: reject })}</ThemedText>
                        <ThumbsDown size={12} color="#ef4444" />
                      </View>
                    </View>
                    <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }]}>
                      {approvePercent > 0 && <View style={[styles.progressFill, { width: `${approvePercent}%`, backgroundColor: '#22c55e' }]} />}
                      {rejectPercent > 0 && <View style={[styles.progressFill, { width: `${rejectPercent}%`, backgroundColor: '#ef4444' }]} />}
                    </View>
                  </View>

                  <View style={styles.actionRow}>
                    <Pressable style={[styles.voteBtn, { backgroundColor: '#6366f1' }]} onPress={() => openVoteModal(series)}>
                      <Gavel size={16} color="#fff" />
                      <ThemedText style={styles.actionBtnText}>{t('mobile.board.vote')}</ThemedText>
                    </Pressable>
                    {user?.isEbHead && (
                      <Pressable style={[styles.finalBtn, { backgroundColor: '#10b981' }]} onPress={() => handleFinalDecision(series._id)}>
                        <Send size={16} color="#fff" />
                        <ThemedText style={styles.actionBtnText}>{t('mobile.board.finalDecision')}</ThemedText>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Vote Modal with Rubric Scoring */}
      <Modal visible={showVoteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1e1b4b' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: theme.text }]}>{t('mobile.board.voteModal')}</ThemedText>
              <Pressable onPress={() => setShowVoteModal(false)} hitSlop={12}>
                <X size={22} color={theme.textSecondary} />
              </Pressable>
            </View>
            <ThemedText style={[styles.modalDesc, { color: theme.textSecondary }]}>{t('mobile.board.reviewSeries', { title: selectedSeries?.title })}</ThemedText>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Rubric Sliders */}
              <View style={[styles.rubricSection, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
                <View style={styles.rubricHeader}>
                  <ThemedText style={[styles.rubricTitle, { color: theme.text }]}>{t('mobile.board.rubric')}</ThemedText>
                  <View style={[styles.maxBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
                    <ThemedText style={[styles.maxBadgeText, { color: theme.textSecondary }]}>{t('mobile.board.max')}</ThemedText>
                  </View>
                </View>

                {(() => {
                  const activeCriteria = selectedSeries?.rubricTemplate?.criteria || DEFAULT_RUBRIC_CRITERIA;
                  return activeCriteria.map((c: any) => {
                    const score = rubricScores[c.key] ?? 5;
                    return (
                      <View key={c.key} style={styles.sliderRow}>
                        <View style={styles.sliderLabelRow}>
                          <ThemedText style={[styles.sliderLabel, { color: theme.text }]}>{c.label || (c.labelKey ? t(c.labelKey) : c.key)}</ThemedText>
                          <ThemedText style={styles.sliderScore}>{score}/10</ThemedText>
                        </View>
                        <Slider
                          style={styles.slider}
                          minimumValue={1}
                          maximumValue={10}
                          step={1}
                          value={score}
                          onValueChange={(val: number) => setRubricScores(prev => ({ ...prev, [c.key]: val }))}
                          minimumTrackTintColor="#6366f1"
                          maximumTrackTintColor={isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0'}
                          thumbTintColor="#6366f1"
                        />
                      </View>
                    );
                  });
                })()}
              </View>

              {/* Comment */}
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', color: theme.text }]}
                placeholder={t('mobile.board.commentPlaceholder')}
                placeholderTextColor={theme.textSecondary}
                value={voteComment}
                onChangeText={setVoteComment}
                multiline
              />

              {/* Average & Auto Decision */}
              <View style={[styles.decisionCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
                <View>
                  <ThemedText style={[styles.avgLabel, { color: theme.textSecondary }]}>{t('mobile.board.average')}</ThemedText>
                  <ThemedText style={styles.avgScore}>{averageScore.toFixed(1)}/10</ThemedText>
                </View>
                <View style={[styles.decisionBadge, { backgroundColor: autoDecision === 'approved' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }]}>
                  {autoDecision === 'approved' ? <ThumbsUp size={14} color="#22c55e" /> : <ThumbsDown size={14} color="#ef4444" />}
                  <ThemedText style={{ color: autoDecision === 'approved' ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: '700' }}>
                    {autoDecision === 'approved' ? t('mobile.board.approved') : t('mobile.board.rejected')}
                  </ThemedText>
                </View>
              </View>

              {/* Submit Button */}
              <Pressable
                style={[styles.submitBtn, { backgroundColor: autoDecision === 'approved' ? '#22c55e' : '#ef4444' }]}
                onPress={handleVote}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    {autoDecision === 'approved' ? <ThumbsUp size={18} color="#fff" /> : <ThumbsDown size={18} color="#fff" />}
                    <ThemedText style={styles.submitBtnText}>
                      {autoDecision === 'approved' ? t('mobile.board.recordApprove') : t('mobile.board.recordReject')}
                    </ThemedText>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three },
  headerSubtitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, lineHeight: 32, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#fb7185', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },

  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center' },

  seriesCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  seriesTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, marginLeft: 8 },
  badge: { backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
  descText: { fontSize: 13, marginBottom: 12, lineHeight: 20 },

  // Vote Progress
  voteProgressWrap: { marginBottom: 14 },
  voteLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  voteLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  voteLabelText: { fontSize: 11, fontWeight: '700' },
  progressBar: { height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' },
  progressFill: { height: '100%' },

  actionRow: { flexDirection: 'row', gap: 10 },
  voteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  finalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 6 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalDesc: { fontSize: 13, marginBottom: 16 },
  modalScroll: { flexGrow: 0 },

  // Rubric
  rubricSection: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  rubricHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  rubricTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  maxBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  maxBadgeText: { fontSize: 10, fontWeight: '600' },
  sliderRow: { marginBottom: 12 },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sliderLabel: { fontSize: 13, fontWeight: '600' },
  sliderScore: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
  slider: { width: '100%', height: 32 },

  input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 14, height: 80, textAlignVertical: 'top', marginBottom: 16 },

  // Decision indicator
  decisionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  avgLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  avgScore: { fontSize: 20, fontWeight: '800', color: '#6366f1' },
  decisionBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 14, marginBottom: 20 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default withProtectedEditorialBoardRoute(EditorialBoardScreen);
