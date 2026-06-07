import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, BookOpen, ThumbsUp, ThumbsDown, Send, X, BarChart } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ebAPI } from '@/lib/api';
import { withProtectedEditorialBoardRoute } from '@/components/protected-route';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function EditorialBoardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [pendingSeries, setPendingSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Voting Modal State
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [voteDecision, setVoteDecision] = useState<'approve' | 'reject'>('approve');
  const [voteComment, setVoteComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = () => {
    setLoading(true);
    setError(null);
    ebAPI.getPending()
      .then(res => setPendingSeries(res.series || []))
      .catch(err => setError(err.message || 'Không thể tải danh sách.'))
      .finally(() => setLoading(false));
  };

  const openVoteModal = (series: any) => {
    setSelectedSeries(series);
    setVoteDecision('approve');
    setVoteComment('');
    setShowVoteModal(true);
  };

  const handleVote = () => {
    if (!selectedSeries) return;
    setSubmitting(true);
    ebAPI.castVote(selectedSeries._id, {
      decision: voteDecision,
      comments: voteComment
    })
    .then(() => {
      Alert.alert('Thành công', 'Đã lưu phiếu bầu của bạn.');
      setShowVoteModal(false);
      loadPending();
    })
    .catch(err => Alert.alert('Lỗi', err.message))
    .finally(() => setSubmitting(false));
  };

  const handleFinalDecision = (seriesId: string) => {
    Alert.alert(
      'Quyết định cuối cùng',
      'Bạn muốn duyệt phát hành tác phẩm này?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Từ chối', style: 'destructive', onPress: () => {
          ebAPI.makeFinalDecision(seriesId, { decision: 'rejected', comments: 'EB Rejected' })
            .then(() => loadPending())
            .catch(err => Alert.alert('Lỗi', err.message));
        }},
        { text: 'Duyệt Phát Hành', onPress: () => {
          ebAPI.makeFinalDecision(seriesId, { decision: 'approved', publicationSchedule: 'Weekly' })
            .then(() => loadPending())
            .catch(err => Alert.alert('Lỗi', err.message));
        }},
      ]
    );
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>EDITORIAL BOARD</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>Hội đồng duyệt</ThemedText>
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
          {loading ? (
            <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
          ) : pendingSeries.length === 0 ? (
            <View style={styles.emptyState}>
              <Shield size={48} color="#64748b" />
              <ThemedText style={styles.emptyText}>Chưa có tác phẩm nào chờ hội đồng duyệt.</ThemedText>
            </View>
          ) : (
            pendingSeries.map(series => (
              <View key={series._id} style={styles.seriesCard}>
                <View style={styles.cardHeader}>
                  <BookOpen size={20} color="#f59e0b" />
                  <ThemedText style={styles.seriesTitle} numberOfLines={1}>{series.title}</ThemedText>
                  <View style={styles.badge}>
                    <ThemedText style={styles.badgeText}>Bầu chọn</ThemedText>
                  </View>
                </View>
                
                <ThemedText style={styles.descText} numberOfLines={2}>{series.description || 'Chưa có mô tả'}</ThemedText>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <ThumbsUp size={14} color="#4ade80" />
                    <ThemedText style={styles.statText}>{series.ebVotes?.filter((v: any) => v.decision === 'approve').length || 0} Đồng ý</ThemedText>
                  </View>
                  <View style={styles.statBox}>
                    <ThumbsDown size={14} color="#ef4444" />
                    <ThemedText style={styles.statText}>{series.ebVotes?.filter((v: any) => v.decision === 'reject').length || 0} Từ chối</ThemedText>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Pressable style={styles.voteBtn} onPress={() => openVoteModal(series)}>
                    <BarChart size={16} color="#fff" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.actionBtnText}>Bỏ phiếu</ThemedText>
                  </Pressable>
                  <Pressable style={styles.finalBtn} onPress={() => handleFinalDecision(series._id)}>
                    <Send size={16} color="#fff" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.actionBtnText}>Quyết định cuối</ThemedText>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Vote Modal */}
      <Modal visible={showVoteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Bỏ phiếu Hội Đồng</ThemedText>
              <Pressable onPress={() => setShowVoteModal(false)}><X color="#fff" /></Pressable>
            </View>
            <ThemedText style={styles.modalDesc}>Đánh giá tác phẩm &quot;{selectedSeries?.title}&quot;</ThemedText>
            
            <View style={styles.decisionRow}>
              <Pressable 
                style={[styles.decisionBtn, voteDecision === 'approve' && styles.decisionBtnActive]} 
                onPress={() => setVoteDecision('approve')}
              >
                <ThumbsUp size={20} color={voteDecision === 'approve' ? '#fff' : '#64748b'} />
                <ThemedText style={[styles.decisionText, voteDecision === 'approve' && { color: '#fff' }]}>Đồng ý Xuất bản</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.decisionBtn, voteDecision === 'reject' && styles.decisionBtnActiveReject]} 
                onPress={() => setVoteDecision('reject')}
              >
                <ThumbsDown size={20} color={voteDecision === 'reject' ? '#fff' : '#64748b'} />
                <ThemedText style={[styles.decisionText, voteDecision === 'reject' && { color: '#fff' }]}>Yêu cầu sửa đổi</ThemedText>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nhận xét chuyên môn..."
              placeholderTextColor="#64748b"
              value={voteComment}
              onChangeText={setVoteComment}
              multiline
            />
            
            <Pressable style={styles.primaryBtn} onPress={handleVote} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryBtnText}>Ghi nhận Phiếu Bầu</ThemedText>}
            </Pressable>
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
  headerSubtitle: { color: '#f59e0b', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#fb7185', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  
  seriesCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  seriesTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, marginLeft: 8 },
  badge: { backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
  descText: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 20 },
  
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  statBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 6 },
  statText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  
  actionRow: { flexDirection: 'row', gap: 10 },
  voteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10 },
  finalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e1b4b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  decisionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  decisionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginHorizontal: 4, borderWidth: 1, borderColor: 'transparent' },
  decisionBtnActive: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22c55e' },
  decisionBtnActiveReject: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  decisionText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 8, textAlign: 'center' }
});

export default withProtectedEditorialBoardRoute(EditorialBoardScreen);

