import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, CalendarPlus, Check, Clock, ThumbsDown, ThumbsUp, Users, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Slider from '@react-native-community/slider';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withProtectedEditorialBoardRoute } from '@/components/protected-route';
import { authAPI, ebAPI, meetingAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const [pendingSeries, setPendingSeries] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<any>(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({});
  const [voteComment, setVoteComment] = useState('');
  const [submittingVote, setSubmittingVote] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDateTime, setMeetingDateTime] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingSeriesId, setMeetingSeriesId] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [creatingMeeting, setCreatingMeeting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      ebAPI.getPending(),
      meetingAPI.getAll(),
      authAPI.search('', ['editorial_board']),
    ]);

    const [pendingResult, meetingResult, memberResult] = results;
    setPendingSeries(pendingResult.status === 'fulfilled' && Array.isArray(pendingResult.value?.series) ? pendingResult.value.series : []);
    setMeetings(meetingResult.status === 'fulfilled' && Array.isArray(meetingResult.value?.meetings) ? meetingResult.value.meetings : []);
    setBoardMembers(memberResult.status === 'fulfilled' && Array.isArray(memberResult.value?.users) ? memberResult.value.users : []);

    if (results.some((result) => result.status === 'rejected')) {
      const failed = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      setError(failed?.reason?.message || t('mobile.board.loadError'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => { void loadData(); }, [loadData]);

  const openVoteModal = (series: any) => {
    setSelectedSeries(series);
    setVoteComment('');
    const criteria = Array.isArray(series?.rubricTemplate?.criteria) && series.rubricTemplate.criteria.length > 0
      ? series.rubricTemplate.criteria
      : DEFAULT_RUBRIC_CRITERIA;
    const initialScores: Record<string, number> = {};
    criteria.forEach((criterion: any) => {
      const existingScore = series?.userVoteRubric?.[criterion.key];
      initialScores[criterion.key] = typeof existingScore === 'number' ? existingScore : 5;
    });
    setRubricScores(initialScores);
    setShowVoteModal(true);
  };

  const voteCriteria = useMemo(() => {
    const criteria = selectedSeries?.rubricTemplate?.criteria;
    return Array.isArray(criteria) && criteria.length > 0 ? criteria : DEFAULT_RUBRIC_CRITERIA;
  }, [selectedSeries]);

  const averageScore = useMemo(() => {
    if (voteCriteria.length === 0) return 5;
    const total = voteCriteria.reduce((sum: number, criterion: any) => sum + (rubricScores[criterion.key] ?? 5), 0);
    return total / voteCriteria.length;
  }, [rubricScores, voteCriteria]);

  const autoDecision = averageScore >= 5 ? 'approved' : 'rejected';

  const submitVote = async () => {
    if (!selectedSeries?._id || submittingVote) return;
    setSubmittingVote(true);
    try {
      await ebAPI.castVote(selectedSeries._id, {
        decision: autoDecision,
        comments: voteComment.trim() || undefined,
        rubric: rubricScores,
      });
      setShowVoteModal(false);
      Alert.alert(t('common.success'), t('mobile.board.savedVote'));
      await loadData();
    } catch (requestError: any) {
      Alert.alert(t('common.error'), requestError?.message || t('mobile.board.voteError'));
    } finally {
      setSubmittingVote(false);
    }
  };

  const openMeetingModal = () => {
    const currentUserId = typeof user?._id === 'string' ? user._id : '';
    setMeetingTitle('');
    setMeetingDateTime('');
    setMeetingLocation('');
    setMeetingSeriesId(pendingSeries[0]?._id || '');
    setParticipantIds(currentUserId ? [currentUserId] : []);
    setShowMeetingModal(true);
  };

  const participantCount = useMemo(() => {
    const currentUserId = typeof user?._id === 'string' ? user._id : '';
    return participantIds.includes(currentUserId) ? participantIds.length : participantIds.length + 1;
  }, [participantIds, user?._id]);

  const toggleParticipant = (id: string) => {
    if (!id || id === user?._id) return;
    setParticipantIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const createMeeting = async () => {
    const parsedDate = new Date(meetingDateTime);
    if (!meetingTitle.trim() || !meetingSeriesId || Number.isNaN(parsedDate.getTime())) {
      Alert.alert(t('common.error'), t('mobile.board.meetingRequired'));
      return;
    }
    if (participantCount % 2 === 0) {
      Alert.alert(t('common.error'), t('mobile.board.oddParticipants'));
      return;
    }
    setCreatingMeeting(true);
    try {
      await meetingAPI.create({
        title: meetingTitle.trim(),
        dateTime: parsedDate.toISOString(),
        location: meetingLocation.trim() || undefined,
        seriesId: meetingSeriesId,
        participants: participantIds,
        purpose: 'proposal_review',
      });
      setShowMeetingModal(false);
      Alert.alert(t('common.success'), t('mobile.board.meetingCreated'));
      await loadData();
    } catch (requestError: any) {
      Alert.alert(t('common.error'), requestError?.message || t('mobile.board.meetingError'));
    } finally {
      setCreatingMeeting(false);
    }
  };

  const voteCounts = (series: any) => {
    const votes = Array.isArray(series?.ebVotes) ? series.ebVotes : [];
    return {
      approve: votes.filter((vote: any) => vote?.decision === 'approved').length,
      reject: votes.filter((vote: any) => vote?.decision === 'rejected').length,
    };
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.eyebrow}>{t('mobile.board.eyebrow')}</ThemedText>
            <ThemedText type="title" style={[styles.title, { color: theme.text }]}>{t('mobile.board.title')}</ThemedText>
          </View>
          {user?.isEbHead && (
            <Pressable style={styles.meetingButton} onPress={openMeetingModal} accessibilityRole="button">
              <CalendarPlus size={18} color="#fffaf0" />
              <ThemedText style={styles.meetingButtonText} numberOfLines={1}>{t('mobile.board.newMeeting')}</ThemedText>
            </Pressable>
          )}
        </View>

        {error ? <ThemedText style={styles.errorText}>{error}</ThemedText> : null}

        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionHeading}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>{t('mobile.board.pendingVotes')}</ThemedText>
            <ThemedText style={[styles.sectionMeta, { color: theme.textSecondary }]}>{pendingSeries.length}</ThemedText>
          </View>

          {loading ? <ActivityIndicator size="large" color="#b94234" style={styles.loader} /> : pendingSeries.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
              <ThemedText style={{ color: theme.textSecondary }}>{t('mobile.board.empty')}</ThemedText>
            </View>
          ) : pendingSeries.map((series) => {
            const counts = voteCounts(series);
            const canVote = Boolean(series?.meeting?.isParticipant);
            return (
              <View key={series._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
                <View style={styles.cardTitleRow}>
                  <BookOpen size={19} color="#a97822" />
                  <ThemedText style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{series.title || t('mobile.board.untitled')}</ThemedText>
                </View>
                <ThemedText style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>{series.description || t('mobile.board.noDescription')}</ThemedText>
                <View style={styles.countRow}>
                  <View style={styles.count}><ThumbsUp size={14} color="#357053" /><ThemedText style={styles.approve}>{counts.approve}</ThemedText></View>
                  <View style={styles.count}><ThumbsDown size={14} color="#a43a32" /><ThemedText style={styles.reject}>{counts.reject}</ThemedText></View>
                </View>
                <Pressable
                  style={[styles.voteButton, !canVote && styles.disabledButton]}
                  onPress={() => openVoteModal(series)}
                  disabled={!canVote}
                  accessibilityRole="button"
                >
                  <ThemedText style={styles.buttonText}>{t('mobile.board.vote')}</ThemedText>
                </Pressable>
              </View>
            );
          })}

          <View style={styles.sectionHeading}>
            <ThemedText style={[styles.sectionTitle, { color: theme.text }]}>{t('mobile.board.myMeetings')}</ThemedText>
            <ThemedText style={[styles.sectionMeta, { color: theme.textSecondary }]}>{meetings.length}</ThemedText>
          </View>
          {meetings.length === 0 ? <ThemedText style={[styles.emptyMeeting, { color: theme.textSecondary }]}>{t('mobile.board.noMeetings')}</ThemedText> : meetings.map((meeting) => (
            <View key={meeting._id} style={[styles.meetingCard, { borderColor: theme.borderGlow }]}>
              <Clock size={18} color="#52707b" />
              <View style={styles.meetingInfo}>
                <ThemedText style={[styles.meetingTitle, { color: theme.text }]} numberOfLines={1}>{meeting.title || t('mobile.board.meetingFallback')}</ThemedText>
                <ThemedText style={[styles.meetingMeta, { color: theme.textSecondary }]}>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : t('mobile.board.datePending')}</ThemedText>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      <Modal visible={showVoteModal} transparent animationType="slide" onRequestClose={() => setShowVoteModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}><ThemedText style={[styles.modalTitle, { color: theme.text }]}>{t('mobile.board.voteModal')}</ThemedText><Pressable onPress={() => setShowVoteModal(false)} hitSlop={12}><X color={theme.textSecondary} /></Pressable></View>
            <ThemedText style={[styles.modalDescription, { color: theme.textSecondary }]}>{selectedSeries?.title || t('mobile.board.untitled')}</ThemedText>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.rubricCard, { backgroundColor: theme.background, borderColor: theme.borderGlow }]}>
                <View style={styles.rubricHeader}>
                  <ThemedText style={[styles.rubricTitle, { color: theme.text }]}>{t('mobile.board.rubric')}</ThemedText>
                  <ThemedText style={[styles.maxBadge, { color: theme.textSecondary, borderColor: theme.borderGlow }]}>{t('mobile.board.max')}</ThemedText>
                </View>
                {voteCriteria.map((criterion: any) => {
                  const score = rubricScores[criterion.key] ?? 5;
                  return (
                    <View key={criterion.key} style={styles.sliderRow}>
                      <View style={styles.sliderLabelRow}>
                        <ThemedText style={[styles.sliderLabel, { color: theme.text }]}>{criterion.label || (criterion.labelKey ? t(criterion.labelKey) : criterion.key)}</ThemedText>
                        <ThemedText style={styles.sliderScore}>{score}/10</ThemedText>
                      </View>
                      <Slider
                        style={styles.slider}
                        minimumValue={1}
                        maximumValue={10}
                        step={1}
                        value={score}
                        onValueChange={(value) => setRubricScores((current) => ({ ...current, [criterion.key]: value }))}
                        minimumTrackTintColor="#52707b"
                        maximumTrackTintColor={theme.borderGlow}
                        thumbTintColor="#52707b"
                      />
                    </View>
                  );
                })}
              </View>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.borderGlow }]} value={voteComment} onChangeText={setVoteComment} placeholder={t('mobile.board.commentPlaceholder')} placeholderTextColor={theme.textSecondary} multiline />
              <View style={[styles.averageCard, { backgroundColor: theme.background, borderColor: theme.borderGlow }]}>
                <View>
                  <ThemedText style={[styles.averageLabel, { color: theme.textSecondary }]}>{t('mobile.board.average')}</ThemedText>
                  <ThemedText style={styles.averageScore}>{averageScore.toFixed(1)}/10</ThemedText>
                </View>
                <View style={[styles.decisionBadge, autoDecision === 'approved' ? styles.approvedBadge : styles.rejectedBadge]}>
                  {autoDecision === 'approved' ? <ThumbsUp size={14} color="#357053" /> : <ThumbsDown size={14} color="#a43a32" />}
                  <ThemedText style={[styles.decisionBadgeText, { color: autoDecision === 'approved' ? '#357053' : '#a43a32' }]}>{autoDecision === 'approved' ? t('mobile.board.approved') : t('mobile.board.rejected')}</ThemedText>
                </View>
              </View>
              <View style={styles.voteActions}>
                <Pressable style={[styles.cancelButton, { borderColor: theme.borderGlow }]} onPress={() => setShowVoteModal(false)} disabled={submittingVote}>
                  <ThemedText style={{ color: theme.text }}>{t('common.cancel')}</ThemedText>
                </Pressable>
                <Pressable style={[styles.submitButton, autoDecision === 'approved' ? styles.decisionApproved : styles.decisionRejected]} onPress={() => void submitVote()} disabled={submittingVote}>
                  {submittingVote ? <ActivityIndicator color="#fffaf0" /> : <>
                    {autoDecision === 'approved' ? <ThumbsUp size={17} color="#fffaf0" /> : <ThumbsDown size={17} color="#fffaf0" />}
                    <ThemedText style={styles.buttonText}>{autoDecision === 'approved' ? t('mobile.board.recordApprove') : t('mobile.board.recordReject')}</ThemedText>
                  </>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMeetingModal} transparent animationType="slide" onRequestClose={() => setShowMeetingModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.modal, styles.meetingModal, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalHeader}><ThemedText style={[styles.modalTitle, { color: theme.text }]}>{t('mobile.board.newMeeting')}</ThemedText><Pressable onPress={() => setShowMeetingModal(false)} hitSlop={12}><X color={theme.textSecondary} /></Pressable></View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.borderGlow }]} value={meetingTitle} onChangeText={setMeetingTitle} placeholder={t('mobile.board.meetingTitlePlaceholder')} placeholderTextColor={theme.textSecondary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.borderGlow }]} value={meetingDateTime} onChangeText={setMeetingDateTime} placeholder={t('mobile.board.meetingDatePlaceholder')} placeholderTextColor={theme.textSecondary} />
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.borderGlow }]} value={meetingLocation} onChangeText={setMeetingLocation} placeholder={t('mobile.board.meetingLocationPlaceholder')} placeholderTextColor={theme.textSecondary} />
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>{t('mobile.board.chooseSeries')}</ThemedText>
              {pendingSeries.map((series) => <Pressable key={series._id} style={[styles.choiceRow, { borderColor: theme.borderGlow }, meetingSeriesId === series._id && styles.choiceActive]} onPress={() => setMeetingSeriesId(series._id)}><ThemedText style={{ color: theme.text }} numberOfLines={1}>{series.title || t('mobile.board.untitled')}</ThemedText>{meetingSeriesId === series._id ? <Check size={16} color="#b94234" /> : null}</Pressable>)}
              <View style={styles.participantHeading}><Users size={16} color="#52707b" /><ThemedText style={[styles.fieldLabel, { color: theme.text }]}>{t('mobile.board.participants', { count: participantCount })}</ThemedText></View>
              {boardMembers.map((member) => {
                const selected = participantIds.includes(member?._id);
                const isCurrentUser = member?._id === user?._id;
                return <Pressable key={member._id} style={[styles.choiceRow, { borderColor: theme.borderGlow }, selected && styles.choiceActive]} onPress={() => toggleParticipant(member._id)}><ThemedText style={{ color: theme.text }} numberOfLines={1}>{member.displayName || member.email || t('mobile.board.memberFallback')}</ThemedText>{selected ? <Check size={16} color="#b94234" /> : null}{isCurrentUser ? <ThemedText style={styles.organizer}>{t('mobile.board.organizer')}</ThemedText> : null}</Pressable>;
              })}
              <ThemedText style={[styles.helper, { color: theme.textSecondary }]}>{t('mobile.board.participantHint')}</ThemedText>
              <Pressable style={styles.meetingButtonWide} onPress={() => void createMeeting()} disabled={creatingMeeting}>{creatingMeeting ? <ActivityIndicator color="#fffaf0" /> : <ThemedText style={styles.buttonText}>{t('mobile.board.createMeeting')}</ThemedText>}</Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, safeArea: { flex: 1 }, header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.two },
  eyebrow: { color: '#a97822', fontSize: 11, fontWeight: '800', letterSpacing: 1 }, title: { fontSize: 28, lineHeight: 33, fontWeight: '800' }, content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.two },
  meetingButton: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingHorizontal: 12, backgroundColor: '#b94234' }, meetingButtonText: { color: '#fffaf0', fontSize: 12, fontWeight: '800' },
  errorText: { color: '#a43a32', marginHorizontal: Spacing.three, marginBottom: Spacing.two, fontSize: 13 }, sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.two }, sectionTitle: { fontSize: 16, fontWeight: '800' }, sectionMeta: { fontSize: 13, fontWeight: '700' }, loader: { marginVertical: Spacing.five },
  emptyCard: { padding: Spacing.three, borderRadius: 14, borderWidth: 1 }, card: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: 10 }, cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, cardTitle: { flex: 1, fontSize: 16, fontWeight: '800' }, description: { fontSize: 13, lineHeight: 19 }, countRow: { flexDirection: 'row', gap: Spacing.three }, count: { flexDirection: 'row', alignItems: 'center', gap: 5 }, approve: { color: '#357053', fontWeight: '800' }, reject: { color: '#a43a32', fontWeight: '800' },
  voteButton: { minHeight: 44, borderRadius: 10, backgroundColor: '#52707b', alignItems: 'center', justifyContent: 'center' }, disabledButton: { opacity: 0.4 }, buttonText: { color: '#fffaf0', fontSize: 14, fontWeight: '800' },
  emptyMeeting: { fontSize: 14, paddingVertical: Spacing.two }, meetingCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 }, meetingInfo: { flex: 1 }, meetingTitle: { fontSize: 14, fontWeight: '800' }, meetingMeta: { fontSize: 12, marginTop: 3 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,41,40,0.65)' }, modal: { maxHeight: '88%', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: Spacing.three }, meetingModal: { maxHeight: '92%' }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.two }, modalTitle: { fontSize: 19, fontWeight: '800' }, modalDescription: { fontSize: 14, marginBottom: Spacing.three },
  rubricCard: { borderRadius: 14, borderWidth: 1, padding: Spacing.three, marginBottom: Spacing.two }, rubricHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two }, rubricTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.8 }, maxBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, fontWeight: '700' }, sliderRow: { marginBottom: Spacing.two }, sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sliderLabel: { flex: 1, paddingRight: Spacing.two, fontSize: 13, fontWeight: '700' }, sliderScore: { color: '#52707b', fontSize: 13, fontWeight: '900' }, slider: { width: '100%', height: 32 }, input: { minHeight: 70, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: Spacing.two, textAlignVertical: 'top' }, averageCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: Spacing.three, marginBottom: Spacing.two }, averageLabel: { fontSize: 11, fontWeight: '700' }, averageScore: { color: '#52707b', fontSize: 22, fontWeight: '900' }, decisionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }, approvedBadge: { backgroundColor: 'rgba(53,112,83,0.14)' }, rejectedBadge: { backgroundColor: 'rgba(164,58,50,0.14)' }, decisionBadgeText: { fontSize: 12, fontWeight: '900' }, voteActions: { flexDirection: 'row', gap: Spacing.two, marginBottom: Spacing.two }, cancelButton: { minHeight: 46, paddingHorizontal: Spacing.three, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center' }, decisionApproved: { backgroundColor: '#357053', borderColor: '#357053' }, decisionRejected: { backgroundColor: '#a43a32', borderColor: '#a43a32' }, submitButton: { flex: 1, minHeight: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  fieldLabel: { fontSize: 13, fontWeight: '800', marginBottom: 8 }, choiceRow: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, choiceActive: { borderColor: '#b94234', backgroundColor: '#f3ddd2' }, participantHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: Spacing.two }, organizer: { color: '#52707b', fontSize: 11, fontWeight: '800', marginLeft: 'auto' }, helper: { fontSize: 12, lineHeight: 18, marginBottom: Spacing.two }, meetingButtonWide: { minHeight: 46, borderRadius: 10, backgroundColor: '#b94234', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.two },
});

export default withProtectedEditorialBoardRoute(EditorialBoardScreen);
