import { useState, useMemo, useEffect } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View, TextInput, ActivityIndicator } from 'react-native';
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
    router.push(`/read/${id}`);
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Background glow gradient */}
      <LinearGradient
        colors={['#0e051d', '#07020e', '#130d2d']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGlow}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <ThemedView style={styles.headerCard}>
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={styles.topBadgeText}>READER EXPLORE</ThemedText>
                <ThemedText type="title" style={styles.headerTitle}>Khám phá truyện hay</ThemedText>
                <ThemedText style={styles.headerDesc}>
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
          <View style={styles.searchBarWrap}>
            <Search size={18} color="#a5b4fc" />
            <TextInput
              placeholder="Tìm kiếm tác phẩm, tác giả..."
              placeholderTextColor="#a5b4fc"
              style={styles.webInput}
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
                  activeCategory === c && styles.categoryChipActive,
                ]}
              >
                <ThemedText style={[styles.categoryText, activeCategory === c && styles.categoryTextActive]}>
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
                  <Pressable onPress={() => handleOpenSeries(featureItem.id)} style={styles.readNowButton}>
                    <Play size={14} color="#0a051d" />
                    <ThemedText style={styles.readNowText}>Đọc Ngay</ThemedText>
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
              <ThemedText type="smallBold" style={styles.sectionTitle}>ĐỀ XUẤT NỔI BẬT</ThemedText>
            </View>
            <Pressable style={styles.seeAllBtn}>
              <ThemedText style={styles.seeAllText}>Tất cả</ThemedText>
              <ArrowRight size={13} color="#a5b4fc" />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {filteredSeries.map((series) => (
              <Pressable key={series.id} onPress={() => handleOpenSeries(series.id)} style={styles.seriesCard}>
                <ImageBackground source={{ uri: series.cover }} style={styles.cover} imageStyle={styles.coverImage}>
                  <LinearGradient colors={['transparent', 'rgba(10,5,22,0.92)']} style={styles.coverOverlay} />
                  {series.hot && (
                    <View style={styles.hotBadge}>
                      <Flame size={10} color="#fff" />
                      <ThemedText style={styles.hotText}>HOT</ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.cardBottom}>
                    <ThemedText style={styles.seriesTitleText} numberOfLines={1}>{series.title}</ThemedText>
                    <ThemedText style={styles.seriesAuthorText}>{series.author}</ThemedText>
                  </View>
                </ImageBackground>

                <View style={styles.cardInfoRow}>
                  <ThemedText style={styles.genreTag}>{series.genre}</ThemedText>
                  <ThemedText style={styles.statText}>{series.chapters} ch.</ThemedText>
                </View>

                <View style={[styles.cardInfoRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 8, marginTop: 4 }]}>
                  <ThemedText style={styles.statText}><Heart size={11} color="#fb7185" /> {series.votes}</ThemedText>
                  <ThemedText style={styles.statText}><Eye size={11} color="#38bdf8" /> {series.readers}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {/* New Releases Strip list */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderTitleRow}>
              <Sparkles size={16} color="#fbbf24" />
              <ThemedText type="smallBold" style={styles.sectionTitle}>CHƯƠNG MỚI PHÁT HÀNH</ThemedText>
            </View>
          </View>
          <View style={styles.releaseList}>
            {newReleases.map((item) => (
              <Pressable key={item.title} onPress={() => handleOpenSeries(item.id)} style={styles.releaseItem}>
                <View style={styles.releaseMetaCol}>
                  <Image source={{ uri: item.cover }} style={styles.releaseCover} contentFit="cover" />
                  <View>
                    <ThemedText style={styles.releaseTitle}>{item.title}</ThemedText>
                    <ThemedText style={styles.releaseTime}>{item.time}</ThemedText>
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
  headerCard: { borderRadius: 24, padding: Spacing.three, backgroundColor: 'rgba(22,17,41,0.7)', borderStyle: 'solid', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  headerRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  topBadgeText: { color: '#a855f7', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  headerDesc: { color: '#cbd5e1', fontSize: 12, lineHeight: 18, marginTop: 6 },
  heroIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(168,85,247,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  searchBarWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  webInput: { flex: 1, backgroundColor: 'transparent', color: '#fff', fontSize: 14 },
  categoryRow: { gap: 8, paddingVertical: 2 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  categoryChipActive: { backgroundColor: '#fff' },
  categoryText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  categoryTextActive: { color: '#0a051d', fontWeight: '800' },
  featureWrap: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  featureCard: { minHeight: 280, padding: Spacing.three, justifyContent: 'flex-end', gap: 12 },
  featureImageStyle: { borderRadius: 24 },
  featureOverlay: { ...StyleSheet.absoluteFillObject },
  featureContent: { gap: 8 },
  badgesRow: { flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  featureTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  featureDescText: { color: '#cbd5e1', fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { color: '#fff', fontSize: 11, fontWeight: '700', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  ctaRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 },
  readNowButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 11 },
  readNowText: { color: '#0a051d', fontWeight: '800', fontSize: 13 },
  listButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  listButtonActive: { backgroundColor: 'rgba(244,63,94,0.15)', borderColor: 'rgba(244,63,94,0.3)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  sectionHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#f8fafc', fontSize: 13, letterSpacing: 1.5, fontWeight: '800' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  seeAllText: { color: '#a5b4fc', fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  seriesCard: { width: '48%', borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', paddingBottom: 12 },
  cover: { height: 210, justifyContent: 'space-between' },
  coverImage: { borderRadius: 20 },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  hotBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', margin: 10, backgroundColor: '#f43f5e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  hotText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  cardBottom: { padding: 10, marginTop: 'auto' },
  seriesTitleText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  seriesAuthorText: { color: '#cbd5e1', fontSize: 11 },
  cardInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, gap: 6, marginTop: 4 },
  genreTag: { color: '#fb7185', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  statText: { color: '#cbd5e1', fontSize: 11, flexDirection: 'row', alignItems: 'center', gap: 3 },
  releaseList: { gap: 10 },
  releaseItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: Spacing.two, backgroundColor: 'rgba(22,17,41,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  releaseMetaCol: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  releaseCover: { width: 56, height: 56, borderRadius: 10 },
  releaseTitle: { color: '#fff', fontWeight: '800', fontSize: 13 },
  releaseTime: { color: '#a5b4fc', fontSize: 11 },
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
