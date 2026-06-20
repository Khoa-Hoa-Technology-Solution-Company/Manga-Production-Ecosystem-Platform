import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CheckCircle, Clock, FileText, UploadCloud, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { tasksAPI } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withProtectedReaderRoute } from '@/components/protected-route';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function TasksScreen() {
  const theme = useTheme();
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
  const [simulatedProgress, setSimulatedProgress] = useState(0);

  useEffect(() => {
    loadTasks();
  }, [user?._id]);

  const loadTasks = () => {
    setLoading(true);
    setError(null);
    tasksAPI.getAll()
      .then(data => {
        // Filter tasks assigned to me OR open tasks (available)
        const myTasks = (data?.tasks || []).filter(t => {
          const assigneeId = typeof t.assigneeId === 'object' ? t.assigneeId?._id : t.assigneeId;
          return assigneeId === user?._id || t.status === 'open';
        });
        setTasks(myTasks);
      })
      .catch(err => {
        setError(err.message || 'Không thể tải danh sách công việc.');
      })
      .finally(() => setLoading(false));
  };

  const handleAcceptTask = (id: string) => {
    tasksAPI.accept(id)
      .then(() => {
        Alert.alert('Thành công', 'Đã nhận công việc!');
        loadTasks();
      })
      .catch(err => Alert.alert('Lỗi', err.message));
  };

  const handleUpdateStatus = (id: string, newStatus: string) => {
    tasksAPI.updateStatus(id, newStatus)
      .then(() => loadTasks())
      .catch(err => Alert.alert('Lỗi', err.message));
  };

  const openSubmitModal = (task: any) => {
    setSelectedTask(task);
    setShowSubmitModal(true);
    setSimulatedProgress(0);
  };

  const handleSubmitTask = () => {
    if (!selectedTask) return;
    setUploading(true);
    
    // Simulate File Upload Progress in Mobile
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      setSimulatedProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        const formData = new FormData();
        formData.append('file', {
          uri: 'https://picsum.photos/seed/task/600/800',
          name: 'submission.jpg',
          type: 'image/jpeg',
        } as any);

        tasksAPI.submit(selectedTask._id, formData)
          .then(() => {
            Alert.alert('Thành công', 'Đã nộp kết quả công việc thành công!');
            setShowSubmitModal(false);
            loadTasks();
          })
          .catch(err => Alert.alert('Lỗi', err.message))
          .finally(() => setUploading(false));
      }
    }, 200);
  };

  const filteredTasks = tasks.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'open') return t.status === 'open';
    if (activeTab === 'progress') return t.status === 'assigned' || t.status === 'in_progress';
    if (activeTab === 'review') return t.status === 'review';
    if (activeTab === 'completed') return t.status === 'completed' || t.status === 'approved';
    return true;
  });

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>TRỢ LÝ SÁNG TÁC</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>Trung tâm Việc làm</ThemedText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'open', label: 'Việc mới' },
              { id: 'progress', label: 'Đang làm' },
              { id: 'review', label: 'Đang duyệt' },
              { id: 'completed', label: 'Hoàn thành' },
            ].map(tab => (
              <Pressable 
                key={tab.id}
                style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.id as any)}
              >
                <ThemedText style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {error && (
            <View style={styles.errorBanner}>
               <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="large" color="#38bdf8" style={{ marginTop: 50 }} />
          ) : filteredTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <CheckCircle size={48} color="#64748b" />
              <ThemedText style={styles.emptyText}>Không có công việc nào trong mục này.</ThemedText>
            </View>
          ) : (
            filteredTasks.map(task => (
              <View key={task._id} style={styles.taskCard}>
                <View style={styles.taskHeader}>
                  <ThemedText style={styles.taskTitle}>{task.title || 'Untitled Task'}</ThemedText>
                </View>
                
                <ThemedText style={styles.taskDesc} numberOfLines={3}>{task.description || 'Không có mô tả'}</ThemedText>
                
                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Clock size={12} color="#94a3b8" />
                    <ThemedText style={styles.metaText}>
                      Hạn chót: {task.dueDate ? new Date(task.dueDate).toLocaleDateString('vi-VN') : '1 ngày'}
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <FileText size={12} color="#94a3b8" />
                    <ThemedText style={styles.metaText}>{task.type || 'Chung'}</ThemedText>
                  </View>
                </View>

                {/* Status Specific Actions */}
                {task.status === 'open' && (
                  <Pressable style={[styles.actionBtn, { backgroundColor: '#3b82f6' }]} onPress={() => handleAcceptTask(task._id)}>
                    <ThemedText style={styles.actionBtnText}>Nhận Việc Này</ThemedText>
                  </Pressable>
                )}

                {(task.status === 'assigned' || task.status === 'in_progress') && (
                  <View style={styles.actionRow}>
                    <Pressable style={[styles.actionBtnSecondary, { flex: 1 }]} onPress={() => handleUpdateStatus(task._id, 'in_progress')}>
                      <ThemedText style={styles.actionBtnTextSecondary}>Đang làm</ThemedText>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, { backgroundColor: '#10b981', flex: 2 }]} onPress={() => openSubmitModal(task)}>
                      <UploadCloud size={16} color="#fff" style={{ marginRight: 6 }} />
                      <ThemedText style={styles.actionBtnText}>Nộp Kết Quả</ThemedText>
                    </Pressable>
                  </View>
                )}

                {task.status === 'review' && (
                  <View style={[styles.actionBtn, { backgroundColor: '#f59e0b', opacity: 0.8 }]}>
                    <ThemedText style={styles.actionBtnText}>Đang chờ duyệt</ThemedText>
                  </View>
                )}
                
                {(task.status === 'completed' || task.status === 'approved') && (
                  <View style={[styles.actionBtn, { backgroundColor: '#22c55e', opacity: 0.8 }]}>
                    <CheckCircle size={16} color="#fff" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.actionBtnText}>Đã hoàn thành</ThemedText>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nộp Kết Quả</ThemedText>
              <Pressable onPress={() => !uploading && setShowSubmitModal(false)}><X color="#fff" /></Pressable>
            </View>
            <ThemedText style={styles.modalDesc}>Nộp file hình ảnh kết quả công việc để Mangaka/Editor duyệt.</ThemedText>
            
            <View style={styles.uploadArea}>
              <UploadCloud size={40} color="#94a3b8" />
              <ThemedText style={styles.uploadText}>Nhấn để chọn file ảnh từ máy</ThemedText>
            </View>

            {uploading && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${simulatedProgress}%` }]} />
                </View>
                <ThemedText style={styles.progressText}>Đang tải lên... {simulatedProgress}%</ThemedText>
              </View>
            )}

            <Pressable style={[styles.primaryBtn, { marginTop: 20 }]} onPress={handleSubmitTask} disabled={uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryBtnText}>Xác nhận nộp</ThemedText>}
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
  headerSubtitle: { color: '#38bdf8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#fb7185', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  


  tabScroll: { marginBottom: 16, maxHeight: 40 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8 },
  tabBtnActive: { backgroundColor: '#38bdf8' },
  tabText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#0f172a', fontWeight: '800' },

  taskCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  taskTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, paddingRight: 10 },
  taskDesc: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#94a3b8', fontSize: 12 },
  
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  actionBtnTextSecondary: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e1b4b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
  uploadArea: { height: 120, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 20 },
  uploadText: { color: '#94a3b8', fontSize: 13, marginTop: 10 },
  primaryBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  progressContainer: { marginTop: 10, marginBottom: 10 },
  progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#10b981' },
  progressText: { color: '#94a3b8', fontSize: 12, marginTop: 6, textAlign: 'right' },
});

export default withProtectedReaderRoute(TasksScreen);

