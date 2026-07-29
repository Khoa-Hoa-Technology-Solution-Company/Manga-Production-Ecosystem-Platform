import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarPlus,
  Check,
  ClipboardCheck,
  Gavel,
  MapPin,
  Plus,
  Send,
  Settings2,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  Trophy,
  UserRoundPlus,
  Users,
  X,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withProtectedEditorialBoardRoute } from '@/components/protected-route';
import { authAPI, ebAPI, meetingAPI, rubricTemplateAPI, seriesAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { hasLengthBetween, isFutureDate } from '@/lib/validation';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';

type Tab = 'dashboard' | 'assign' | 'votes' | 'meetings' | 'rankings' | 'cancellation' | 'rubrics';
type VoteDecision = 'approved' | 'rejected';

const DEFAULT_CRITERIA = [
  { key: 'artStyle', label: 'Art style' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'characterDesign', label: 'Character design' },
  { key: 'pacing', label: 'Pacing & layout' },
  { key: 'commercialPotential', label: 'Commercial potential' },
];

function EditorialBoardScreen() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const vi = i18n.language.startsWith('vi');
  const text = useCallback((viText: string, enText: string) => (vi ? viText : enText), [vi]);
  const isHead = Boolean(user?.isEbHead);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>({});
  const [meetings, setMeetings] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [rankPeriod, setRankPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [templates, setTemplates] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [unassigned, setUnassigned] = useState<any[]>([]);
  const [editors, setEditors] = useState<any[]>([]);

  const [voteSeries, setVoteSeries] = useState<any>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [voteComment, setVoteComment] = useState('');
  const [savingVote, setSavingVote] = useState(false);
  const [decisionSeries, setDecisionSeries] = useState<any>(null);
  const [publicationMode, setPublicationMode] = useState<'immediate' | 'scheduled'>('immediate');
  const [publicationSchedule, setPublicationSchedule] = useState<'weekly' | 'monthly'>('weekly');
  const [publicationStartAt, setPublicationStartAt] = useState('');
  const [savingDecision, setSavingDecision] = useState(false);

  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingPurpose, setMeetingPurpose] = useState<'proposal_review' | 'cancellation_review'>('proposal_review');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDescription, setMeetingDescription] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingSeriesIds, setMeetingSeriesIds] = useState<string[]>([]);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [rubricTemplateId, setRubricTemplateId] = useState('');
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [editorSeries, setEditorSeries] = useState<any>(null);
  const [selectedEditor, setSelectedEditor] = useState<any>(null);
  const [assigning, setAssigning] = useState(false);
  const [cancellationSeries, setCancellationSeries] = useState<any>(null);
  const [cancellationComment, setCancellationComment] = useState('');
  const [cancellationAction, setCancellationAction] = useState<'cancel' | 'continue'>('continue');
  const [savingCancellation, setSavingCancellation] = useState(false);
  const [finalizeSeries, setFinalizeSeries] = useState<any>(null);
  const [finalizeReason, setFinalizeReason] = useState('');
  const [savingFinalize, setSavingFinalize] = useState(false);
  const [scheduleSeries, setScheduleSeries] = useState<any>(null);
  const [newSchedule, setNewSchedule] = useState<'weekly' | 'monthly'>('weekly');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [rubricOpen, setRubricOpen] = useState(false);
  const [rubricName, setRubricName] = useState('');
  const [rubricCriteria, setRubricCriteria] = useState('Art Style\nStorytelling');
  const [savingRubric, setSavingRubric] = useState(false);

  const loadData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      ebAPI.getPending(),
      ebAPI.getDashboard(),
      ebAPI.getPerformanceRankings(rankPeriod, 'asc'),
      meetingAPI.getAll(),
      rubricTemplateAPI.getAll(),
      authAPI.search('', ['editorial_board']),
      seriesAPI.getAll({ status: 'Pending_Editor', limit: '100' }),
      seriesAPI.getEditors(),
    ]);
    const value = (index: number, fallback: any) => results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<any>).value : fallback;
    const pendingResult = value(0, { series: [] });
    const dashboardResult = value(1, { dashboard: {} });
    const rankingsResult = value(2, { rankings: [] });
    const meetingsResult = value(3, { meetings: [] });
    const templatesResult = value(4, { templates: [] });
    const membersResult = value(5, { users: [] });
    const pendingEditorResult = value(6, { series: [] });
    const editorsResult = value(7, { editors: [] });
    setPending(Array.isArray(pendingResult.series) ? pendingResult.series : []);
    setDashboard(dashboardResult.dashboard || dashboardResult || {});
    setRankings(Array.isArray(rankingsResult.rankings) ? rankingsResult.rankings : []);
    setMeetings(Array.isArray(meetingsResult.meetings) ? meetingsResult.meetings : []);
    setTemplates(Array.isArray(templatesResult.templates) ? templatesResult.templates : []);
    setBoardMembers(Array.isArray(membersResult.users) ? membersResult.users : []);
    const queued = Array.isArray(pendingEditorResult.series) ? pendingEditorResult.series : [];
    setUnassigned(queued.filter((series: any) => !series.editorId));
    setEditors(Array.isArray(editorsResult.editors) ? editorsResult.editors : []);
    const failed = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined;
    if (failed) setError(failed.reason?.message || text('Không thể tải đầy đủ dữ liệu EB.', 'Some Editorial Board data could not be loaded.'));
    setLoading(false);
    setRefreshing(false);
  }, [rankPeriod, text]);

  useEffect(() => { void loadData(); }, [loadData]);

  const criteria = useMemo(() => {
    const chosen = voteSeries?.rubricTemplate?.criteria;
    return Array.isArray(chosen) && chosen.length ? chosen : DEFAULT_CRITERIA;
  }, [voteSeries]);
  const average = useMemo(() => criteria.reduce((sum: number, item: any) => sum + (scores[item.key] ?? 5), 0) / Math.max(criteria.length, 1), [criteria, scores]);
  const meetingCandidates = meetingPurpose === 'cancellation_review' ? rankings.filter((series) => series.status === 'Active') : pending;
  const participantCount = new Set([...participantIds, user?._id].filter(Boolean)).size;

  const openVote = (series: any) => {
    const list = Array.isArray(series?.rubricTemplate?.criteria) && series.rubricTemplate.criteria.length ? series.rubricTemplate.criteria : DEFAULT_CRITERIA;
    setScores(Object.fromEntries(list.map((item: any) => [item.key, series?.userVoteRubric?.[item.key] ?? 5])));
    setVoteComment(series?.userVoteComments || '');
    setVoteSeries(series);
  };

  const submitVote = async (decision: VoteDecision) => {
    if (!voteSeries || savingVote) return;
    if (voteComment.trim().length > 2000 || (decision === 'rejected' && !voteComment.trim())) {
      Alert.alert(
        text('Nhận xét không hợp lệ', 'Invalid comments'),
        text('Phiếu yêu cầu sửa cần có nhận xét và không vượt quá 2000 ký tự.', 'A change request needs comments of at most 2000 characters.')
      );
      return;
    }
    setSavingVote(true);
    try {
      await ebAPI.castVote(voteSeries._id, { decision, comments: voteComment.trim() || undefined, rubric: scores });
      setVoteSeries(null);
      await loadData(true);
    } catch (requestError: any) {
      Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể ghi nhận phiếu.', 'Could not save the vote.'));
    } finally { setSavingVote(false); }
  };

  const submitFinalDecision = async (decision: VoteDecision) => {
    if (!decisionSeries || savingDecision) return;
    const startAt = publicationMode === 'scheduled' ? new Date(publicationStartAt) : null;
    if (decision === 'approved' && publicationMode === 'scheduled' && (!startAt || Number.isNaN(startAt.getTime()) || startAt.getTime() <= Date.now())) {
      Alert.alert(text('Thời gian không hợp lệ', 'Invalid start time'), text('Chọn một thời điểm xuất bản trong tương lai.', 'Choose a publication start time in the future.'));
      return;
    }
    setSavingDecision(true);
    try {
      await ebAPI.makeFinalDecision(decisionSeries._id, {
        decision,
        publicationMode: decision === 'approved' ? publicationMode : undefined,
        publicationSchedule: decision === 'approved' && publicationMode === 'scheduled' ? publicationSchedule : undefined,
        publicationStartAt: decision === 'approved' && publicationMode === 'scheduled' ? startAt!.toISOString() : undefined,
      });
      setDecisionSeries(null);
      await loadData(true);
    } catch (requestError: any) {
      Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể hoàn tất quyết định.', 'Could not complete the decision.'));
    } finally { setSavingDecision(false); }
  };

  const openMeeting = (purpose: 'proposal_review' | 'cancellation_review' = 'proposal_review', series?: any) => {
    setMeetingPurpose(purpose);
    setMeetingTitle(series ? `${purpose === 'cancellation_review' ? 'Cancellation review' : 'Review'}: ${series.title}` : '');
    setMeetingDescription('');
    setMeetingDate('');
    setMeetingLocation('');
    setMeetingSeriesIds(series?._id ? [series._id] : []);
    setParticipantIds([]);
    setRubricTemplateId('');
    setMeetingOpen(true);
  };

  const submitMeeting = async () => {
    const date = new Date(meetingDate);
    if (
      !hasLengthBetween(meetingTitle, 2, 120)
      || !isFutureDate(meetingDate)
      || meetingDescription.trim().length > 2000
      || meetingLocation.trim().length > 200
      || !meetingSeriesIds.length
      || !participantIds.length
    ) {
      Alert.alert(text('Thiếu thông tin', 'Missing information'), text('Nhập tiêu đề, thời gian, tác phẩm và thành viên.', 'Enter a title, date/time, series, and members.'));
      return;
    }
    if (participantCount % 2 === 0) {
      Alert.alert(text('Số thành viên không hợp lệ', 'Invalid member count'), text('Tổng số người tham gia (gồm trưởng EB) phải là số lẻ.', 'The total participants, including the EB Head, must be odd.'));
      return;
    }
    setSavingMeeting(true);
    try {
      await meetingAPI.create({ title: meetingTitle.trim(), description: meetingDescription.trim() || undefined, dateTime: date.toISOString(), location: meetingLocation.trim() || undefined, seriesIds: meetingSeriesIds, participants: participantIds, rubricTemplateId: meetingPurpose === 'proposal_review' ? rubricTemplateId || undefined : undefined, purpose: meetingPurpose });
      setMeetingOpen(false);
      await loadData(true);
      setTab(meetingPurpose === 'cancellation_review' ? 'cancellation' : 'meetings');
    } catch (requestError: any) {
      Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể tạo cuộc họp.', 'Could not create the meeting.'));
    } finally { setSavingMeeting(false); }
  };

  const removeMeeting = (meeting: any) => Alert.alert(text('Hủy cuộc họp?', 'Cancel meeting?'), meeting.title, [
    { text: text('Không', 'No'), style: 'cancel' },
    { text: text('Hủy họp', 'Cancel meeting'), style: 'destructive', onPress: () => void meetingAPI.delete(meeting._id).then(() => loadData(true)).catch((err) => Alert.alert(text('Lỗi', 'Error'), err?.message)) },
  ]);

  const assignEditor = async () => {
    if (!editorSeries || !selectedEditor || assigning) return;
    setAssigning(true);
    try {
      await seriesAPI.assignEditor(editorSeries._id, selectedEditor._id);
      setEditorSeries(null);
      setSelectedEditor(null);
      await loadData(true);
    } catch (requestError: any) {
      Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể phân editor.', 'Could not assign the editor.'));
    } finally { setAssigning(false); }
  };

  const submitCancellationVote = async () => {
    if (!cancellationSeries || savingCancellation) return;
    if (cancellationComment.trim().length > 2000 || (cancellationAction === 'cancel' && !cancellationComment.trim())) {
      Alert.alert(
        text('Nhận xét không hợp lệ', 'Invalid comments'),
        text('Phiếu ngừng phát hành cần có lý do và không vượt quá 2000 ký tự.', 'A cancellation vote needs a reason of at most 2000 characters.')
      );
      return;
    }
    setSavingCancellation(true);
    try { await ebAPI.castCancellationVote(cancellationSeries._id, { decision: cancellationAction, comments: cancellationComment.trim() || undefined }); setCancellationSeries(null); await loadData(true); }
    catch (requestError: any) { Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể ghi nhận phiếu.', 'Could not save the cancellation vote.')); }
    finally { setSavingCancellation(false); }
  };

  const finalizeCancellation = async () => {
    if (!finalizeSeries || savingFinalize) return;
    if (finalizeReason.trim().length > 2000) {
      Alert.alert(text('Lý do quá dài', 'Reason is too long'), text('Lý do không được vượt quá 2000 ký tự.', 'Reason cannot exceed 2000 characters.'));
      return;
    }
    setSavingFinalize(true);
    try { await ebAPI.cancelSeries(finalizeSeries._id, { reason: finalizeReason.trim() }); setFinalizeSeries(null); await loadData(true); }
    catch (requestError: any) { Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể chốt quyết định.', 'Could not finalize the review.')); }
    finally { setSavingFinalize(false); }
  };

  const savePublicationSchedule = async () => {
    if (!scheduleSeries || savingSchedule) return;
    setSavingSchedule(true);
    try { await ebAPI.updatePublicationSchedule(scheduleSeries._id, newSchedule); setScheduleSeries(null); await loadData(true); }
    catch (requestError: any) { Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể cập nhật lịch xuất bản.', 'Could not update the publication schedule.')); }
    finally { setSavingSchedule(false); }
  };

  const createRubric = async () => {
    const criteriaItems = rubricCriteria.split('\n').map((label) => label.trim()).filter(Boolean).map((label) => ({ label, key: label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `criterion_${Date.now()}` }));
    const uniqueKeys = new Set(criteriaItems.map((item) => item.key));
    if (
      !hasLengthBetween(rubricName, 2, 100)
      || !criteriaItems.length
      || criteriaItems.length > 20
      || criteriaItems.some((item) => item.label.length > 100)
      || uniqueKeys.size !== criteriaItems.length
      || savingRubric
    ) {
      Alert.alert(
        text('Rubric không hợp lệ', 'Invalid rubric'),
        text('Nhập tên 2-100 ký tự và 1-20 tiêu chí khác nhau, mỗi tiêu chí tối đa 100 ký tự.', 'Use a 2-100 character name and 1-20 unique criteria of at most 100 characters each.')
      );
      return;
    }
    setSavingRubric(true);
    try { await rubricTemplateAPI.create({ name: rubricName.trim(), criteria: criteriaItems }); setRubricOpen(false); await loadData(true); }
    catch (requestError: any) { Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể tạo rubric.', 'Could not create the rubric.')); }
    finally { setSavingRubric(false); }
  };

  const activateRubric = async (id: string) => {
    try { await rubricTemplateAPI.activate(id); await loadData(true); }
    catch (requestError: any) { Alert.alert(text('Lỗi', 'Error'), requestError?.message || text('Không thể kích hoạt rubric.', 'Could not activate the rubric.')); }
  };

  const tabs: { key: Tab; label: string; icon: React.ComponentType<any>; show?: boolean; count?: number }[] = [
    { key: 'dashboard', label: text('Tổng quan', 'Overview'), icon: BarChart3 },
    { key: 'assign', label: text('Phân editor', 'Assign editor'), icon: UserRoundPlus, show: isHead, count: unassigned.length },
    { key: 'votes', label: text('Bỏ phiếu', 'Votes'), icon: Gavel, count: pending.length },
    { key: 'meetings', label: text('Họp', 'Meetings'), icon: CalendarDays },
    { key: 'rankings', label: text('Xếp hạng', 'Rankings'), icon: Trophy },
    { key: 'cancellation', label: text('Ngừng phát hành', 'Cancellation'), icon: AlertTriangle, count: rankings.filter((series) => series.cancellationReview).length },
    { key: 'rubrics', label: 'Rubrics', icon: Settings2, show: isHead },
  ];

  const sectionTitle = (title: string, action?: React.ReactNode) => <View style={styles.sectionHeading}><ThemedText style={[styles.sectionTitle, { color: theme.text }]}>{title}</ThemedText>{action}</View>;
  const renderEmpty = (message: string) => <View style={[styles.empty, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><ThemedText style={{ color: theme.textSecondary }}>{message}</ThemedText></View>;
  const toggleId = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) => setter((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const renderDashboard = () => {
    const stats = dashboard.stats || dashboard;
    const items = [
      [text('Chờ bỏ phiếu', 'Pending votes'), stats.pendingCount ?? pending.length, Gavel],
      [text('Đang hoạt động', 'Active series'), stats.activeCount ?? 0, BookOpen],
      [text('Cần theo dõi', 'At risk'), stats.cancellationRiskCount ?? 0, AlertTriangle],
      [text('Quyết định', 'Decisions'), stats.totalDecisions ?? 0, ClipboardCheck],
    ];
    const atRisk = dashboard.atRiskSeries || [];
    const overdue = dashboard.overdueChapters || [];
    return <>
      <View style={styles.metricGrid}>{items.map(([label, value, Icon]: any) => <View key={label} style={[styles.metric, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><Icon size={18} color="#7a5a43" /><ThemedText style={[styles.metricValue, { color: theme.text }]}>{value}</ThemedText><ThemedText style={[styles.metricLabel, { color: theme.textSecondary }]}>{label}</ThemedText></View>)}</View>
      {sectionTitle(text('Tác phẩm cần theo dõi', 'At-risk series'), <Pressable onPress={() => setTab('rankings')}><ThemedText style={styles.link}>{text('Xem xếp hạng', 'View rankings')}</ThemedText></Pressable>)}
      {atRisk.length ? atRisk.map((series: any) => <SimpleSeriesCard key={series._id} series={series} theme={theme} subtitle={series.riskReason || text('Hiệu suất cần được EB theo dõi.', 'Performance needs EB attention.')} />) : renderEmpty(text('Chưa có tác phẩm cần theo dõi.', 'No at-risk series.'))}
      {sectionTitle(text('Chapter quá hạn', 'Overdue chapters'))}
      {overdue.length ? overdue.map((chapter: any) => <View key={chapter._id || chapter.chapterId} style={[styles.listCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><AlertTriangle size={17} color="#a97822" /><View style={styles.grow}><ThemedText style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>{chapter.title || `Chapter ${chapter.chapterNumber}`}</ThemedText><ThemedText style={[styles.listMeta, { color: theme.textSecondary }]}>{chapter.series?.title || chapter.seriesId?.title || text('Không rõ tác phẩm', 'Unknown series')}</ThemedText></View></View>) : renderEmpty(text('Không có chapter quá hạn.', 'No overdue chapters.'))}
    </>;
  };

  const renderVotes = () => <>
    {sectionTitle(text('Tác phẩm chờ bỏ phiếu', 'Series awaiting votes'), isHead ? <Pressable style={styles.compactPrimary} onPress={() => openMeeting()}><CalendarPlus size={15} color="#fffaf0" /><ThemedText style={styles.compactPrimaryText}>{text('Tạo họp', 'Schedule')}</ThemedText></Pressable> : undefined)}
    {pending.length ? pending.map((series) => {
      const meeting = series.meeting;
      const canVote = Boolean(meeting?.isParticipant);
      return <View key={series._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
        <SimpleSeriesCard series={series} theme={theme} subtitle={series.description || text('Chưa có mô tả.', 'No description.')} />
        <View style={styles.voteStats}><ThemedText style={styles.approve}><ThumbsUp size={13} color="#357053" /> {series.votesFor ?? series.ebVotes?.filter((v: any) => v.decision === 'approved').length ?? 0}</ThemedText><ThemedText style={styles.reject}><ThumbsDown size={13} color="#a43a32" /> {series.votesAgainst ?? series.ebVotes?.filter((v: any) => v.decision === 'rejected').length ?? 0}</ThemedText></View>
        <ThemedText style={[styles.helper, { color: theme.textSecondary }]}>{meeting ? `${meeting.title || text('Cuộc họp review', 'Review meeting')} · ${meeting.votesCount || 0}/${meeting.participantsCount || 0}` : text('Cần có cuộc họp trước khi bỏ phiếu.', 'A review meeting is required before voting.')}</ThemedText>
        <View style={styles.actions}><Pressable disabled={!canVote} onPress={() => openVote(series)} style={[styles.primaryButton, !canVote && styles.disabled]}><Gavel size={16} color="#fffaf0" /><ThemedText style={styles.primaryButtonText}>{series.userVote ? text('Sửa phiếu', 'Edit vote') : text('Bỏ phiếu', 'Vote')}</ThemedText></Pressable>{isHead ? <Pressable onPress={() => setDecisionSeries(series)} style={styles.secondaryButton}><ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>{text('Quyết định cuối', 'Final decision')}</ThemedText></Pressable> : null}</View>
      </View>;
    }) : renderEmpty(text('Không còn tác phẩm chờ bỏ phiếu.', 'No series are awaiting votes.'))}
  </>;

  const renderMeetings = () => <>
    {sectionTitle(text('Cuộc họp của tôi', 'My meetings'), isHead ? <Pressable style={styles.compactPrimary} onPress={() => openMeeting()}><Plus size={15} color="#fffaf0" /><ThemedText style={styles.compactPrimaryText}>{text('Tạo họp', 'New meeting')}</ThemedText></Pressable> : undefined)}
    {meetings.length ? meetings.map((meeting) => <View key={meeting._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><View style={styles.row}><CalendarDays size={18} color="#52707b" /><View style={styles.grow}><ThemedText style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>{meeting.title}</ThemedText><ThemedText style={[styles.listMeta, { color: theme.textSecondary }]}>{meeting.dateTime ? new Date(meeting.dateTime).toLocaleString() : text('Chưa có thời gian', 'Time pending')}</ThemedText></View>{isHead ? <Pressable onPress={() => removeMeeting(meeting)}><Trash2 size={17} color="#a43a32" /></Pressable> : null}</View>{meeting.description ? <ThemedText style={[styles.helper, { color: theme.textSecondary }]}>{meeting.description}</ThemedText> : null}{meeting.location ? <ThemedText style={[styles.helper, { color: theme.textSecondary }]}><MapPin size={13} color="#52707b" /> {meeting.location}</ThemedText> : null}<ThemedText style={[styles.helper, { color: theme.textSecondary }]}><Users size={13} color="#52707b" /> {Array.isArray(meeting.participants) ? meeting.participants.length : 0} {text('thành viên', 'members')}</ThemedText></View>) : renderEmpty(text('Bạn chưa có cuộc họp nào.', 'You have no meetings.'))}
  </>;

  const renderRankings = () => <>
    {sectionTitle(text('Hiệu suất tác phẩm', 'Series performance'), <View style={styles.segment}><Segment label={text('Tuần', 'Week')} active={rankPeriod === 'weekly'} onPress={() => setRankPeriod('weekly')} /><Segment label={text('Tháng', 'Month')} active={rankPeriod === 'monthly'} onPress={() => setRankPeriod('monthly')} /></View>)}
    {rankings.length ? rankings.map((series, index) => <View key={series._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><View style={styles.row}><View style={styles.rank}><ThemedText style={styles.rankText}>#{series.rank || index + 1}</ThemedText></View><View style={styles.grow}><ThemedText style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>{series.title}</ThemedText><ThemedText style={[styles.listMeta, { color: theme.textSecondary }]}>{text('Điểm', 'Score')}: {Number(series.score || 0).toFixed(1)} · {series.riskLevel || text('Chưa xếp loại', 'Unclassified')}</ThemedText></View></View>{isHead && series.status === 'Active' ? <View style={styles.actions}><Pressable style={styles.secondaryButton} onPress={() => { setScheduleSeries(series); setNewSchedule(series.publicationSchedule === 'monthly' ? 'monthly' : 'weekly'); }}><ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>{text('Lịch xuất bản', 'Publication schedule')}</ThemedText></Pressable>{!series.cancellationReview ? <Pressable style={styles.warningButton} onPress={() => openMeeting('cancellation_review', series)}><ThemedText style={styles.warningButtonText}>{text('Mở review', 'Start review')}</ThemedText></Pressable> : null}</View> : null}</View>) : renderEmpty(text('Chưa có dữ liệu xếp hạng.', 'No ranking data.'))}
  </>;

  const renderCancellation = () => {
    const reviews = rankings.filter((series) => series.cancellationReview);
    return <>
      {sectionTitle(text('Bỏ phiếu ngừng phát hành', 'Cancellation votes'))}
      {reviews.length ? reviews.map((series) => {
        const review = series.cancellationReview;
        const canVote = Boolean(review?.isParticipant);
        return <View key={series._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><SimpleSeriesCard series={series} theme={theme} subtitle={`${text('Cancel', 'Cancel')}: ${review.cancelVotes || 0} · ${text('Continue', 'Continue')}: ${review.continueVotes || 0}`} /><ThemedText style={[styles.helper, { color: theme.textSecondary }]}>{review.title} · {review.votesCount || 0}/{review.participantsCount || 0} {text('phiếu', 'votes')}</ThemedText><View style={styles.actions}><Pressable disabled={!canVote} style={[styles.warningButton, !canVote && styles.disabled]} onPress={() => { setCancellationSeries(series); setCancellationAction(review.userVote || 'continue'); setCancellationComment(''); }}><ThemedText style={styles.warningButtonText}>{review.userVote ? text('Sửa phiếu', 'Edit vote') : text('Bỏ phiếu', 'Vote')}</ThemedText></Pressable>{isHead ? <Pressable style={styles.secondaryButton} onPress={() => { setFinalizeSeries(series); setFinalizeReason(''); }}><ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>{text('Chốt kết quả', 'Finalize')}</ThemedText></Pressable> : null}</View></View>;
      }) : renderEmpty(text('Chưa có review ngừng phát hành nào.', 'No cancellation reviews are open.'))}
    </>;
  };

  const renderAssign = () => <>{sectionTitle(text('Tác phẩm chưa có editor', 'Series without an editor'))}{unassigned.length ? unassigned.map((series) => <View key={series._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><SimpleSeriesCard series={series} theme={theme} subtitle={series.mangakaId?.displayName || text('Không rõ mangaka', 'Unknown mangaka')} /><Pressable style={styles.primaryButton} onPress={() => { setEditorSeries(series); setSelectedEditor(null); }}><UserRoundPlus size={16} color="#fffaf0" /><ThemedText style={styles.primaryButtonText}>{text('Chọn editor', 'Choose editor')}</ThemedText></Pressable></View>) : renderEmpty(text('Tất cả tác phẩm đã được phân editor.', 'Every series has an editor.'))}</>;

  const renderRubrics = () => <>{sectionTitle('Rubric criteria', <Pressable style={styles.compactPrimary} onPress={() => { setRubricName(''); setRubricCriteria('Art Style\nStorytelling'); setRubricOpen(true); }}><Plus size={15} color="#fffaf0" /><ThemedText style={styles.compactPrimaryText}>{text('Tạo mới', 'New')}</ThemedText></Pressable>)}{templates.length ? templates.map((template) => <View key={template._id} style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}><View style={styles.row}><View style={styles.grow}><ThemedText style={[styles.listTitle, { color: theme.text }]}>{template.name}</ThemedText><ThemedText style={[styles.helper, { color: theme.textSecondary }]}>{(template.criteria || []).map((item: any) => item.label).join(' · ')}</ThemedText></View>{template.isActive ? <View style={styles.activeBadge}><Check size={13} color="#357053" /><ThemedText style={styles.activeText}>{text('Đang dùng', 'Active')}</ThemedText></View> : <Pressable style={styles.secondaryButton} onPress={() => activateRubric(template._id)}><ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>{text('Kích hoạt', 'Activate')}</ThemedText></Pressable>}</View></View>) : renderEmpty(text('Chưa có rubric nào.', 'No rubrics yet.'))}</>;

  const content = tab === 'dashboard' ? renderDashboard() : tab === 'assign' ? renderAssign() : tab === 'votes' ? renderVotes() : tab === 'meetings' ? renderMeetings() : tab === 'rankings' ? renderRankings() : tab === 'cancellation' ? renderCancellation() : renderRubrics();

  return <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}><SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}><View style={styles.header}><View><ThemedText style={styles.eyebrow}>EDITORIAL BOARD</ThemedText><ThemedText type="title" style={[styles.title, { color: theme.text }]}>{text('Điều hành xuất bản', 'Publication control')}</ThemedText></View><Pressable onPress={() => void loadData(true)} style={[styles.refresh, { borderColor: theme.borderGlow }]}><ThemedText style={[styles.refreshText, { color: theme.text }]}>{refreshing ? '…' : text('Tải lại', 'Refresh')}</ThemedText></Pressable></View><ScrollView horizontal style={styles.tabScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>{tabs.filter((item) => item.show !== false).map((item) => { const Icon = item.icon; const active = tab === item.key; return <Pressable key={item.key} onPress={() => setTab(item.key)} style={[styles.tab, active && styles.tabActive]}><Icon size={15} color={active ? '#fffaf0' : theme.textSecondary} /><ThemedText numberOfLines={1} style={[styles.tabText, { color: active ? '#fffaf0' : theme.textSecondary }]}>{item.label}</ThemedText>{item.count ? <View style={[styles.tabBadge, active && styles.tabBadgeActive]}><ThemedText style={[styles.tabBadgeText, active && styles.tabBadgeTextActive]}>{item.count > 99 ? '99+' : item.count}</ThemedText></View> : null}</Pressable>; })}</ScrollView>{error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}<ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]} keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false}>{loading ? <ActivityIndicator size="large" color="#b94234" style={styles.loader} /> : content}</ScrollView></SafeAreaView>
    <BoardModal visible={Boolean(voteSeries)} onClose={() => setVoteSeries(null)} theme={theme}><ModalTitle title={text('Phiếu đánh giá', 'Evaluation vote')} theme={theme} onClose={() => setVoteSeries(null)} /><ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{voteSeries?.title}</ThemedText>{criteria.map((item: any) => <View key={item.key} style={styles.sliderRow}><View style={styles.row}><ThemedText style={[styles.label, { color: theme.text }]}>{item.label}</ThemedText><ThemedText style={styles.score}>{scores[item.key] ?? 5}/10</ThemedText></View><Slider minimumValue={1} maximumValue={10} step={1} value={scores[item.key] ?? 5} onValueChange={(value) => setScores((current) => ({ ...current, [item.key]: value }))} minimumTrackTintColor="#52707b" maximumTrackTintColor={theme.borderGlow} thumbTintColor="#52707b" /></View>)}<ThemedText style={[styles.helper, { color: theme.textSecondary }]}>{text('Điểm trung bình', 'Average score')}: {average.toFixed(1)}/10</ThemedText><TextInput value={voteComment} onChangeText={setVoteComment} maxLength={2000} multiline placeholder={text('Nhận xét cho mangaka', 'Comments for the mangaka')} placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.borderGlow }]} /><View style={styles.actions}><Pressable disabled={savingVote} onPress={() => void submitVote('rejected')} style={styles.rejectButton}><ThemedText style={styles.primaryButtonText}>{text('Yêu cầu sửa', 'Request changes')}</ThemedText></Pressable><Pressable disabled={savingVote} onPress={() => void submitVote('approved')} style={styles.approveButton}><ThemedText style={styles.primaryButtonText}>{savingVote ? '…' : text('Đồng ý', 'Approve')}</ThemedText></Pressable></View></BoardModal>
    <BoardModal visible={Boolean(decisionSeries)} onClose={() => setDecisionSeries(null)} theme={theme}><ModalTitle title={text('Quyết định cuối cùng', 'Final decision')} theme={theme} onClose={() => setDecisionSeries(null)} /><ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{decisionSeries?.title}</ThemedText><ThemedText style={[styles.label, { color: theme.text }]}>{text('Cách xuất bản nếu phê duyệt', 'Publishing when approved')}</ThemedText><View style={styles.actions}><Choice label={text('Ngay', 'Immediately')} active={publicationMode === 'immediate'} onPress={() => setPublicationMode('immediate')} /><Choice label={text('Lịch', 'Scheduled')} active={publicationMode === 'scheduled'} onPress={() => setPublicationMode('scheduled')} /></View>{publicationMode === 'scheduled' ? <><View style={styles.actions}><Choice label={text('Hàng tuần', 'Weekly')} active={publicationSchedule === 'weekly'} onPress={() => setPublicationSchedule('weekly')} /><Choice label={text('Hàng tháng', 'Monthly')} active={publicationSchedule === 'monthly'} onPress={() => setPublicationSchedule('monthly')} /></View><DateTimeField label={text('Thời điểm bắt đầu', 'Start time')} value={publicationStartAt} onChangeText={setPublicationStartAt} theme={theme} minimumDate={new Date()} /></> : null}<View style={styles.actions}><Pressable disabled={savingDecision} onPress={() => void submitFinalDecision('rejected')} style={styles.rejectButton}><ThemedText style={styles.primaryButtonText}>{text('Trả về sửa', 'Return')}</ThemedText></Pressable><Pressable disabled={savingDecision} onPress={() => void submitFinalDecision('approved')} style={styles.approveButton}><ThemedText style={styles.primaryButtonText}>{savingDecision ? '…' : text('Phê duyệt', 'Approve')}</ThemedText></Pressable></View></BoardModal>
    <BoardModal visible={meetingOpen} onClose={() => setMeetingOpen(false)} theme={theme}><ModalTitle title={text('Lập lịch họp', 'Schedule meeting')} theme={theme} onClose={() => setMeetingOpen(false)} /><View style={styles.actions}><Choice label={text('Review proposal', 'Proposal review')} active={meetingPurpose === 'proposal_review'} onPress={() => { setMeetingPurpose('proposal_review'); setMeetingSeriesIds([]); }} /><Choice label={text('Review ngừng', 'Cancellation')} active={meetingPurpose === 'cancellation_review'} onPress={() => { setMeetingPurpose('cancellation_review'); setMeetingSeriesIds([]); }} /></View><Input label={text('Tiêu đề', 'Title')} value={meetingTitle} onChangeText={setMeetingTitle} theme={theme} /><DateTimeField label={text('Thời gian', 'Time')} value={meetingDate} onChangeText={setMeetingDate} theme={theme} minimumDate={new Date()} /><Input label={text('Địa điểm', 'Location')} value={meetingLocation} onChangeText={setMeetingLocation} theme={theme} /><Input label={text('Mô tả', 'Description')} value={meetingDescription} onChangeText={setMeetingDescription} theme={theme} multiline /><ThemedText style={[styles.label, { color: theme.text }]}>{text('Tác phẩm', 'Series')}</ThemedText>{meetingCandidates.map((series) => <SelectRow key={series._id} label={series.title} active={meetingSeriesIds.includes(series._id)} onPress={() => toggleId(setMeetingSeriesIds, series._id)} theme={theme} />)}<ThemedText style={[styles.label, { color: theme.text }]}>{text('Thành viên EB (tổng: ', 'Board members (total: ')}{participantCount})</ThemedText>{boardMembers.filter((member) => member._id !== user?._id).map((member) => <SelectRow key={member._id} label={member.displayName || member.email} active={participantIds.includes(member._id)} onPress={() => toggleId(setParticipantIds, member._id)} theme={theme} />)}{meetingPurpose === 'proposal_review' ? <><ThemedText style={[styles.label, { color: theme.text }]}>Rubric</ThemedText>{templates.map((template) => <SelectRow key={template._id} label={template.name} active={rubricTemplateId === template._id} onPress={() => setRubricTemplateId(template._id)} theme={theme} />)}</> : null}<Pressable disabled={savingMeeting} onPress={() => void submitMeeting()} style={styles.primaryButton}><CalendarPlus size={16} color="#fffaf0" /><ThemedText style={styles.primaryButtonText}>{savingMeeting ? '…' : text('Tạo cuộc họp', 'Create meeting')}</ThemedText></Pressable></BoardModal>
    <BoardModal visible={Boolean(editorSeries)} onClose={() => setEditorSeries(null)} theme={theme}><ModalTitle title={text('Phân editor', 'Assign editor')} theme={theme} onClose={() => setEditorSeries(null)} /><ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{editorSeries?.title}</ThemedText>{editors.map((editor) => <SelectRow key={editor._id} label={`${editor.displayName || editor.email}${editor.email ? ` · ${editor.email}` : ''}`} active={selectedEditor?._id === editor._id} onPress={() => setSelectedEditor(editor)} theme={theme} />)}<Pressable disabled={!selectedEditor || assigning} onPress={() => void assignEditor()} style={[styles.primaryButton, !selectedEditor && styles.disabled]}><Send size={16} color="#fffaf0" /><ThemedText style={styles.primaryButtonText}>{assigning ? '…' : text('Gửi lời mời', 'Send invitation')}</ThemedText></Pressable></BoardModal>
    <BoardModal visible={Boolean(cancellationSeries)} onClose={() => setCancellationSeries(null)} theme={theme}><ModalTitle title={text('Phiếu ngừng phát hành', 'Cancellation vote')} theme={theme} onClose={() => setCancellationSeries(null)} /><ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{cancellationSeries?.title}</ThemedText><View style={styles.actions}><Choice label={text('Tiếp tục', 'Continue')} active={cancellationAction === 'continue'} onPress={() => setCancellationAction('continue')} /><Choice label={text('Ngừng', 'Cancel')} active={cancellationAction === 'cancel'} onPress={() => setCancellationAction('cancel')} /></View><Input label={text('Nhận xét', 'Comments')} value={cancellationComment} onChangeText={setCancellationComment} theme={theme} multiline /><Pressable disabled={savingCancellation} onPress={() => void submitCancellationVote()} style={styles.warningButton}><ThemedText style={styles.warningButtonText}>{savingCancellation ? '…' : text('Gửi phiếu', 'Submit vote')}</ThemedText></Pressable></BoardModal>
    <BoardModal visible={Boolean(finalizeSeries)} onClose={() => setFinalizeSeries(null)} theme={theme}><ModalTitle title={text('Chốt review ngừng phát hành', 'Finalize cancellation review')} theme={theme} onClose={() => setFinalizeSeries(null)} /><ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{finalizeSeries?.title}</ThemedText><Input label={text('Lý do (bắt buộc nếu quyết định ngừng)', 'Reason (required if cancellation wins)')} value={finalizeReason} onChangeText={setFinalizeReason} theme={theme} multiline /><Pressable disabled={savingFinalize} onPress={() => void finalizeCancellation()} style={styles.rejectButton}><ThemedText style={styles.primaryButtonText}>{savingFinalize ? '…' : text('Chốt kết quả', 'Finalize')}</ThemedText></Pressable></BoardModal>
    <BoardModal visible={Boolean(scheduleSeries)} onClose={() => setScheduleSeries(null)} theme={theme}><ModalTitle title={text('Lịch xuất bản', 'Publication schedule')} theme={theme} onClose={() => setScheduleSeries(null)} /><ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>{scheduleSeries?.title}</ThemedText><View style={styles.actions}><Choice label={text('Hàng tuần', 'Weekly')} active={newSchedule === 'weekly'} onPress={() => setNewSchedule('weekly')} /><Choice label={text('Hàng tháng', 'Monthly')} active={newSchedule === 'monthly'} onPress={() => setNewSchedule('monthly')} /></View><Pressable disabled={savingSchedule} onPress={() => void savePublicationSchedule()} style={styles.primaryButton}><ThemedText style={styles.primaryButtonText}>{savingSchedule ? '…' : text('Cập nhật lịch', 'Update schedule')}</ThemedText></Pressable></BoardModal>
    <BoardModal visible={rubricOpen} onClose={() => setRubricOpen(false)} theme={theme}><ModalTitle title={text('Tạo rubric', 'Create rubric')} theme={theme} onClose={() => setRubricOpen(false)} /><Input label={text('Tên rubric', 'Rubric name')} value={rubricName} onChangeText={setRubricName} theme={theme} /><Input label={text('Tiêu chí, mỗi dòng một mục', 'Criteria, one per line')} value={rubricCriteria} onChangeText={setRubricCriteria} theme={theme} multiline /><Pressable disabled={savingRubric} onPress={() => void createRubric()} style={styles.primaryButton}><ThemedText style={styles.primaryButtonText}>{savingRubric ? '…' : text('Tạo rubric', 'Create rubric')}</ThemedText></Pressable></BoardModal>
  </ThemedView>;
}

function SimpleSeriesCard({ series, theme, subtitle }: { series: any; theme: any; subtitle: string }) { return <View style={styles.row}><View style={styles.iconBox}><BookOpen size={17} color="#7a5a43" /></View><View style={styles.grow}><ThemedText style={[styles.listTitle, { color: theme.text }]} numberOfLines={1}>{series.title || 'Untitled'}</ThemedText><ThemedText style={[styles.listMeta, { color: theme.textSecondary }]} numberOfLines={2}>{subtitle}</ThemedText></View></View>; }
function Segment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.segmentItem, active && styles.segmentActive]}><ThemedText style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</ThemedText></Pressable>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={[styles.choice, active && styles.choiceActive]}><ThemedText style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</ThemedText></Pressable>; }
function BoardModal({ visible, onClose, theme, children }: { visible: boolean; onClose: () => void; theme: any; children: React.ReactNode }) {
  const swipeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy > 72 || gesture.vy > 0.7) onClose();
    },
  }), [onClose]);

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent><View style={styles.overlay}><Pressable accessibilityRole="button" accessibilityLabel="Close sheet" style={styles.backdropDismiss} onPress={onClose} /><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding}><View style={[styles.modal, { backgroundColor: theme.backgroundElement }]}><View {...swipeResponder.panHandlers} style={[styles.sheetHandleTouch, { backgroundColor: theme.backgroundElement }]}><View style={[styles.sheetHandle, { backgroundColor: theme.borderGlow }]} /></View><ScrollView contentContainerStyle={styles.modalContent} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>{children}</ScrollView></View></KeyboardAvoidingView></View></Modal>;
}
function ModalTitle({ title, onClose, theme }: { title: string; onClose: () => void; theme: any }) { return <View style={styles.modalHeader}><ThemedText style={[styles.modalTitle, { color: theme.text }]}>{title}</ThemedText><Pressable onPress={onClose} hitSlop={12}><X size={20} color={theme.textSecondary} /></Pressable></View>; }
function Input({ label, value, onChangeText, theme, multiline, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; theme: any; multiline?: boolean; keyboardType?: 'default' | 'number-pad' }) { return <View><ThemedText style={[styles.label, { color: theme.text }]}>{label}</ThemedText><TextInput value={value} onChangeText={onChangeText} maxLength={multiline ? 2000 : 200} multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.multiline, { color: theme.text, borderColor: theme.borderGlow }]} placeholderTextColor={theme.textSecondary} /></View>; }
function DateTimeField({ label, value, onChangeText, theme, minimumDate }: { label: string; value: string; onChangeText: (value: string) => void; theme: any; minimumDate?: Date }) {
  const [showIOSPicker, setShowIOSPicker] = useState(false);
  const parsed = new Date(value);
  const selectedDate = value && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
  const selectDate = (date: Date) => onChangeText(date.toISOString());
  const openAndroidPicker = () => {
    DateTimePickerAndroid.open({ value: selectedDate, mode: 'date', minimumDate, is24Hour: true, onChange: (event: DateTimePickerEvent, date?: Date) => {
      if (event.type !== 'set' || !date) return;
      const chosenDate = new Date(selectedDate);
      chosenDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
      DateTimePickerAndroid.open({ value: chosenDate, mode: 'time', is24Hour: true, onChange: (timeEvent: DateTimePickerEvent, time?: Date) => {
        if (timeEvent.type !== 'set' || !time) return;
        const dateTime = new Date(chosenDate);
        dateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);
        selectDate(dateTime);
      } });
    } });
  };
  return <View><ThemedText style={[styles.label, { color: theme.text }]}>{label}</ThemedText><Pressable accessibilityRole="button" onPress={() => Platform.OS === 'android' ? openAndroidPicker() : setShowIOSPicker(true)} style={[styles.dateTimeField, { borderColor: theme.borderGlow }]}><CalendarDays size={18} color="#7a5a43" /><ThemedText style={[styles.dateTimeValue, { color: value ? theme.text : theme.textSecondary }]}>{value ? selectedDate.toLocaleString() : 'Chọn ngày và giờ'}</ThemedText></Pressable>{Platform.OS === 'ios' && showIOSPicker ? <View style={[styles.iosPicker, { borderColor: theme.borderGlow }]}><DateTimePicker value={selectedDate} mode="datetime" display="spinner" minimumDate={minimumDate} onChange={(_event, date) => { if (date) selectDate(date); }} /><Pressable onPress={() => setShowIOSPicker(false)} style={styles.secondaryButton}><ThemedText style={[styles.secondaryButtonText, { color: theme.text }]}>Xong</ThemedText></Pressable></View> : null}</View>;
}
function SelectRow({ label, active, onPress, theme }: { label: string; active: boolean; onPress: () => void; theme: any }) { return <Pressable onPress={onPress} style={[styles.selectRow, { borderColor: theme.borderGlow }, active && styles.selectRowActive]}><View style={[styles.radio, active && styles.radioActive]}>{active ? <Check size={12} color="#fffaf0" /> : null}</View><ThemedText style={[styles.selectText, { color: theme.text }]} numberOfLines={2}>{label}</ThemedText></Pressable>; }

const styles = StyleSheet.create({
  screen: { flex: 1 }, safeArea: { flex: 1 }, header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.two, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, eyebrow: { color: '#7a5a43', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { fontSize: 24, lineHeight: 30, fontWeight: '900' }, refresh: { borderWidth: 1, minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 9 }, refreshText: { fontSize: 12, fontWeight: '800' }, tabScroll: { flexGrow: 0, flexShrink: 0, height: 52 }, tabBar: { minHeight: 52, alignItems: 'center', paddingHorizontal: Spacing.three, paddingVertical: 7, gap: 7 }, tab: { alignSelf: 'center', height: 38, paddingHorizontal: 12, borderRadius: 19, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(122,90,67,0.10)' }, tabActive: { backgroundColor: '#7a5a43' }, tabText: { fontSize: 11, fontWeight: '800' }, tabBadge: { minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: 'rgba(122,90,67,0.18)', alignItems: 'center', justifyContent: 'center' }, tabBadgeActive: { backgroundColor: 'rgba(255,250,240,0.22)' }, tabBadgeText: { color: '#7a5a43', fontSize: 9, lineHeight: 11, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center', fontWeight: '900' }, tabBadgeTextActive: { color: '#fffaf0' }, error: { color: '#a43a32', fontSize: 12, paddingHorizontal: Spacing.three, paddingBottom: 4 }, content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.two }, loader: { marginTop: 72 }, sectionHeading: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.one }, sectionTitle: { fontSize: 16, fontWeight: '900' }, metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, metric: { width: '48%', minHeight: 112, borderRadius: 14, borderWidth: 1, padding: 14, justifyContent: 'space-between' }, metricValue: { fontSize: 24, fontWeight: '900' }, metricLabel: { fontSize: 11, fontWeight: '700' }, empty: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, alignItems: 'center' }, listCard: { borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, card: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: 11 }, row: { flexDirection: 'row', alignItems: 'center', gap: 10 }, grow: { flex: 1, minWidth: 0 }, iconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eee2cf', alignItems: 'center', justifyContent: 'center' }, listTitle: { fontSize: 14, fontWeight: '900' }, listMeta: { fontSize: 12, lineHeight: 17, marginTop: 2 }, helper: { fontSize: 12, lineHeight: 18 }, voteStats: { flexDirection: 'row', gap: 12 }, approve: { color: '#357053', fontSize: 12, fontWeight: '900' }, reject: { color: '#a43a32', fontSize: 12, fontWeight: '900' }, actions: { flexDirection: 'row', gap: 8, alignItems: 'center' }, primaryButton: { flex: 1, minHeight: 43, borderRadius: 10, backgroundColor: '#7a5a43', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 }, primaryButtonText: { color: '#fffaf0', fontSize: 13, fontWeight: '900' }, secondaryButton: { minHeight: 40, borderRadius: 10, borderWidth: 1, borderColor: '#cbbda5', paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' }, secondaryButtonText: { fontSize: 12, fontWeight: '800' }, compactPrimary: { minHeight: 32, borderRadius: 8, paddingHorizontal: 9, backgroundColor: '#7a5a43', flexDirection: 'row', alignItems: 'center', gap: 4 }, compactPrimaryText: { color: '#fffaf0', fontSize: 11, fontWeight: '900' }, warningButton: { flex: 1, minHeight: 40, borderRadius: 10, backgroundColor: '#a97822', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, warningButtonText: { color: '#fffaf0', fontSize: 12, fontWeight: '900' }, disabled: { opacity: 0.42 }, link: { color: '#7a5a43', fontSize: 12, fontWeight: '900' }, segment: { flexDirection: 'row', borderRadius: 9, overflow: 'hidden', backgroundColor: 'rgba(122,90,67,0.10)' }, segmentItem: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 9 }, segmentActive: { backgroundColor: '#7a5a43' }, segmentText: { color: '#59615b', fontSize: 11, fontWeight: '800' }, segmentTextActive: { color: '#fffaf0' }, rank: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eee2cf', alignItems: 'center', justifyContent: 'center' }, rankText: { color: '#7a5a43', fontSize: 11, fontWeight: '900' }, activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 7, borderRadius: 9, backgroundColor: 'rgba(53,112,83,0.12)' }, activeText: { color: '#357053', fontSize: 11, fontWeight: '900' }, overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(28,41,40,0.48)' }, backdropDismiss: { ...StyleSheet.absoluteFillObject }, keyboardAvoiding: { flex: 1, width: '100%', justifyContent: 'flex-end' }, modal: { maxHeight: '92%', width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingHorizontal: Spacing.three, paddingBottom: Spacing.three }, sheetHandleTouch: { height: 28, marginTop: -10, marginBottom: 2, alignItems: 'center', justifyContent: 'center' }, sheetHandle: { width: 36, height: 4, borderRadius: 2 }, modalContent: { gap: 12, paddingBottom: Spacing.four }, modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, modalTitle: { fontSize: 18, fontWeight: '900' }, modalSubtitle: { fontSize: 13, lineHeight: 19 }, label: { fontSize: 12, fontWeight: '900', marginTop: 4, marginBottom: 6 }, sliderRow: { gap: 2 }, score: { color: '#52707b', fontSize: 13, fontWeight: '900' }, input: { minHeight: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8, fontSize: 14 }, dateTimeField: { minHeight: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 9 }, dateTimeValue: { flex: 1, fontSize: 14 }, iosPicker: { borderWidth: 1, borderRadius: 10, marginTop: 8, overflow: 'hidden' }, multiline: { minHeight: 72, textAlignVertical: 'top' }, rejectButton: { flex: 1, minHeight: 43, borderRadius: 10, backgroundColor: '#a43a32', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, approveButton: { flex: 1, minHeight: 43, borderRadius: 10, backgroundColor: '#357053', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, choice: { flex: 1, minHeight: 38, borderRadius: 9, borderWidth: 1, borderColor: '#cbbda5', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, choiceActive: { backgroundColor: '#7a5a43', borderColor: '#7a5a43' }, choiceText: { color: '#59615b', fontSize: 12, fontWeight: '800' }, choiceTextActive: { color: '#fffaf0' }, selectRow: { minHeight: 42, borderWidth: 1, borderRadius: 9, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7 }, selectRowActive: { borderColor: '#7a5a43', backgroundColor: '#f3ddd2' }, radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#7a5a43', alignItems: 'center', justifyContent: 'center' }, radioActive: { backgroundColor: '#7a5a43' }, selectText: { flex: 1, fontSize: 12, fontWeight: '700' },
});

export default withProtectedEditorialBoardRoute(EditorialBoardScreen);
