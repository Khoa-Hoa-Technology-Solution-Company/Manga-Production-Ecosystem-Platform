import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Dimensions, ImageBackground, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, X, Send, MapPin, MessageSquare } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { pagesAPI, annotationsAPI, approvalAPI, getImageUrl } from '@/lib/api';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withProtectedEditorRoute } from '@/components/protected-route';

const { width: screenWidth } = Dimensions.get('window');

function ReviewChapterScreen() {
  const { id: chapterId } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [pages, setPages] = useState<any[]>([]);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Annotation Modal State
  const [showAnnoModal, setShowAnnoModal] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [annoCoord, setAnnoCoord] = useState({ x: 0, y: 0 });
  const [annoText, setAnnoText] = useState('');

  // Decision Modal State
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState('approved');
  const [decisionComment, setDecisionComment] = useState('');

  useEffect(() => {
    if (chapterId) {
      loadData();
    }
  }, [chapterId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pagesRes, annoRes] = await Promise.all([
        pagesAPI.getByChapter(chapterId),
        annotationsAPI.getByChapter(chapterId, 'review').catch(() => ({ annotations: [] }))
      ]);
      setPages(pagesRes.pages || []);
      setAnnotations(annoRes.annotations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageTap = (ev: any, pageId: string) => {
    const { locationX, locationY } = ev.nativeEvent;
    setSelectedPageId(pageId);
    setAnnoCoord({ x: locationX, y: locationY });
    setShowAnnoModal(true);
    setAnnoText('');
  };

  const saveAnnotation = async () => {
    if (!annoText.trim()) return;
    try {
      await annotationsAPI.create({
        chapterId,
        pageId: selectedPageId,
        x: annoCoord.x,
        y: annoCoord.y,
        note: annoText,
        source: 'review'
      });
      setShowAnnoModal(false);
      loadData(); // reload annotations
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const submitDecision = async () => {
    try {
      await approvalAPI.editorDecision(chapterId, {
        decision: decisionType,
        comments: decisionComment,
        annotations
      });
      Alert.alert('Thành công', 'Đã lưu quyết định biên tập.');
      setShowDecisionModal(false);
      router.back();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Duyệt Bản Thảo</ThemedText>
          <Pressable style={styles.actionBtn} onPress={() => setShowDecisionModal(true)}>
            <ThemedText style={styles.actionBtnText}>Quyết định</ThemedText>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#a855f7" style={{ marginTop: 50 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <ThemedText style={styles.helperText}>Chạm vào hình ảnh để thả ghim nhận xét (Annotation).</ThemedText>
            
            {pages.map((page, index) => {
              const pageAnnotations = annotations.filter(a => a.pageId === page._id);
              return (
                <View key={page._id} style={styles.pageWrapper}>
                  <ThemedText style={styles.pageNum}>Trang {index + 1}</ThemedText>
                  
                  <Pressable onPress={(e) => handleImageTap(e, page._id)}>
                    <ImageBackground
                      source={{ uri: getImageUrl(page.imageUrl) || `https://picsum.photos/seed/${page._id}/600/800` }}
                      style={styles.pageImage}
                      imageStyle={{ borderRadius: 12 }}
                    >
                      {/* Render Annotations for this page */}
                      {pageAnnotations.map((anno) => (
                        <View key={anno._id} style={[styles.annotationPin, { left: anno.x - 12, top: anno.y - 12 }]}>
                          <MapPin size={24} color="#f43f5e" />
                        </View>
                      ))}
                    </ImageBackground>
                  </Pressable>

                  {/* List comments below page */}
                  {pageAnnotations.length > 0 && (
                    <View style={styles.commentsList}>
                      {pageAnnotations.map(anno => (
                        <View key={anno._id} style={styles.commentItem}>
                          <MessageSquare size={14} color="#a855f7" />
                          <ThemedText style={styles.commentText}>{anno.note}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>

      {/* Annotation Modal */}
      <Modal visible={showAnnoModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Thêm Nhận Xét</ThemedText>
              <Pressable onPress={() => setShowAnnoModal(false)}><X color="#fff" /></Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Nhập nội dung cần sửa đổi..."
              placeholderTextColor="#64748b"
              value={annoText}
              onChangeText={setAnnoText}
              multiline
            />
            <Pressable style={styles.primaryBtn} onPress={saveAnnotation}>
              <ThemedText style={styles.primaryBtnText}>Thả Ghim</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Decision Modal */}
      <Modal visible={showDecisionModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Quyết định kiểm duyệt</ThemedText>
              <Pressable onPress={() => setShowDecisionModal(false)}><X color="#fff" /></Pressable>
            </View>

            <View style={styles.decisionRow}>
              <Pressable 
                style={[styles.decisionBtn, decisionType === 'approved' && styles.decisionBtnActive]} 
                onPress={() => setDecisionType('approved')}
              >
                <Check size={20} color={decisionType === 'approved' ? '#fff' : '#64748b'} />
                <ThemedText style={[styles.decisionText, decisionType === 'approved' && { color: '#fff' }]}>Duyệt</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.decisionBtn, decisionType === 'submit_eb' && styles.decisionBtnActiveEB]} 
                onPress={() => setDecisionType('submit_eb')}
              >
                <Send size={20} color={decisionType === 'submit_eb' ? '#fff' : '#64748b'} />
                <ThemedText style={[styles.decisionText, decisionType === 'submit_eb' && { color: '#fff' }]}>Gửi EB</ThemedText>
              </Pressable>
              
              <Pressable 
                style={[styles.decisionBtn, decisionType === 'rejected' && styles.decisionBtnActiveReject]} 
                onPress={() => setDecisionType('rejected')}
              >
                <X size={20} color={decisionType === 'rejected' ? '#fff' : '#64748b'} />
                <ThemedText style={[styles.decisionText, decisionType === 'rejected' && { color: '#fff' }]}>Từ chối</ThemedText>
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Lời nhắn cho Mangaka..."
              placeholderTextColor="#64748b"
              value={decisionComment}
              onChangeText={setDecisionComment}
              multiline
            />
            
            <Pressable style={styles.primaryBtn} onPress={submitDecision}>
              <ThemedText style={styles.primaryBtnText}>Xác nhận & Gửi</ThemedText>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  backBtn: { padding: 8 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  actionBtn: { backgroundColor: '#a855f7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  content: { padding: Spacing.three, paddingBottom: 100 },
  helperText: { color: '#94a3b8', fontSize: 13, textAlign: 'center', marginBottom: 16 },
  
  pageWrapper: { marginBottom: 30 },
  pageNum: { color: '#cbd5e1', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  pageImage: { width: screenWidth - Spacing.three * 2, height: (screenWidth - Spacing.three * 2) * 1.5, borderRadius: 12, overflow: 'hidden' },
  annotationPin: { position: 'absolute', width: 24, height: 24 },
  
  commentsList: { marginTop: 8, gap: 8 },
  commentItem: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, gap: 8 },
  commentText: { color: '#cbd5e1', fontSize: 13, flex: 1, lineHeight: 18 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e1b4b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#a855f7', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  decisionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  decisionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginHorizontal: 4, borderWidth: 1, borderColor: 'transparent' },
  decisionBtnActive: { backgroundColor: 'rgba(34,197,94,0.2)', borderColor: '#22c55e' },
  decisionBtnActiveEB: { backgroundColor: 'rgba(168,85,247,0.2)', borderColor: '#a855f7' },
  decisionBtnActiveReject: { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#ef4444' },
  decisionText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', marginTop: 4 }
});

export default withProtectedEditorRoute(ReviewChapterScreen);

