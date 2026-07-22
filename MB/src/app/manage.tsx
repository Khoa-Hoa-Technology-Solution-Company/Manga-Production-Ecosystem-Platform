import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, BookOpen, Clock, X, Search, ChevronLeft, Trash2, Edit2, Users, Send } from 'lucide-react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { seriesAPI, chaptersAPI, authAPI, getImageUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { withProtectedMangakaRoute } from '@/components/protected-route';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { SERIES_TAG_OPTIONS, formatSeriesTag } from '@/constants/series-tags';
import { useTheme } from '@/hooks/use-theme';

function ManageScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Detail View State
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Forms State
  const [showSeriesForm, setShowSeriesForm] = useState(false);
  const [editingSeries, setEditingSeries] = useState<any>(null);
  const [seriesTitle, setSeriesTitle] = useState('');
  const [seriesDescription, setSeriesDescription] = useState('');
  const [seriesTags, setSeriesTags] = useState<string[]>(['action', 'fantasy']);
  const [seriesCoverUrl, setSeriesCoverUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<any>(null);
  const [chapterNumber, setChapterNumber] = useState('');
  const [chapterTitle, setChapterTitle] = useState('');

  // Assistants State
  const [showAssistantsModal, setShowAssistantsModal] = useState(false);
  const [dedicatedAssistants, setDedicatedAssistants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const selectedSeries = useMemo(() => seriesList.find((s) => s._id === selectedSeriesId), [seriesList, selectedSeriesId]);

  useEffect(() => {
    loadMySeries();
  }, [user?._id]);

  useEffect(() => {
    if (selectedSeriesId) {
      loadChapters(selectedSeriesId);
      loadAssistants(selectedSeriesId);
    }
  }, [selectedSeriesId]);

  const loadMySeries = () => {
    setLoading(true);
    setError(null);
    seriesAPI.getAll()
      .then(data => {
        const mySeries = (data?.series || []).filter(s => {
          const ownerId = typeof s.mangakaId === 'object' ? s.mangakaId?._id : s.mangakaId;
          return ownerId === user?._id;
        });
        setSeriesList(mySeries);
      })
      .catch(err => {
        setError(err.message || 'Không thể tải danh sách truyện.');
      })
      .finally(() => setLoading(false));
  };

  const loadChapters = (sId: string) => {
    setLoadingChapters(true);
    chaptersAPI.getBySeries(sId)
      .then(res => setChapters(res.chapters || []))
      .catch(console.error)
      .finally(() => setLoadingChapters(false));
  };

  const loadAssistants = (sId: string) => {
    seriesAPI.getDedicatedAssistants(sId)
      .then(res => setDedicatedAssistants(res.dedicatedAssistants || []))
      .catch(console.error);
  };

  const openSeriesForm = (series?: any) => {
    if (series) {
      setEditingSeries(series);
      setSeriesTitle(series.title || '');
      setSeriesDescription(series.description || '');
      const existingTags = Array.isArray(series.tags) && series.tags.length > 0
        ? series.tags
        : Array.isArray(series.genre)
          ? series.genre
          : typeof series.genre === 'string' ? series.genre.split(',') : [];
      setSeriesTags(existingTags.map((tag: string) => tag.toLowerCase().trim()).filter(Boolean));
      setSeriesCoverUrl(series.coverImage || '');
    } else {
      setEditingSeries(null);
      setSeriesTitle('');
      setSeriesDescription('');
      setSeriesTags(['action', 'fantasy']);
      setSeriesCoverUrl('');
    }
    setShowSeriesForm(true);
  };

  const saveSeries = async () => {
    if (!seriesTitle.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập tên truyện');
    if (seriesTags.length === 0) return Alert.alert('Lỗi', 'Vui lòng chọn ít nhất một tag');
    setSaving(true);
    try {
      const data = {
        title: seriesTitle,
        description: seriesDescription,
        tags: seriesTags,
        coverImage: seriesCoverUrl,
      };
      if (editingSeries) {
        await seriesAPI.update(editingSeries._id, data);
        Alert.alert('Thành công', 'Đã cập nhật tác phẩm');
      } else {
        await seriesAPI.create(data);
        Alert.alert('Thành công', 'Đã tạo tác phẩm mới');
      }
      setShowSeriesForm(false);
      loadMySeries();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Có lỗi xảy ra');
    } finally {
      setSaving(false);
    }
  };

  const deleteSeries = async (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa tác phẩm này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await seriesAPI.delete(id);
          setSelectedSeriesId(null);
          loadMySeries();
        } catch (err: any) {
          Alert.alert('Lỗi', err.message);
        }
      }}
    ]);
  };

  const openChapterForm = (chapter?: any) => {
    if (chapter) {
      setEditingChapter(chapter);
      setChapterNumber(chapter.chapterNumber?.toString() || '');
      setChapterTitle(chapter.title || '');
    } else {
      setEditingChapter(null);
      setChapterNumber((chapters.length + 1).toString());
      setChapterTitle(`Chương ${chapters.length + 1}`);
    }
    setShowChapterForm(true);
  };

  const saveChapter = async () => {
    if (!selectedSeriesId || !chapterNumber || !chapterTitle) return;
    setSaving(true);
    try {
      if (editingChapter) {
        await chaptersAPI.update(editingChapter._id, {
          chapterNumber: Number(chapterNumber),
          title: chapterTitle
        });
      } else {
        await chaptersAPI.create(selectedSeriesId, {
          chapterNumber: Number(chapterNumber),
          title: chapterTitle
        });
      }
      setShowChapterForm(false);
      loadChapters(selectedSeriesId);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteChapter = async (id: string) => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa chương này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await chaptersAPI.delete(id);
          loadChapters(selectedSeriesId!);
        } catch (err: any) {
          Alert.alert('Lỗi', err.message);
        }
      }}
    ]);
  };

  const handleSubmitSeries = async () => {
    if (!selectedSeriesId) return;
    setSaving(true);
    try {
      await seriesAPI.submitToEditor(selectedSeriesId);
      Alert.alert('Thành công', 'Tác phẩm đã được gửi sang hàng chờ phân công biên tập.');
      loadMySeries();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitChapterReview = async (chapterId: string) => {
    setSaving(true);
    try {
      await chaptersAPI.submitForReview(chapterId);
      Alert.alert('Thành công', 'Chapter đã được gửi cho editor duyệt.');
      if (selectedSeriesId) loadChapters(selectedSeriesId);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setSaving(false);
    }
  };

  const searchAssistants = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 2) return setSearchResults([]);
    setSearching(true);
    try {
      const res = await authAPI.search(text);
      setSearchResults((res.users || []).filter((u: any) => u.role === 'assistant'));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleAddAssistant = async (userId: string) => {
    if (!selectedSeriesId) return;
    try {
      await seriesAPI.addDedicatedAssistant(selectedSeriesId, userId);
      setSearchQuery('');
      setSearchResults([]);
      loadAssistants(selectedSeriesId);
      Alert.alert('Thành công', 'Đã thêm trợ lý.');
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const handleRemoveAssistant = (userId: string) => {
    if (!selectedSeriesId) return;
    Alert.alert('Xác nhận', 'Xóa trợ lý này khỏi tác phẩm?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await seriesAPI.removeDedicatedAssistant(selectedSeriesId, userId);
          loadAssistants(selectedSeriesId);
        } catch (err: any) {
          Alert.alert('Lỗi', err.message);
        }
      }}
    ]);
  };

  // --- RENDERS ---

  if (selectedSeries) {
    const isPendingEditorAccepted = selectedSeries.status === 'Pending_Editor' && selectedSeries.editorStatus === 'accepted';
    const canProduceChapter = ['Draft', 'Active'].includes(selectedSeries.status) || isPendingEditorAccepted;
    const canSubmitChapterReview = selectedSeries.status === 'Active' || isPendingEditorAccepted;
    return (
      <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
        <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.header}>
            <Pressable onPress={() => setSelectedSeriesId(null)} style={styles.backBtn}>
              <ChevronLeft size={24} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <ThemedText style={styles.headerSubtitle}>TÁC PHẨM</ThemedText>
              <ThemedText type="title" style={styles.headerTitle} numberOfLines={1}>{selectedSeries.title}</ThemedText>
            </View>
            {(selectedSeries.status === 'Draft' || selectedSeries.status === 'Rejected') && (
              <Pressable style={styles.iconBtn} onPress={() => openSeriesForm(selectedSeries)}>
                <Edit2 size={20} color="#fff" />
              </Pressable>
            )}
          </View>

          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]}>
            {/* Status Card */}
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <ThemedText style={styles.statusLabel}>Trạng thái xuất bản</ThemedText>
                <View style={styles.badge}><ThemedText style={styles.badgeText}>{selectedSeries.status || 'Draft'}</ThemedText></View>
              </View>
              
              <View style={[styles.statusRow, { marginTop: 12 }]}>
                <ThemedText style={styles.statusLabel}>Tantou Editor</ThemedText>
                {selectedSeries.editorId ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <ThemedText style={styles.editorName}>
                      {typeof selectedSeries.editorId === 'object' ? selectedSeries.editorId.displayName : 'Biên tập viên'}
                    </ThemedText>
                    <ThemedText style={[styles.editorStatus, selectedSeries.editorStatus === 'accepted' ? { color: '#4ade80' } : {}]}>
                      {selectedSeries.editorStatus === 'accepted' ? 'Đã chấp nhận' : selectedSeries.editorStatus === 'pending' ? 'Đang chờ phản hồi' : 'Từ chối'}
                    </ThemedText>
                  </View>
                ) : (
                  <View style={styles.inviteBtn}>
                    <ThemedText style={styles.inviteBtnText}>Chờ EB phân công</ThemedText>
                  </View>
                )}
              </View>

              <View style={[styles.statusRow, { marginTop: 12 }]}>
                <ThemedText style={styles.statusLabel}>Trợ lý riêng</ThemedText>
                <Pressable style={styles.assistantsBtn} onPress={() => setShowAssistantsModal(true)}>
                  <Users size={14} color="#fff" style={{ marginRight: 6 }} />
                  <ThemedText style={styles.inviteBtnText}>{dedicatedAssistants.length} Trợ lý</ThemedText>
                </Pressable>
              </View>

              {(selectedSeries.status === 'Draft' || selectedSeries.status === 'Rejected') && (
                <Pressable
                  style={[styles.primaryBtn, { marginTop: 16 }]}
                  onPress={handleSubmitSeries}
                  disabled={saving || chapters.length === 0}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryBtnText}>
                      {chapters.length === 0 ? 'Cần ít nhất 1 chương' : 'Gửi EB phân công biên tập'}
                    </ThemedText>
                  )}
                </Pressable>
              )}
            </View>

            {/* Chapters Section */}
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" style={styles.sectionTitle}>DANH SÁCH CHƯƠNG ({chapters.length})</ThemedText>
              <Pressable style={[styles.addBtnSmall, !canProduceChapter && { opacity: 0.4 }]} onPress={() => openChapterForm()} disabled={!canProduceChapter}>
                <Plus size={16} color="#fff" />
              </Pressable>
            </View>

            {loadingChapters ? (
              <ActivityIndicator color="#fb7185" style={{ marginTop: 20 }} />
            ) : chapters.length === 0 ? (
              <ThemedText style={styles.emptyText}>Chưa có chương nào.</ThemedText>
            ) : (
              chapters.map(chap => (
                <View key={chap._id} style={styles.chapterCard}>
                  <View style={styles.chapterInfo}>
                    <ThemedText style={styles.chapterNum}>Chương {chap.chapterNumber}</ThemedText>
                    <ThemedText style={styles.chapterTitle}>{chap.title}</ThemedText>
                    <View style={styles.chapterMeta}>
                      <Clock size={10} color="#94a3b8" />
                      <ThemedText style={styles.chapterMetaText}>{chap.status}</ThemedText>
                    </View>
                  </View>
                  <View style={styles.chapterActions}>
                    {chap.status === 'Draft' && canSubmitChapterReview && (
                      <Pressable style={styles.chapActionBtn} onPress={() => handleSubmitChapterReview(chap._id)} disabled={saving}>
                        <Send size={16} color="#4ade80" />
                      </Pressable>
                    )}
                    {chap.status === 'Draft' && canProduceChapter && (
                      <>
                        <Pressable style={styles.chapActionBtn} onPress={() => openChapterForm(chap)}>
                          <Edit2 size={16} color="#94a3b8" />
                        </Pressable>
                        <Pressable style={styles.chapActionBtn} onPress={() => deleteChapter(chap._id)}>
                          <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>

        {/* --- MODALS FOR DETAILS --- */}

        {/* Assistants Modal */}
        <Modal visible={showAssistantsModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContentFull}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>Quản lý Trợ lý</ThemedText>
                <Pressable onPress={() => setShowAssistantsModal(false)}><X color="#fff" /></Pressable>
              </View>
              
              <View style={styles.searchBox}>
                <Search size={18} color="#94a3b8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Tìm kiếm trợ lý bằng tên/email..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={searchAssistants}
                />
              </View>

              {searching && <ActivityIndicator color="#fb7185" style={{ marginVertical: 10 }} />}

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  <ThemedText style={styles.sectionTitle}>Kết quả tìm kiếm</ThemedText>
                  {searchResults.map(u => (
                    <View key={u._id} style={styles.assistantItem}>
                      <View>
                        <ThemedText style={styles.editorItemName}>{u.displayName || u.username}</ThemedText>
                        <ThemedText style={styles.editorItemEmail}>{u.email}</ThemedText>
                      </View>
                      <Pressable style={styles.addAssistantBtn} onPress={() => handleAddAssistant(u._id)}>
                        <ThemedText style={styles.addAssistantText}>Thêm</ThemedText>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <ThemedText style={[styles.sectionTitle, { marginTop: 20 }]}>Trợ lý hiện tại ({dedicatedAssistants.length})</ThemedText>
              <ScrollView style={{ flex: 1 }}>
                {dedicatedAssistants.length === 0 ? (
                  <ThemedText style={styles.emptyText}>Chưa có trợ lý nào.</ThemedText>
                ) : (
                  dedicatedAssistants.map(a => {
                    const u = typeof a.userId === 'object' ? a.userId : { _id: a.userId, displayName: 'Unknown' };
                    return (
                      <View key={u._id} style={styles.assistantItem}>
                        <View>
                          <ThemedText style={styles.editorItemName}>{u.displayName || u.username}</ThemedText>
                          <ThemedText style={styles.editorItemEmail}>{u.email}</ThemedText>
                        </View>
                        <Pressable style={styles.removeAssistantBtn} onPress={() => handleRemoveAssistant(u._id)}>
                          <Trash2 size={16} color="#ef4444" />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Chapter Form Modal */}
        <Modal visible={showChapterForm} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalTitle}>{editingChapter ? 'Sửa Chương' : 'Tạo Chương Mới'}</ThemedText>
                <Pressable onPress={() => setShowChapterForm(false)}><X color="#fff" /></Pressable>
              </View>

              <ThemedText style={styles.inputLabel}>Số chương</ThemedText>
              <TextInput style={styles.input} value={chapterNumber} onChangeText={setChapterNumber} keyboardType="numeric" placeholderTextColor="#64748b" placeholder="VD: 1" />

              <ThemedText style={styles.inputLabel}>Tên chương</ThemedText>
              <TextInput style={styles.input} value={chapterTitle} onChangeText={setChapterTitle} placeholderTextColor="#64748b" placeholder="Nhập tên chương..." />

              <Pressable style={[styles.primaryBtn, { marginTop: 20 }]} onPress={saveChapter} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryBtnText}>Lưu Chương</ThemedText>}
              </Pressable>
            </View>
          </View>
        </Modal>
      </ThemedView>
    );
  }

  // --- MAIN SERIES LIST VIEW ---
  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={['#0e051d', '#130e2c', '#07020e']} style={StyleSheet.absoluteFillObject} />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.headerSubtitle}>QUẢN LÝ SERIES</ThemedText>
            <ThemedText type="title" style={styles.headerTitle}>Tác phẩm của tôi</ThemedText>
          </View>
          <Pressable style={styles.createBtn} onPress={() => openSeriesForm()}>
            <Plus size={20} color="#fff" />
          </Pressable>
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
            <ActivityIndicator size="large" color="#fb7185" style={{ marginTop: 50 }} />
          ) : seriesList.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={48} color="#64748b" />
              <ThemedText style={styles.emptyText}>Bạn chưa có tác phẩm nào.</ThemedText>
            </View>
          ) : (
            seriesList.map(series => (
              <Pressable key={series._id} style={styles.seriesCard} onPress={() => setSelectedSeriesId(series._id)}>
                <Image 
                  source={{ uri: getImageUrl(series.coverImage) || `https://picsum.photos/seed/${series._id}/200/300` }}
                  style={styles.coverImage}
                  contentFit="cover"
                />
                <View style={styles.cardContent}>
                  <ThemedText style={styles.seriesTitle} numberOfLines={2}>{series.title}</ThemedText>
                  <View style={styles.metaRow}>
                    <BookOpen size={12} color="#a5b4fc" />
                    <ThemedText style={styles.metaText}>{series.totalChapters || 0} Chapters</ThemedText>
                  </View>
                  <View style={styles.metaRow}>
                    <Clock size={12} color="#fbbf24" />
                    <ThemedText style={styles.metaText}>{series.status}</ThemedText>
                  </View>
                  <View style={styles.actionRow}>
                    {series.status === 'Draft' && (
                      <Pressable style={styles.actionBtn} onPress={() => deleteSeries(series._id)}>
                        <Trash2 size={14} color="#ef4444" />
                      </Pressable>
                    )}
                    <View style={styles.actionBtnSecondary}>
                      <ThemedText style={styles.actionBtnText}>Quản lý chi tiết</ThemedText>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Series Form Modal */}
      <Modal visible={showSeriesForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentFull}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>{editingSeries ? 'Sửa Tác Phẩm' : 'Tạo Tác Phẩm Mới'}</ThemedText>
              <Pressable onPress={() => setShowSeriesForm(false)}><X color="#fff" /></Pressable>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.inputLabel}>Tên truyện</ThemedText>
              <TextInput style={styles.input} value={seriesTitle} onChangeText={setSeriesTitle} placeholderTextColor="#64748b" placeholder="Nhập tên truyện..." />

              <ThemedText style={styles.inputLabel}>Mô tả</ThemedText>
              <TextInput style={[styles.input, { height: 100, textAlignVertical: 'top' }]} multiline value={seriesDescription} onChangeText={setSeriesDescription} placeholderTextColor="#64748b" placeholder="Nội dung chính..." />

              <ThemedText style={styles.inputLabel}>Tags truyện</ThemedText>
              <View style={styles.tagGrid}>
                {SERIES_TAG_OPTIONS.map((tag) => {
                  const selected = seriesTags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      style={[styles.tagChip, selected && styles.tagChipSelected]}
                      onPress={() => setSeriesTags((current) => selected
                        ? current.filter((item) => item !== tag)
                        : [...current, tag])}
                    >
                      <ThemedText style={[styles.tagChipText, selected && styles.tagChipTextSelected]}>
                        {formatSeriesTag(tag)}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
              <ThemedText style={styles.tagHint}>Chọn một hoặc nhiều tag có sẵn.</ThemedText>

              <ThemedText style={styles.inputLabel}>Ảnh bìa (URL)</ThemedText>
              <TextInput style={styles.input} value={seriesCoverUrl} onChangeText={setSeriesCoverUrl} placeholderTextColor="#64748b" placeholder="https://..." />
              {seriesCoverUrl ? (
                <Image source={{ uri: seriesCoverUrl }} style={styles.coverPreview} contentFit="cover" />
              ) : null}

              <Pressable style={[styles.primaryBtn, { marginTop: 30, marginBottom: 50 }]} onPress={saveSeries} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.primaryBtnText}>Lưu Tác Phẩm</ThemedText>}
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
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  iconBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
  headerSubtitle: { color: '#fb7185', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { color: '#fff', fontSize: 26, lineHeight: 32, fontWeight: '800' },
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBanner: { backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginBottom: Spacing.three },
  errorText: { color: '#fb7185', fontSize: 13, fontWeight: 'bold' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.three },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 10 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  seriesCard: { 
    flexDirection: 'row', 
    backgroundColor: 'rgba(255,255,255,0.05)', 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.05)',
    overflow: 'hidden',
    marginBottom: 12
  },
  coverImage: { width: 100, height: 140 },
  cardContent: { flex: 1, padding: 14, gap: 6 },
  seriesTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: '#94a3b8', fontSize: 12 },
  actionRow: { flexDirection: 'row', marginTop: 'auto', paddingTop: 8, justifyContent: 'space-between', alignItems: 'center' },
  actionBtn: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)' },
  actionBtnSecondary: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  // Detail View Styles
  statusCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  badge: { backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  inviteBtn: { backgroundColor: '#fb7185', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  inviteBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  editorName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  editorStatus: { color: '#fbbf24', fontSize: 11, marginTop: 2 },
  assistantsBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  addBtnSmall: { backgroundColor: '#fb7185', padding: 4, borderRadius: 6 },
  
  chapterCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chapterInfo: { flex: 1 },
  chapterNum: { color: '#fb7185', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
  chapterTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  chapterMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  chapterMetaText: { color: '#94a3b8', fontSize: 11 },
  chapterActions: { flexDirection: 'row', gap: 8 },
  chapActionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1e1b4b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalContentFull: { backgroundColor: '#1e1b4b', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flex: 1, marginTop: 60, marginBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalDesc: { color: '#94a3b8', fontSize: 13, marginBottom: 16 },
  
  inputLabel: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 15 },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)' },
  tagChipSelected: { borderColor: '#fb7185', backgroundColor: 'rgba(251,113,133,0.2)' },
  tagChipText: { color: '#cbd5e1', fontSize: 12 },
  tagChipTextSelected: { color: '#fff', fontWeight: '700' },
  tagHint: { color: '#94a3b8', fontSize: 11, marginTop: 8 },
  coverPreview: { width: '100%', height: 150, borderRadius: 12, marginTop: 10 },
  
  primaryBtn: { backgroundColor: '#fb7185', padding: 16, borderRadius: 12, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  editorItem: { padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 8, position: 'relative' },
  editorItemSelected: { borderColor: '#fb7185', borderWidth: 1, backgroundColor: 'rgba(251,113,133,0.1)' },
  editorItemName: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  editorItemEmail: { color: '#94a3b8', fontSize: 12 },
  editorItemCheck: { position: 'absolute', right: 12, top: '50%', marginTop: -8 },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, paddingHorizontal: 12, marginBottom: 16 },
  searchInput: { flex: 1, color: '#fff', padding: 12, fontSize: 14 },
  searchResults: { marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  assistantItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8 },
  addAssistantBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addAssistantText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  removeAssistantBtn: { backgroundColor: 'rgba(239,68,68,0.15)', padding: 8, borderRadius: 8 },
});

export default withProtectedMangakaRoute(ManageScreen);

