import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Check, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { pagesAPI, chaptersAPI, getImageUrl } from '@/lib/api';
import { Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { withProtectedEditorRoute } from '@/components/protected-route';

function ManuscriptReviewScreen() {
  const { chapterId } = useLocalSearchParams<{ chapterId: string }>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (chapterId) {
      setLoading(true);
      pagesAPI.getByChapter(chapterId as string)
        .then(data => setPages(data?.pages || []))
        .catch(err => setError(err.message || 'Không thể tải bản thảo.'))
        .finally(() => setLoading(false));
    }
  }, [chapterId]);

  const loadPages = () => {}; // Mock to satisfy if used elsewhere, actually just inlined above

  const handleDecision = async (decision: 'approved' | 'draft') => {
    setSubmitting(true);
    try {
      await chaptersAPI.updateStatus(chapterId, decision);
      Alert.alert('Thành công', `Đã ${decision === 'approved' ? 'duyệt' : 'từ chối'} bản thảo!`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật trạng thái.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={['#0e051d', '#130e2c', '#07020e']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>Duyệt Bản Thảo</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {error && (
          <View style={styles.errorBanner}>
             <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        )}

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + insets.bottom + 80 }, // extra padding for action bar
          ]}
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#a855f7" style={{ marginTop: 50 }} />
          ) : pages.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>Chương này chưa có trang nào.</ThemedText>
            </View>
          ) : (
            pages.map((page, index) => (
              <View key={page._id} style={styles.pageContainer}>
                <ThemedText style={styles.pageNumber}>Trang {index + 1}</ThemedText>
                <Image 
                  source={{ uri: getImageUrl(page.imageUrl) }} 
                  style={styles.pageImage} 
                  contentFit="contain"
                />
              </View>
            ))
          )}
        </ScrollView>

        {/* Action Bar */}
        {!loading && pages.length > 0 && (
          <View style={[styles.actionBar, { paddingBottom: insets.bottom || Spacing.four }]}>
            <Pressable 
              style={[styles.actionBtn, styles.rejectBtn]} 
              onPress={() => handleDecision('draft')}
              disabled={submitting}
            >
              <X size={20} color="#fff" />
              <ThemedText style={styles.actionBtnText}>Từ chối</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionBtn, styles.approveBtn]} 
              onPress={() => handleDecision('approved')}
              disabled={submitting}
            >
              <Check size={20} color="#fff" />
              <ThemedText style={styles.actionBtnText}>Duyệt ngay</ThemedText>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three, 
    paddingVertical: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginTop: Spacing.three },
  errorText: { color: '#fb7185', fontSize: 13, fontWeight: 'bold' },
  content: { width: '100%', gap: Spacing.four, paddingTop: Spacing.three },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14 },
  pageContainer: { 
    width: '100%', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 10
  },
  pageNumber: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  pageImage: { width: '100%', aspectRatio: 0.7 },
  actionBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: 'rgba(10,5,22,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  rejectBtn: { backgroundColor: '#f43f5e' },
  approveBtn: { backgroundColor: '#22c55e' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 }
});

export default withProtectedEditorRoute(ManuscriptReviewScreen);

