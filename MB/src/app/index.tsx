import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View, ActivityIndicator, Alert, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  BookOpen,
  Flame,
  Heart,
  LayoutGrid,
  Play,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Award,
  Medal,
  User,
  LogOut,
  Bell,
} from 'lucide-react-native';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReaderAssistantCard } from '@/components/reader-assistant-card';
import { seriesAPI, dashboardAPI, getImageUrl, readerAPI, type ReaderHome, type ContinueReadingItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const moods = ['All', 'Action', 'Romance', 'Sci-Fi', 'Fantasy', 'Slice of Life', 'Horror'];

// Level color map for leaderboard
const levelColors: Record<string, string> = {
  Diamond: '#38bdf8',
  Platinum: '#a855f7',
  Gold: '#f59e0b',
  Silver: '#94a3b8',
};

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { user, logout } = useAuth();
  const [activeMood, setActiveMood] = useState('All');
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [subscribingSeriesId, setSubscribingSeriesId] = useState<string | null>(null);

  const handleToggleSeriesSubscribe = async (seriesId: string) => {
    if (!user) return;
    setSubscribingSeriesId(seriesId);
    try {
      const data = await seriesAPI.subscribe(seriesId);
      if (data?.series) {
        setSeriesList((prev) =>
          prev.map((s) =>
            s._id === seriesId ? { ...s, subscribers: data.series.subscribers } : s
          )
        );
        Alert.alert(
          'Thông báo',
          data.subscribed
            ? 'Đã đăng ký nhận thông báo chương mới!'
            : 'Đã hủy đăng ký nhận thông báo.'
        );
      }
    } catch (err: any) {
      console.error('Failed to toggle series subscription:', err);
      Alert.alert('Lỗi', err.message || 'Không thể thực hiện đăng ký.');
    } finally {
      setSubscribingSeriesId(null);
    }
  };

  // ── API data state ────────────────────────────────
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [readerHome, setReaderHome] = useState<ReaderHome | null>(null);
  const [activeShelfTab, setActiveShelfTab] = useState<'all' | 'shared'>('all');
  const [loadingSeries, setLoadingSeries] = useState(true);
  const [loadingRankings, setLoadingRankings] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = () => {
    setError(null);
    setLoadingSeries(true);
    setLoadingRankings(true);

    seriesAPI
      .getAll({ limit: '20' })
      .then((data) => {
        setSeriesList(data?.series || []);
      })
      .catch((err) => {
        console.error('Index load series error:', err);
        setError(err.message || 'Không thể tải danh sách truyện.');
      })
      .finally(() => setLoadingSeries(false));

    dashboardAPI
      .getRankings('rating')
      .then((data) => {
        setRankings((data?.rankings || []).slice(0, 6));
      })
      .catch((err) => {
        console.error('Index load rankings error:', err);
        setError(err.message || 'Không thể kết nối đến máy chủ.');
      })
      .finally(() => setLoadingRankings(false));

    if (user?.role === 'reader') {
      readerAPI
        .getHome()
        .then(setReaderHome)
        .catch((err) => console.error('Reader assistant home error:', err));
    }
  };

  useEffect(() => {
    loadData();
  }, [user?._id]);

  // ── Derived data ──────────────────────────────────
  const featuredSeries = useMemo(
    () =>
      (seriesList || []).slice(0, 3).map((s, idx) => ({
        id: s._id,
        title: s.title,
        subtitle: s.description || '',
        genre: s.genre?.[0] || 'Action',
        readers: s.readerCount ? `${(s.readerCount / 1000).toFixed(0)}K` : '0',
        votes: s.totalVotes ? `${(s.totalVotes / 1000).toFixed(0)}K` : '0',
        rating: s.averageRating ? s.averageRating.toFixed(1) : '0.0',
        cover: getImageUrl(s.coverImage) || `https://picsum.photos/seed/${s._id}/800/600`,
        accent: [
          ['#120F2A', '#4c1d95', '#fb7185'],
          ['#030712', '#1e1b4b', '#6366f1'],
          ['#1a0a2e', '#3b1d6e', '#22c55e'],
        ][idx % 3],
      })),
    [seriesList]
  );

  const continueReading = useMemo(
    () =>
      (readerHome?.continueReading || []).map((item) => ({
        ...item,
        cover: getImageUrl(item.coverImage) || `https://picsum.photos/seed/${item.id}/400/600`,
        progress: `Ch. ${item.chapterNumber}`,
        percent: item.percentage,
      })),
    [readerHome]
  );

  const hotSeries = useMemo(
    () =>
      (seriesList || []).map((s) => ({
        id: s._id,
        title: s.title,
        genre: s.genre?.[0] || 'Unknown',
        author: s.mangakaId?.displayName || 'Unknown',
        chapters: s.totalChapters || 0,
        votes: s.totalVotes ? `${(s.totalVotes / 1000).toFixed(0)}K` : '0',
        cover: getImageUrl(s.coverImage) || `https://picsum.photos/seed/${s._id}/600/400`,
        hot: (s.weeklyVotes || 0) > 100,
        shared: Boolean(s.sharedWithMe),
        subscribers: s.subscribers || [],
      })),
    [seriesList]
  );

  const filteredHotSeries = useMemo(
    () => hotSeries.filter((item) => activeMood === 'All' || item.genre === activeMood),
    [activeMood, hotSeries]
  );

  const sharedSeries = useMemo(() => hotSeries.filter((item) => item.shared), [hotSeries]);
  const visibleHotSeries = activeShelfTab === 'shared' ? sharedSeries : filteredHotSeries;

  const currentFeatured = featuredSeries[featuredIndex] || {
    id: '',
    title: 'Loading...',
    subtitle: '',
    genre: '',
    readers: '0',
    votes: '0',
    rating: '0',
    cover: 'https://picsum.photos/800/600',
    accent: ['#120F2A', '#4c1d95', '#fb7185'],
  };

  const leaderboard = useMemo(
    () =>
      (rankings || []).map((s, idx) => ({
        rank: idx + 1,
        name: s.title,
        rating: s.averageRating ? s.averageRating.toFixed(1) : '0.0',
        badge: s.mangakaId?.displayName || 'Unknown Author',
        level: idx === 0 ? 'Diamond' : idx === 1 ? 'Platinum' : idx <= 3 ? 'Gold' : 'Silver',
        color: idx === 0 ? '#38bdf8' : idx === 1 ? '#a855f7' : idx <= 3 ? '#f59e0b' : '#94a3b8',
      })),
    [rankings]
  );

  const handleOpenSeries = (id: string) => {
    router.push(`/series/${id}`);
  };

  const handleContinueReading = (item: ContinueReadingItem) => {
    router.push({
      pathname: '/read/[seriesId]',
      params: {
        seriesId: item.id,
        chapterIndex: String(item.chapterIndex),
        pageIndex: String(item.pageIndex),
        progress: String(item.percentage),
      },
    } as any);
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      {/* Premium glowing background */}
      <LinearGradient
        colors={isDark ? ['#0e051d', '#130e2c', '#07020e'] : ['#fff5f6', '#faf5ff', '#f8fafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGlow}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + insets.bottom + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.badgeRow}>
                <Sparkles size={13} color="#f43f5e" />
                <ThemedText style={styles.headerSubtitle}>Manga Ecosystem</ThemedText>
              </View>
              <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>Reader Hub</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                style={[
                  styles.logoutBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.04)',
                    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15, 23, 42, 0.06)'
                  }
                ]}
                onPress={logout}
              >
                <LogOut size={20} color={isDark ? '#94a3b8' : '#475569'} />
              </Pressable>
              <Pressable style={styles.profileAvatar} onPress={() => router.push('/settings')}>
                {user?.avatar ? (
                  <Image source={{ uri: getImageUrl(user.avatar) }} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <>
                    <LinearGradient colors={['#fb7185', '#8b5cf6']} style={StyleSheet.absoluteFillObject} />
                    <User size={20} color="#fff" />
                  </>
                )}
                <View style={styles.activeIndicator} />
              </Pressable>
            </View>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Sparkles size={16} color="#fb7185" />
              <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
              <Pressable onPress={loadData} style={styles.retryBtn}>
                <ThemedText style={styles.retryText}>Thử lại</ThemedText>
              </Pressable>
            </View>
          )}

          {readerHome && user?.role === 'reader' && (
            <ReaderAssistantCard
              home={readerHome}
              onContinue={handleContinueReading}
              onOpenSeries={(item) => handleOpenSeries(item.id)}
            />
          )}

          {/* Featured Carousel */}
          <View style={styles.featuredWrap}>
            <ImageBackground source={{ uri: currentFeatured.cover }} style={styles.featuredCover} imageStyle={styles.featuredBgImage}>
              <LinearGradient colors={['transparent', 'rgba(10,5,22,0.92)']} style={styles.featuredOverlay} />
              <View style={styles.featuredContent}>
                <View style={styles.badgeWrap}>
                  <View style={styles.glassBadge}>
                    <Flame size={12} color="#fb7185" />
                    <ThemedText style={styles.badgeText}>Bán Chạy #1</ThemedText>
                  </View>
                  <View style={[styles.glassBadge, { borderColor: '#8b5cf6' }]}>
                    <Sparkles size={12} color="#c084fc" />
                    <ThemedText style={styles.badgeText}>{currentFeatured.genre}</ThemedText>
                  </View>
                </View>
                <ThemedText type="subtitle" style={styles.featuredTitle}>{currentFeatured.title}</ThemedText>
                <ThemedText style={styles.featuredSubtitle} numberOfLines={2}>{currentFeatured.subtitle}</ThemedText>
                
                <View style={styles.metaWrap}>
                  <ThemedText style={styles.metaPill}><Heart size={11} color="#f43f5e" /> {currentFeatured.votes}</ThemedText>
                  <ThemedText style={styles.metaPill}><BookOpen size={11} color="#a5b4fc" /> {currentFeatured.readers}</ThemedText>
                  <ThemedText style={styles.metaPill}><Star size={11} color="#fbbf24" /> {currentFeatured.rating}</ThemedText>
                </View>

                <View style={styles.carouselActionRow}>
                  <Pressable
                    onPress={() => handleOpenSeries(currentFeatured.id)}
                    style={({ pressed }) => [
                      styles.playBtnWrap,
                      pressed && { opacity: 0.9 }
                    ]}
                  >
                    <LinearGradient
                      colors={['#f43f5e', '#ec4899']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.playBtn}
                    >
                      <Play size={14} color="#fff" />
                      <ThemedText style={styles.playBtnText}>Đọc Ngay</ThemedText>
                    </LinearGradient>
                  </Pressable>
                  <View style={styles.dotIndicatorRow}>
                    {featuredSeries.map((_, i) => (
                      <Pressable key={i} onPress={() => setFeaturedIndex(i)} style={[styles.dot, featuredIndex === i && styles.dotActive]} />
                    ))}
                  </View>
                </View>
              </View>
            </ImageBackground>
          </View>

          {/* Search Row */}
          <Pressable
            onPress={() => router.push('/explore')}
            style={styles.searchRow}
          >
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.06)',
                }
              ]}
            >
              <Search size={16} color={isDark ? '#a5b4fc' : '#6366f1'} />
              <ThemedText themeColor="textSecondary" style={styles.searchText}>Tìm truyện, tác giả, chapter...</ThemedText>
            </View>
            <View
              style={[
                styles.iconPill,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.04)',
                  borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.06)',
                }
              ]}
            >
              <LayoutGrid size={18} color={isDark ? '#fff' : '#6366f1'} />
            </View>
          </Pressable>

          {/* Mood Selector horizontal scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
            {moods.map((mood) => (
              <Pressable
                key={mood}
                onPress={() => setActiveMood(mood)}
                style={[
                  styles.moodChip,
                  activeMood === mood && { borderColor: '#fb7185' },
                ]}
              >
                {activeMood === mood && (
                  <LinearGradient
                    colors={['rgba(244,63,94,0.2)', 'rgba(124,58,237,0.2)']}
                    style={StyleSheet.absoluteFillObject}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <ThemedText style={[styles.moodText, activeMood === mood && styles.moodTextActive]}>
                  {mood}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {continueReading.length > 0 && <>
          {/* Continue Reading Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={16} color="#38bdf8" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>TIẾP TỤC ĐỌC</ThemedText>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {continueReading.map((item) => (
              <Pressable key={item.id} onPress={() => handleContinueReading(item)} style={styles.resumeCard}>
                <View
                  style={[
                    styles.resumeCoverWrap,
                    { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)' }
                  ]}
                >
                  <Image source={{ uri: item.cover }} style={styles.resumeCover} contentFit="cover" />
                  <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.resumeOverlay} />
                  <View style={styles.progressWrap}>
                    <ThemedText style={styles.progressText}>{item.progress}</ThemedText>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${item.percent}%` }]} />
                    </View>
                  </View>
                </View>
                <ThemedText style={[styles.resumeTitle, { color: theme.text }]} numberOfLines={1}>{item.title}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
          </>}

          {/* Hot this week grid */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Flame size={16} color="#f43f5e" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>HOT TUẦN NÀY</ThemedText>
            </View>
            <View style={styles.shelfTabs}>
              {(['all', 'shared'] as const).map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setActiveShelfTab(tab)}
                  style={[
                    styles.shelfTab,
                    activeShelfTab === tab && styles.shelfTabActive,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.04)',
                      borderColor: activeShelfTab === tab ? '#fb7185' : 'transparent',
                    }
                  ]}
                >
                  <ThemedText style={[styles.shelfTabText, activeShelfTab === tab && styles.shelfTabTextActive, { color: activeShelfTab === tab ? '#fb7185' : theme.textSecondary }]}>
                    {tab === 'all' ? 'Tất cả' : 'Được chia sẻ'}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.grid}>
            {visibleHotSeries.map((item) => (
              <Pressable key={item.id} onPress={() => handleOpenSeries(item.id)} style={styles.gridCard}>
                <Image source={{ uri: item.cover }} style={styles.gridCover} contentFit="cover" />
                <LinearGradient colors={['transparent', 'rgba(10,5,22,0.95)']} style={styles.gridCardOverlay} />
                {item.hot && (
                  <View style={styles.hotBadge}>
                    <Flame size={10} color="#fff" />
                    <ThemedText style={styles.hotBadgeText}>HOT</ThemedText>
                  </View>
                )}
                {user && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleToggleSeriesSubscribe(item.id);
                    }}
                    disabled={subscribingSeriesId === item.id}
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: 'rgba(10,5,22,0.85)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.12)',
                      zIndex: 30,
                    }}
                  >
                    <Bell
                      size={12}
                      color={
                        item.subscribers?.includes(user._id)
                          ? '#fb7185'
                          : '#cbd5e1'
                      }
                      fill={
                        item.subscribers?.includes(user._id)
                          ? '#fb7185'
                          : 'none'
                      }
                    />
                  </Pressable>
                )}
                <View style={styles.gridTextWrap}>
                  <ThemedText style={styles.gridCardGenre}>{item.genre}</ThemedText>
                  <ThemedText style={styles.gridCardTitle} numberOfLines={1}>{item.title}</ThemedText>
                  <ThemedText style={styles.gridCardAuthor} numberOfLines={1}>Tác giả: {item.author}</ThemedText>
                  <View style={styles.gridMeta}>
                    <ThemedText style={styles.gridMetaText}>{item.chapters} ch.</ThemedText>
                    <ThemedText style={styles.gridMetaText}><Heart size={10} color="#f43f5e" /> {item.votes}</ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Reader Leaderboard Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Trophy size={16} color="#fbbf24" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>BẢNG XẾP HẠNG ĐỘC GIẢ</ThemedText>
            </View>
            <ThemedText style={styles.sectionActionText}>Tháng này</ThemedText>
          </View>

          <LinearGradient
            colors={isDark ? ['rgba(22,17,41,0.85)', 'rgba(39,29,74,0.45)'] : ['rgba(255,255,255,0.95)', 'rgba(240,240,243,0.7)']}
            style={[
              styles.leaderboardCard,
              { borderColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(15, 23, 42, 0.08)' }
            ]}
          >
            {leaderboard.map((row, idx) => (
              <View key={row.rank} style={[styles.leaderboardRow, idx === leaderboard.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rankCol}>
                  {row.rank === 1 ? (
                    <View style={[styles.rankCup, { backgroundColor: '#fbbf24' }]}><Trophy size={12} color="#0a051d" /></View>
                  ) : row.rank === 2 ? (
                    <View style={[styles.rankCup, { backgroundColor: '#e2e8f0' }]}><Award size={12} color="#0a051d" /></View>
                  ) : row.rank === 3 ? (
                    <View style={[styles.rankCup, { backgroundColor: '#b45309' }]}><Medal size={12} color="#0a051d" /></View>
                  ) : (
                    <ThemedText style={styles.rankNum}>#{row.rank}</ThemedText>
                  )}
                </View>

                <View style={styles.userCol}>
                  <View style={styles.leaderboardAvatar}>
                    <LinearGradient colors={['#a855f7', '#38bdf8']} style={StyleSheet.absoluteFillObject} />
                    <User size={13} color="#fff" />
                  </View>
                  <View>
                    <ThemedText style={[styles.leaderboardUsername, { color: theme.text }]}>{row.name}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.leaderboardBadge}>{row.badge}</ThemedText>
                  </View>
                </View>

                <View style={styles.statsCol}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                    style={[
                      styles.levelWrap,
                      { borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.06)' }
                    ]}
                  >
                    <View style={[styles.levelDot, { backgroundColor: row.color }]} />
                    <ThemedText style={[styles.levelText, { color: row.color }]}>{row.level}</ThemedText>
                  </LinearGradient>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <ThemedText themeColor="textSecondary" style={styles.votesText}>{row.rating}</ThemedText>
                    <Star size={10} color="#fbbf24" fill="#fbbf24" />
                  </View>
                </View>
              </View>
            ))}
          </LinearGradient>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerSubtitle: { color: '#fb7185', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, lineHeight: 32, fontWeight: '800' },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  activeIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', position: 'absolute', right: 0, bottom: 0, borderWidth: 1.5, borderColor: '#0a051d' },
  featuredWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.15)',
    elevation: 8,
    shadowColor: '#fb7185',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  featuredCover: { minHeight: 280, justifyContent: 'flex-end' },
  featuredBgImage: { borderRadius: 24 },
  featuredOverlay: { ...StyleSheet.absoluteFillObject },
  featuredContent: { padding: Spacing.four, gap: 10 },
  badgeWrap: { flexDirection: 'row', gap: 8 },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 17, 41, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  featuredTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  featuredSubtitle: { color: '#cbd5e1', fontSize: 13, lineHeight: 18, opacity: 0.9 },
  metaWrap: { flexDirection: 'row', gap: 12 },
  metaPill: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(22, 17, 41, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  carouselActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  playBtnWrap: { borderRadius: 999, overflow: 'hidden' },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10 },
  playBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  dotIndicatorRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { width: 16, height: 6, borderRadius: 3, backgroundColor: '#fb7185' },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  searchText: { fontSize: 13 },
  iconPill: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moodRow: { gap: 8, paddingVertical: 2 },
  moodChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  moodText: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  moodTextActive: { color: '#fff' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 13, letterSpacing: 1.5, fontWeight: '800' },
  sectionActionText: { color: '#6366f1', fontSize: 12, fontWeight: '700' },
  horizontalList: { gap: 12, paddingRight: Spacing.three },
  resumeCard: { width: 132, gap: 8 },
  resumeCoverWrap: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  resumeCover: { width: '100%', height: '100%' },
  resumeOverlay: { ...StyleSheet.absoluteFillObject },
  progressWrap: { position: 'absolute', bottom: 10, left: 10, right: 10, gap: 4 },
  progressText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  progressBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#fb7185', borderRadius: 2 },
  resumeTitle: { fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '48%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gridCover: { width: '100%', height: '100%' },
  gridCardOverlay: { ...StyleSheet.absoluteFillObject },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#f43f5e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 20,
  },
  hotBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  gridTextWrap: { position: 'absolute', bottom: 12, left: 12, right: 12, gap: 2, zIndex: 10 },
  gridCardGenre: { color: '#a5b4fc', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  gridCardTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridCardAuthor: { color: '#cbd5e1', fontSize: 10, fontWeight: '600', opacity: 0.9 },
  gridMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  gridMetaText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', flexDirection: 'row', alignItems: 'center', gap: 3 },
  leaderboardCard: {
    borderRadius: 24,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    backgroundColor: 'rgba(22, 17, 41, 0.45)',
    gap: 10,
  },
  shelfTabs: { flexDirection: 'row', gap: 8 },
  shelfTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.06)' },
  shelfTabActive: { backgroundColor: 'rgba(251,113,133,0.18)', borderWidth: 1, borderColor: '#fb7185' },
  shelfTabText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  shelfTabTextActive: { color: '#fff' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 10 },
  rankCol: { width: 30, alignItems: 'center' },
  rankCup: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankNum: { color: '#64748b', fontSize: 13, fontWeight: '800' },
  userCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  leaderboardAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  leaderboardUsername: { fontSize: 13, fontWeight: '800' },
  leaderboardBadge: { fontSize: 10 },
  statsCol: { alignItems: 'flex-end', gap: 2 },
  levelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  levelDot: { width: 5, height: 5, borderRadius: 2.5 },
  levelText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  votesText: { fontSize: 10, fontWeight: '700' },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
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
