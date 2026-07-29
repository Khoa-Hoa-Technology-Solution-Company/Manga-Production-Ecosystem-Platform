import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle, Clock, FileText, UploadCloud, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { tasksAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withProtectedReaderRoute } from '@/components/protected-route';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';

function TasksScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'progress' | 'review' | 'completed'>('all');

  // Submit Task Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const loadTasks = useCallback(() => {
    setLoading(true);
    setError(null);
    tasksAPI.getAll()
      .then(data => {
        // Assistants may take open tasks. Creators only see tasks already assigned to them.
        const myTasks = (Array.isArray(data?.tasks) ? data.tasks : []).filter(t => {
          const assigneeId = typeof t.assignedTo === 'object' ? t.assignedTo?._id : t.assignedTo;
          return assigneeId === user?._id || (user?.role === 'assistant' && t.status === 'open');
        });
        setTasks(myTasks);
      })
      .catch(err => {
        setError(err.message || t('mobile.tasks.loadError'));
      })
      .finally(() => setLoading(false));
  }, [t, user?._id, user?.role]);

  const handleAcceptTask = (id: string) => {
    tasksAPI.accept(id)
      .then(() => {
        Alert.alert(t('common.success'), t('mobile.tasks.accepted'));
        loadTasks();
      })
      .catch(err => Alert.alert(t('common.error'), err.message));
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    tasksAPI.updateStatus(id, newStatus)
      .then(() => loadTasks())
      .catch(err => Alert.alert(t('common.error'), err.message));
  };

  const openSubmitModal = (task: any) => {
    setSelectedTask(task);
    setShowSubmitModal(true);
  };

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const handleSubmitTask = () => {
    if (!selectedTask) return;
    setUploading(true);
    
    // Do not submit a fabricated remote image. Until a native file picker is wired in,
    // transition the real task to review and let the web studio attach the file.
    tasksAPI.updateStatus(selectedTask._id, 'review')
      .then(() => {
        Alert.alert(t('common.success'), t('mobile.tasks.submitted'));
        setShowSubmitModal(false);
        loadTasks();
      })
      .catch(err => Alert.alert(t('common.error'), err.message))
      .finally(() => setUploading(false));
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'progress') return t.status === 'assigned' || t.status === 'in_progress';
    if (activeTab === 'review') return t.status === 'review';
    if (activeTab === 'completed') return t.status === 'done';
    return true;
  });

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{t('mobile.tasks.eyebrow')}</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>{t('mobile.tasks.title')}</ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.five }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            {[
              { id: 'all', label: t('mobile.tasks.all') },
              { id: 'open', label: t('mobile.tasks.open') },
              { id: 'progress', label: t('mobile.tasks.progress') },
              { id: 'review', label: t('mobile.tasks.review') },
              { id: 'completed', label: t('mobile.tasks.completed') },
            ].map(tab => (
              <Pressable 
                key={tab.id}
                style={[
                  styles.tabBtn,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow },
                  activeTab === tab.id && [styles.tabBtnActive, { borderColor: theme.text }],
                ]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <ThemedText style={[styles.tabText, { color: activeTab === tab.id ? theme.text : theme.textSecondary }]}>{tab.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {error && (
            <View style={styles.errorBanner}>
               <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#4e8190" style={{ marginTop: 50 }} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary" style={styles.emptyText}>{t('mobile.tasks.empty')}</ThemedText>
            </View>
          ) : (
            filteredTasks.map(task => (
              <View key={task._id} style={[styles.taskCard, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
                <View style={styles.taskHeader}>
                  <ThemedText style={styles.taskTitle}>{task.title || t('mobile.tasks.untitled')}</ThemedText>
                </View>
                
                <ThemedText themeColor="textSecondary" style={styles.taskDesc} numberOfLines={3}>{task.description || t('mobile.tasks.noDescription')}</ThemedText>
                
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color={theme.textSecondary} />
                    <ThemedText themeColor="textSecondary" style={styles.metaText}>
                      {t('mobile.tasks.deadline', { date: task.deadline ? new Date(task.deadline).toLocaleDateString() : t('mobile.tasks.oneDay') })}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <FileText size={12} color={theme.textSecondary} />
                    <ThemedText themeColor="textSecondary" style={styles.metaText}>{task.type || t('mobile.tasks.general')}</ThemedText>
                  </View>
                </View>

                {/* Status Specific Actions */}
                {task.status === 'open' && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#3d7183' }]} onPress={() => handleAcceptTask(task._id)}>
                    <ThemedText style={styles.actionBtnText}>{t('mobile.tasks.accept')}</ThemedText>
                  </Pressable>
                )}

                {task.status === 'assigned' && (
                  <Pressable style={[styles.actionBtnSecondary, { backgroundColor: theme.backgroundSelected, borderColor: theme.borderGlow }]} onPress={() => handleUpdateStatus(task._id, 'in_progress')}>
                    <ThemedText style={[styles.actionBtnTextSecondary, { color: theme.text }]}>{t('mobile.tasks.working')}</ThemedText>
                  </Pressable>
                )}

                {task.status === 'in_progress' && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#357053' }]} onPress={() => openSubmitModal(task)}>
                    <UploadCloud size={16} color="#fffaf0" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.actionBtnText}>{t('mobile.tasks.submitResult')}</ThemedText>
                  </Pressable>
                )}

                {task.status === 'review' && (
                  <View style={[styles.actionBtn, { backgroundColor: '#a97822', opacity: 0.8 }]}>
                    <ThemedText style={styles.actionBtnText}>{t('mobile.tasks.waitingReview')}</ThemedText>
                  </View>
                )}
                
                {task.status === 'done' && (
                  <View style={[styles.actionBtn, { backgroundColor: '#357053', opacity: 0.8 }]}>
                    <CheckCircle size={16} color="#fffaf0" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.actionBtnText}>{t('mobile.tasks.completedLabel')}</ThemedText>
                  </View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Submit Modal */}
      <Modal visible={showSubmitModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundElement, borderColor: theme.borderGlow }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{t('mobile.tasks.modalTitle')}</ThemedText>
              <Pressable onPress={() => !uploading && setShowSubmitModal(false)}><X color={theme.text} /></Pressable>
            </View>
            <ThemedText themeColor="textSecondary" style={styles.modalDesc}>{t('mobile.tasks.modalDescription')}</ThemedText>
            
            <Pressable style={[styles.primaryBtn, { marginTop: 20 }]} onPress={handleSubmitTask} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fffaf0" /> : <ThemedText style={styles.primaryBtnText}>{t('mobile.tasks.confirmSubmit')}</ThemedText>}
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
  headerSubtitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, lineHeight: 32, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(185,66,52,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#c85745', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { fontSize: 14 },
  


  tabScroll: { marginBottom: 16, maxHeight: 40 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  tabBtnActive: { borderWidth: 1 },
  tabText: { fontSize: 13, fontWeight: '600' },

  taskCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { fontSize: 16, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  taskDesc: { fontSize: 13, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnSecondary: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  actionBtnText: { color: '#fffaf0', fontSize: 14, fontWeight: 'bold' },
  actionBtnTextSecondary: { fontSize: 14, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(28,41,40,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 20, borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalDesc: { fontSize: 13, marginBottom: 16 },
  uploadArea: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,250,240,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,250,240,0.02)', marginBottom: 20 },
  uploadText: { color: '#9aa39a', fontSize: 13, marginTop: 10 },
  primaryBtn: { backgroundColor: '#357053', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fffaf0', fontSize: 16, fontWeight: 'bold' },
  
  progressContainer: { marginTop: 10, marginBottom: 10 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,250,240,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#357053' },
  progressText: { color: '#9aa39a', fontSize: 12, marginTop: 6, textAlign: 'right' },
});

export default withProtectedReaderRoute(TasksScreen);

