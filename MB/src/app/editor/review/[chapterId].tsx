import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronLeft, Check, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (chapterId) {
      setLoading(true);
      pagesAPI.getByChapter(chapterId as string)
        .then(data => setPages(Array.isArray(data?.pages) ? data.pages : []))
        .catch(err => setError(err.message || t('editor.loadError')))
        .finally(() => setLoading(false));
    }
  }, [chapterId, t]);

  const handleDecision = async (decision: 'Approved' | 'Draft') => {
    setSubmitting(true);
    try {
      await chaptersAPI.updateStatus(chapterId, decision);
      Alert.alert(
        t('common.success'),
        decision === 'Approved'
          ? t('editor.approveSuccess')
          : t('editor.rejectSuccess'),
        [{ text: t('common.ok'), onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || t('editor.statusUpdateError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={StyleSheet.absoluteFillObject}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fffaf0" />
          </Pressable>
          <ThemedText type="subtitle" style={styles.headerTitle}>
            {t('editor.viewDraft')}
          </ThemedText>
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
            <ActivityIndicator size="large" color="#7a5a43" style={{ marginTop: 50 }} />
          ) : pages.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                {t('editor.noPages')}
              </ThemedText>
            </View>
          ) : (
            pages.map((page, index) => (
              <View key={page._id} style={styles.pageContainer}>
                <ThemedText style={styles.pageNumber}>
                  {t('editor.pageNumber', { number: index + 1 })}
                </ThemedText>
                <Image 
                  source={{ uri: getImageUrl(page.originalImage || page.processedImage) }}
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
              onPress={() => handleDecision('Draft')}
              disabled={submitting}
            >
              <X size={20} color="#fffaf0" />
              <ThemedText style={styles.actionBtnText}>
                {t('editor.reject')}
              </ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.actionBtn, styles.approveBtn]} 
              onPress={() => handleDecision('Approved')}
              disabled={submitting}
            >
              <Check size={20} color="#fffaf0" />
              <ThemedText style={styles.actionBtnText}>
                {t('editor.approve')}
              </ThemedText>
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
    borderBottomColor: 'rgba(255,250,240,0.05)'
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fffaf0', fontSize: 18, fontWeight: '800' },
  errorBanner: { backgroundColor: 'rgba(185,66,52,0.15)', padding: 12, marginHorizontal: Spacing.three, borderRadius: 8, marginTop: Spacing.three },
  errorText: { color: '#c85745', fontSize: 13, fontWeight: 'bold' },
  content: { width: '100%', gap: Spacing.four, paddingTop: Spacing.three },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#9aa39a', fontSize: 14 },
  pageContainer: { 
    width: '100%', 
    alignItems: 'center',
    backgroundColor: 'rgba(255,250,240,0.02)',
    paddingVertical: 10
  },
  pageNumber: { color: '#9aa39a', fontSize: 12, marginBottom: 8 },
  pageImage: { width: '100%', aspectRatio: 0.7 },
  actionBar: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: 'rgba(28,41,40,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,250,240,0.05)',
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
  rejectBtn: { backgroundColor: '#b94234' },
  approveBtn: { backgroundColor: '#357053' },
  actionBtnText: { color: '#fffaf0', fontWeight: '800', fontSize: 15 }
});

export default withProtectedEditorRoute(ManuscriptReviewScreen);
