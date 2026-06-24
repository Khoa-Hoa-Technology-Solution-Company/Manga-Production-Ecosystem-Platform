import { useState, useMemo, useEffect } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View, TextInput, ActivityIndicator, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { ArrowRight, Bookmark, Eye, Flame, Heart, Play, Search, Sparkles, Star } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { seriesAPI, getImageUrl } from '@/lib/api';

const categories = ['All', 'Action', 'Romance', 'Sci-Fi', 'Fantasy', 'Horror', 'Slice of Life'];

export default function ExploreScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [bookmarkedItems, setBookmarkedItems] = useState<Record<string, boolean>>({});

  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoading(true);
    seriesAPI
      .getAll({ limit: '100' })
      .then((data) => {
        setSeriesList(data.series || []);
      })
      .catch((err) => {
        console.error('Explore load series error:', err);
        setError(err.message || 'Không thể kết nối đến máy chủ.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const mappedSeriesList = useMemo(() => {
    return seriesList.map((s) => ({
      id: s._id,
      title: s.title,
      author: s.mangakaId?.displayName || 'Unknown Author',
      genre: s.genre?.[0] || 'Action',
      votes: s.totalVotes ? `${(s.totalVotes / 1000).toFixed(0)}K` : '0',
      chapters: s.totalChapters || 0,
      readers: s.readerCount ? `${(s.readerCount / 1000).toFixed(0)}K` : '0',
      cover: getImageUrl(s.coverImage) || `https://picsum.photos/seed/${s._id}/600/400`,
      hot: (s.weeklyVotes || 0) > 100,
      desc: s.description || '',
    }));
  }, [seriesList]);

  const featureItem = useMemo(() => {
    if (mappedSeriesList.length > 0) {
      return mappedSeriesList[0];
    }
    return {
      id: '',
      title: 'Loading...',
      author: '',
      genre: 'Action',
      votes: '0',
      chapters: 0,
      readers: '0',
      cover: 'https://picsum.photos/seed/placeholder/1200/800',
      hot: false,
      desc: 'Loading...',
    };
  }, [mappedSeriesList]);

  const newReleases = useMemo(() => {
    return mappedSeriesList.slice(0, 3).map((item, idx) => ({
      id: item.id,
      title: `${item.title} Ch. ${item.chapters}`,
      time: `${idx + 2} giờ trước`,
      cover: item.cover,
    }));
  }, [mappedSeriesList]);

  const filteredSeries = useMemo(() => {
    return mappedSeriesList.filter((s) => {
      const matchCategory = activeCategory === 'All' || s.genre === activeCategory;
      const matchSearch = searchQuery === '' || s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery, mappedSeriesList]);

  const toggleBookmark = (id: string) => {
    setBookmarkedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenSeries = (id: string) => {
    if (!id) return;
    router.push(`/series/${id}`);
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background glow gradient */}
      <LinearGradient
        colors={isDark ? ['#0e051d', '#07020e', '#130d2d'] : ['#fff5f6', '#faf5ff', '#f8fafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGlow}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <ThemedView
            style={[
              styles.headerCard,
              {
                backgroundColor: isDark ? 'rgba(22,17,41,0.7)' : 'rgba(255, 255, 255, 0.85)',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
              }
            ]}
          >
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <ThemedText themeColor="textSecondary" style={styles.topBadgeText}>READER EXPLORE</ThemedText>
                <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>Khám phá truyện hay</ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.headerDesc}>
                  Tìm kiếm tác phẩm yêu thích, cập nhật chương mới và tương tác cùng cộng đồng.
                </ThemedText>
              </View>
              <View style={styles.heroIconWrap}>
                <Sparkles size={24} color="#a855f7" />
              </View>
            </View>
          </ThemedView>

          {error && (
            <View style={styles.errorBanner}>
              <Sparkles size={16} color="#fb7185" />
              <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
              <Pressable onPress={loadData} style={styles.retryBtn}>
                <ThemedText style={styles.retryText}>Thử lại</ThemedText>
              </Pressable>
            </View>
          )}

          {/* Search Input Bar */}
          <View
            style={[
              styles.searchBarWrap,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.06)',
              }
            ]}
          >
            <Search size={18} color={isDark ? '#a5b4fc' : '#6366f1'} />
            <TextInput
              placeholder="Tìm kiếm tác phẩm, tác giả..."
              placeholderTextColor={isDark ? '#a5b4fc' : '#64748b'}
              style={[styles.webInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories Tab Scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {categories.map((c) => (
              <Pressable
                key={c}
                onPress={() => setActiveCategory(c)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.03)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.06)',
                  },
                  activeCategory === c && styles.categoryChipActive,
                ]}
              >
                <ThemedText style={[styles.categoryText, activeCategory === c && styles.categoryTextActive, { color: activeCategory === c ? '#fb7185' : theme.textSecondary }]}>
                  {c}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {/* Hero Banner Showcase */}
          <Pressable onPress={() => handleOpenSeries(featureItem.id)} style={styles.featureWrap}>
            <ImageBackground source={{ uri: featureItem.cover }} style={styles.featureCard} imageStyle={styles.featureImageStyle}>
              <LinearGradient colors={['transparent', 'rgba(10,5,22,0.96)']} style={styles.featureOverlay} />
              
              <View style={styles.featureContent}>
                <View style={styles.badgesRow}>
                  <View style={styles.badge}><Flame size={12} color="#fb7185" /><ThemedText style={styles.badgeText}>Thịnh Hành #1</ThemedText></View>
                  <View style={styles.badge}><Heart size={12} color="#38bdf8" /><ThemedText style={styles.badgeText}>{featureItem.votes} lượt bầu</ThemedText></View>
                </View>
                <ThemedText type="subtitle" style={styles.featureTitle}>{featureItem.title}</ThemedText>
                <ThemedText style={styles.featureDescText} numberOfLines={2}>
                  {featureItem.desc || 'Tác phẩm đang gây sốt trong tuần này, cập nhật chương mới liên tục.'}
                </ThemedText>
                
                <View style={styles.metaRow}>
                  <ThemedText style={styles.metaItem}><Eye size={12} color="#a5b4fc" /> {featureItem.readers} Độc giả</ThemedText>
                  <ThemedText style={styles.metaItem}><Star size={12} color="#fbbf24" /> 4.9 Đánh giá</ThemedText>
                </View>
                
                <View style={styles.ctaRow}>
                  <Pressable
                    onPress={() => handleOpenSeries(featureItem.id)}
                    style={({ pressed }) => [
                      styles.readNowBtnWrap,
                      pressed && { opacity: 0.9 }
                    ]}
                  >
                    <LinearGradient
                      colors={['#f43f5e', '#ec4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.readNowButton}
                    >
                      <Play size={13} color="#fff" />
                      <ThemedText style={styles.readNowText}>Đọc Ngay</ThemedText>
                    </LinearGradient>
                  </Pressable>
                  <Pressable onPress={() => toggleBookmark(featureItem.id)} style={[styles.listButton, bookmarkedItems[featureItem.id] && styles.listButtonActive]}>
                    <Bookmark size={15} color={bookmarkedItems[featureItem.id] ? '#fb7185' : '#fff'} fill={bookmarkedItems[featureItem.id] ? '#fb7185' : 'none'} />
                  </Pressable>
                </View>
              </View>
            </ImageBackground>
          </Pressable>

          {/* Hot this week list */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleRow}>
              <Flame size={16} color="#fb7185" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>ĐỀ XUẤT NỔI BẬT</ThemedText>
            </View>
            <Pressable style={styles.seeAllBtn}>
              <ThemedText style={styles.seeAllText}>Tất cả</ThemedText>
              <ArrowRight size={13} color="#a5b4fc" />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {filteredSeries.map((series) => (
              <Pressable
                key={series.id}
                onPress={() => handleOpenSeries(series.id)}
                style={[
                  styles.seriesCard,
                  {
                    backgroundColor: isDark ? 'rgba(22,17,41,0.6)' : '#ffffff',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
                  }
                ]}
              >
                <ImageBackground source={{ uri: series.cover }} style={styles.cover} imageStyle={styles.coverImage}>
                  <LinearGradient colors={['transparent', 'rgba(10,5,22,0.92)']} style={styles.coverOverlay} />
                  {series.hot && (
                    <View style={styles.hotBadge}>
                      <Flame size={10} color="#fff" />
                      <ThemedText style={styles.hotText}>HOT</ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.cardBottom}>
                    <ThemedText style={[styles.seriesTitleText, { color: theme.text }]} numberOfLines={1}>{series.title}</ThemedText>
                    <ThemedText style={[styles.seriesAuthorText, { color: theme.textSecondary }]}>{series.author}</ThemedText>
                  </View>
                </ImageBackground>

                <View style={styles.cardInfoRow}>
                  <ThemedText style={styles.genreTag}>{series.genre}</ThemedText>
                  <ThemedText style={[styles.statText, { color: theme.textSecondary }]}>{series.chapters} ch.</ThemedText>
                </View>

                <View style={[styles.cardInfoRow, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)', paddingTop: 8, marginTop: 4 }]}>
                  <ThemedText style={[styles.statText, { color: theme.textSecondary }]}><Heart size={11} color="#fb7185" /> {series.votes}</ThemedText>
                  <ThemedText style={[styles.statText, { color: theme.textSecondary }]}><Eye size={11} color="#38bdf8" /> {series.readers}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {/* New Releases Strip list */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleRow}>
              <Sparkles size={16} color="#fbbf24" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>CHƯƠNG MỚI PHÁT HÀNH</ThemedText>
            </View>
          </View>
          <View style={styles.releaseList}>
            {newReleases.map((item) => (
              <Pressable
                key={item.title}
                onPress={() => handleOpenSeries(item.id)}
                style={[
                  styles.releaseItem,
                  {
                    backgroundColor: isDark ? 'rgba(22,17,41,0.45)' : '#ffffff',
                    borderColor: isDark ? 'rgba(139, 92, 246, 0.08)' : 'rgba(15, 23, 42, 0.08)',
                  }
                ]}
              >
                <View style={styles.releaseMetaCol}>
                  <Image source={{ uri: item.cover }} style={styles.releaseCover} contentFit="cover" />
                  <View>
                    <ThemedText style={[styles.releaseTitle, { color: theme.text }]}>{item.title}</ThemedText>
                    <ThemedText style={[styles.releaseTime, { color: theme.textSecondary }]}>{item.time}</ThemedText>
                  </View>
                </View>
                <ArrowRight size={16} color="#fb7185" />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  backgroundGlow: { ...StyleSheet.absoluteFillObject },
  safeArea: { flex: 1 },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.four },
  headerCard: { borderRadius: 24, padding: Spacing.three, borderStyle: 'solid', borderWidth: 1 },
  headerRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  topBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { fontSize: 24, fontWeight: '900', marginTop: 4 },
  headerDesc: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  heroIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(168,85,247,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  searchBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  webInput: { flex: 1, backgroundColor: 'transparent', fontSize: 14 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  categoryChipActive: { backgroundColor: 'rgba(251,113,133,0.18)', borderColor: '#fb7185' },
  categoryText: { fontSize: 13, fontWeight: '700' },
  categoryTextActive: { fontWeight: '800' },
  featureWrap: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  featureCard: { minHeight: 280, padding: Spacing.three, justifyContent: 'flex-end', gap: 12 },
  featureImageStyle: { borderRadius: 24 },
  featureOverlay: { ...StyleSheet.absoluteFillObject },
  featureContent: { gap: 8 },
  badgesRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(22, 17, 41, 0.6)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  featureTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  featureDescText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { color: '#fff', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(22, 17, 41, 0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  ctaRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  readNowBtnWrap: { borderRadius: 999, overflow: 'hidden' },
  readNowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 11 },
  readNowText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  listButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22, 17, 41, 0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  listButtonActive: { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, letterSpacing: 1.5, fontWeight: '800' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: '#fb7185', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seriesCard: {
    width: '48%',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(22,17,41,0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cover: { height: 210, justifyContent: 'space-between' },
  coverImage: { borderRadius: 20 },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    margin: 10,
    backgroundColor: '#f43f5e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 20,
  },
  hotText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  cardBottom: { padding: 10, marginTop: 'auto', zIndex: 10 },
  seriesTitleText: { fontWeight: '800', fontSize: 14 },
  seriesAuthorText: { fontSize: 11 },
  cardInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, gap: 6, marginTop: 4 },
  genreTag: { color: '#fb7185', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statText: { fontSize: 11, flexDirection: 'row', alignItems: 'center', gap: 3 },
  releaseList: { gap: 10 },
  releaseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: Spacing.two,
    borderWidth: 1,
  },
  releaseMetaCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  releaseCover: { width: 56, height: 56, borderRadius: 10 },
  releaseTitle: { fontWeight: '800', fontSize: 13 },
  releaseTime: { fontSize: 11 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244,63,94,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#fb7185',
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: '#fb7185',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
