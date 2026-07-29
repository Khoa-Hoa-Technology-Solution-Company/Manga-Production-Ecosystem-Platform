import { useCallback, useEffect, useMemo, useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View, ActivityIndicator, Alert, TextInput, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  BookOpen,
  Flame,
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
  RefreshCw,
} from 'lucide-react-native';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ReaderAssistantCard } from '@/components/reader-assistant-card';
import { seriesAPI, getImageUrl, readerAPI, type ReaderHome, type ContinueReadingItem } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useTranslation } from 'react-i18next';

const moodOptions = [
  { key: 'all', label: 'categories.all', value: null },
  { key: 'action', label: 'categories.action', value: 'Action' },
  { key: 'romance', label: 'categories.romance', value: 'Romance' },
  { key: 'scifi', label: 'categories.scifi', value: 'Sci-Fi' },
  { key: 'fantasy', label: 'categories.fantasy', value: 'Fantasy' },
  { key: 'sliceOfLife', label: 'categories.sliceOfLife', value: 'Slice of Life' },
  { key: 'horror', label: 'categories.horror', value: 'Horror' },
] as const;

const getReaderTier = (score: number) => {
  if (score >= 100) return { badge: 'Champion', level: 'Diamond', color: '#4e8190' };
  if (score >= 60) return { badge: 'Warrior', level: 'Platinum', color: '#7a5a43' };
  if (score >= 30) return { badge: 'Fire', level: 'Gold', color: '#a97822' };
  if (score >= 15) return { badge: 'Scholar', level: 'Silver', color: '#6f7b74' };
  return { badge: 'Reader', level: 'Bronze', color: '#6f7b74' };
};

const toSafeNumber = (value: unknown): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const uniqueById = <T extends { _id?: string }>(items: T[]): T[] => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = item?._id;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export default function HomeScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { user, logout } = useAuth();
  const [activeMood, setActiveMood] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
          t('notifications.title'),
          data.subscribed
            ? t('readerHome.subscribed')
            : t('readerHome.unsubscribed')
        );
      }
    } catch (err: any) {
      console.error('Failed to toggle series subscription:', err);
      Alert.alert(t('common.error'), err.message || t('readerHome.subscribeError'));
    } finally {
      setSubscribingSeriesId(null);
    }
  };

  // ── API data state ────────────────────────────────
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [readerHome, setReaderHome] = useState<ReaderHome | null>(null);
  const [activeShelfTab, setActiveShelfTab] = useState<'all' | 'shared'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setError(null);
    setRefreshing(true);

    const refreshRequests: Promise<unknown>[] = [readerAPI
      .getSeriesRankings('weekly')
      .then((data) => {
        setSeriesList(uniqueById(Array.isArray(data?.rankings) ? data.rankings : []));
      })
      .catch((err) => {
        console.error('Index load reader series rankings error:', err);
        setError(err.message || t('readerHome.seriesLoadError'));
      }),

    readerAPI
      .getLeaderboard('weekly')
      .then((data) => {
        setRankings((Array.isArray(data?.rankings) ? data.rankings : []).slice(0, 6));
      })
      .catch((err) => {
        console.error('Index load reader leaderboard error:', err);
        setError(err.message || t('readerHome.serverError'));
      })];

    if (user?.role === 'reader') {
      refreshRequests.push(readerAPI
        .getHome()
        .then(setReaderHome)
        .catch((err) => console.error('Reader assistant home error:', err)));
    }

    Promise.all(refreshRequests).finally(() => setRefreshing(false));
  }, [t, user?.role]);

  useEffect(() => {
    void loadData();
  }, [loadData, user?._id]);

  // ── Derived data ──────────────────────────────────
  const featuredSeries = useMemo(
    () =>
      (seriesList || []).slice(0, 1).map((s) => ({
        id: s._id,
        title: typeof s.title === 'string' ? s.title : t('readerHome.loading'),
        subtitle: s.description || '',
        genre: Array.isArray(s.genre) && typeof s.genre[0] === 'string' ? s.genre[0] : t('readerHome.unknownGenre'),
        readers: toSafeNumber(s.readerCount) ? `${(toSafeNumber(s.readerCount) / 1000).toFixed(0)}K` : '0',
        rating: toSafeNumber(s.averageRating).toFixed(1),
        cover: getImageUrl(s.coverImage) || '',
        accent: ['#1c2928', '#6b4d3a', '#c85745'],
      })),
    [seriesList, t]
  );

  const continueReading = useMemo(
    () =>
      (Array.isArray(readerHome?.continueReading) ? readerHome.continueReading : []).map((item) => ({
        ...item,
        cover: getImageUrl(item.coverImage) || '',
        progress: `Ch. ${item.chapterNumber}`,
        percent: item.percentage,
      })),
    [readerHome]
  );

  const hotSeries = useMemo(
    () =>
      (seriesList || []).map((s) => ({
        id: s._id,
        title: typeof s.title === 'string' ? s.title : t('readerHome.loading'),
        genre: Array.isArray(s.genre) && typeof s.genre[0] === 'string' ? s.genre[0] : t('readerHome.unknownGenre'),
        author: typeof s.mangakaId?.displayName === 'string' ? s.mangakaId.displayName : t('readerHome.unknownAuthor'),
        chapters: toSafeNumber(s.totalChapters),
        cover: getImageUrl(s.coverImage) || '',
        hot: toSafeNumber(s.averageRating) >= 4.5,
        rating: toSafeNumber(s.averageRating).toFixed(1),
        shared: Boolean(s.sharedWithMe),
        subscribers: Array.isArray(s.subscribers) ? s.subscribers : [],
      })),
    [seriesList, t]
  );

  const filteredHotSeries = useMemo(
    () => hotSeries.filter((item) => {
      const mood = moodOptions.find((option) => option.key === activeMood);
      const matchesMood = !mood?.value || item.genre === mood.value;
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || item.title.toLowerCase().includes(query) || item.author.toLowerCase().includes(query);
      return matchesMood && matchesSearch;
    }),
    [activeMood, hotSeries, searchQuery]
  );

  const sharedSeries = useMemo(() => hotSeries.filter((item) => item.shared), [hotSeries]);
  const visibleHotSeries = activeShelfTab === 'shared' ? sharedSeries : filteredHotSeries;

  const currentFeatured = featuredSeries[0] || {
    id: '',
    title: t('readerHome.loading'),
    subtitle: '',
    genre: '',
    readers: '0',
    rating: '0',
    cover: '',
    accent: ['#1c2928', '#6b4d3a', '#c85745'],
  };

  const leaderboard = useMemo(
    () =>
      (rankings || []).map((s, idx) => ({
        rank: s.rank || idx + 1,
        name: s.username || t('readerHome.unknownReader'),
        completedChapters: s.completedChapters || 0,
        score: s.score || 0,
        ...getReaderTier(s.score || 0),
      })),
    [rankings, t]
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
      {/* Quiet paper background shared with the web shell */}
      <View style={[styles.backgroundGlow, { backgroundColor: theme.background }]} />
      <View pointerEvents="none" style={styles.atmosphereLayer}>
        <View style={[styles.atmosphereOrb, styles.orbOne]} />
        <View style={[styles.atmosphereOrb, styles.orbTwo]} />
        <ThemedText style={[styles.atmosphereSparkle, styles.sparkleOne]}>✦</ThemedText>
        <ThemedText style={[styles.atmosphereSparkle, styles.sparkleTwo]}>✧</ThemedText>
      </View>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + insets.bottom + Spacing.five },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View>
              <View style={styles.badgeRow}>
                <Sparkles size={13} color="#59615b" />
                <ThemedText style={styles.headerSubtitle}>{t('readerHome.brand')}</ThemedText>
              </View>
              <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>{t('readerHome.title')}</ThemedText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                accessibilityLabel="Tải lại trang chủ"
                accessibilityRole="button"
                disabled={refreshing}
                onPress={loadData}
                style={[
                  styles.refreshBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,250,240,0.05)' : 'rgba(255,250,240,0.78)',
                    borderColor: isDark ? 'rgba(255,250,240,0.05)' : 'rgba(185,66,52,0.16)',
                    opacity: refreshing ? 0.65 : 1,
                  },
                ]}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={isDark ? '#d7cbb0' : '#6b4d3a'} />
                ) : (
                  <RefreshCw size={19} color={isDark ? '#d7cbb0' : '#6b4d3a'} />
                )}
              </Pressable>
              <Pressable
                style={[
                  styles.logoutBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,250,240,0.05)' : 'rgba(255,250,240,0.78)',
                    borderColor: isDark ? 'rgba(255,250,240,0.05)' : 'rgba(185,66,52,0.16)'
                  }
                ]}
                onPress={logout}
              >
                <LogOut size={20} color={isDark ? '#d7cbb0' : '#6b4d3a'} />
              </Pressable>
              <Pressable style={styles.profileAvatar} onPress={() => router.push('/settings')}>
                {user?.avatar ? (
                  <Image source={{ uri: getImageUrl(user.avatar) }} style={StyleSheet.absoluteFillObject} />
                ) : (
                  <>
                    <View style={StyleSheet.absoluteFillObject} />
                    <User size={20} color="#fffaf0" />
                  </>
                )}
                <View style={styles.activeIndicator} />
              </Pressable>
            </View>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Sparkles size={16} color="#c85745" />
              <ThemedText style={styles.errorBannerText}>{error}</ThemedText>
              <Pressable onPress={loadData} style={styles.retryBtn}>
                <ThemedText style={styles.retryText}>{t('readerHome.retry')}</ThemedText>
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
          {!!currentFeatured.id && <View style={styles.featuredWrap}>
            <ImageBackground source={{ uri: currentFeatured.cover }} style={styles.featuredCover} imageStyle={styles.featuredBgImage}>
              <View style={styles.featuredOverlay} />
              <View style={styles.featuredContent}>
                <View style={styles.badgeWrap}>
                  <View style={styles.glassBadge}>
                    <Flame size={12} color="#c85745" />
                    <ThemedText style={styles.badgeText}>{t('readerHome.trending')}</ThemedText>
                  </View>
                  <View style={[styles.glassBadge, { borderColor: '#7a5a43' }]}>
                    <Sparkles size={12} color="#b99977" />
                    <ThemedText style={styles.badgeText}>{currentFeatured.genre}</ThemedText>
                  </View>
                </View>
                <ThemedText type="subtitle" style={styles.featuredTitle}>{currentFeatured.title}</ThemedText>
                <ThemedText style={styles.featuredSubtitle} numberOfLines={2}>{currentFeatured.subtitle}</ThemedText>
                
                <View style={styles.metaWrap}>
                  <ThemedText style={styles.metaPill}><BookOpen size={11} color="#b9b59e" /> {currentFeatured.readers}</ThemedText>
                  <ThemedText style={styles.metaPill}><Star size={11} color="#c6942d" /> {currentFeatured.rating}</ThemedText>
                </View>

                <View style={styles.carouselActionRow}>
                  <Pressable
                    onPress={() => handleOpenSeries(currentFeatured.id)}
                    style={({ pressed }) => [
                      styles.playBtnWrap,
                      pressed && { opacity: 0.9 }
                    ]}
                  >
                    <View
                      style={styles.playBtn}
                    >
                      <Play size={14} color="#fffaf0" />
                      <ThemedText style={styles.playBtnText}>{t('readerHome.readNow')}</ThemedText>
                    </View>
                  </Pressable>
                </View>
              </View>
            </ImageBackground>
          </View>}

          {/* Search Row */}
          <View style={styles.searchRow}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(255,250,240,0.84)',
                  borderColor: isDark ? 'rgba(255,250,240,0.04)' : 'rgba(122,90,67,0.16)',
                }
              ]}
            >
              <Search size={16} color={isDark ? '#d7cbb0' : '#7a5a43'} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('readerHome.searchPlaceholder')}
                placeholderTextColor={isDark ? '#b9b59e' : '#8b7e68'}
                style={[styles.searchInput, { color: theme.text }]}
                returnKeyType="search"
              />
            </View>
            <View
              style={[
                styles.iconPill,
                {
                  backgroundColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(255,250,240,0.84)',
                  borderColor: isDark ? 'rgba(255,250,240,0.04)' : 'rgba(122,90,67,0.16)',
                }
              ]}
            >
              <LayoutGrid size={18} color={isDark ? '#fffaf0' : '#7a5a43'} />
            </View>
          </View>

          {/* Mood Selector horizontal scroll */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moodRow}>
            {moodOptions.map((mood) => (
              <Pressable
                key={mood.key}
                onPress={() => setActiveMood(mood.key)}
                style={[
                  styles.moodChip,
                  {
                    backgroundColor: isDark ? 'rgba(255,250,240,0.05)' : 'rgba(255,250,240,0.82)',
                    borderColor: activeMood === mood.key ? '#c85745' : (isDark ? 'rgba(255,250,240,0.08)' : 'rgba(185,66,52,0.12)'),
                  },
                ]}
              >
                {activeMood === mood.key && (
                  <View
                    style={StyleSheet.absoluteFillObject}
                  />
                )}
                <ThemedText style={[styles.moodText, activeMood === mood.key && styles.moodTextActive]}>
                  {t(mood.label)}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          {continueReading.length > 0 && <>
          {/* Continue Reading Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <TrendingUp size={16} color="#4e8190" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>{t('readerHome.continueReading')}</ThemedText>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {continueReading.map((item) => (
              <Pressable key={item.id} onPress={() => handleContinueReading(item)} style={styles.resumeCard}>
                <View
                  style={[
                    styles.resumeCoverWrap,
                    { borderColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(28,41,40, 0.08)' }
                  ]}
                >
                  <Image source={{ uri: item.cover }} style={styles.resumeCover} contentFit="cover" />
                  <View style={styles.resumeOverlay} />
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
              <Flame size={16} color="#59615b" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]}>{t('readerHome.hotThisWeek')}</ThemedText>
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
                      backgroundColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(28,41,40, 0.04)',
                      borderColor: activeShelfTab === tab ? '#1c2928' : 'transparent',
                    }
                  ]}
                >
                  <ThemedText style={[styles.shelfTabText, activeShelfTab === tab && styles.shelfTabTextActive, { color: activeShelfTab === tab ? '#1c2928' : theme.textSecondary }]}>
                    {tab === 'all' ? t('readerHome.all') : t('readerHome.shared')}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.grid}>
            {visibleHotSeries.map((item) => (
              <Pressable key={item.id} onPress={() => handleOpenSeries(item.id)} style={styles.gridCard}>
                <Image source={{ uri: item.cover }} style={styles.gridCover} contentFit="cover" />
                <View style={styles.gridCardOverlay} />
                {item.hot && (
                  <View style={styles.hotBadge}>
                    <Flame size={10} color="#fffaf0" />
                    <ThemedText style={styles.hotBadgeText}>{t('readerHome.hot')}</ThemedText>
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
                      backgroundColor: 'rgba(28,41,40,0.85)',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,250,240,0.12)',
                      zIndex: 30,
                    }}
                  >
                    <Bell
                      size={12}
                      color={
                        item.subscribers?.includes(user._id)
                          ? '#c85745'
                          : '#c9c8b8'
                      }
                      fill={
                        item.subscribers?.includes(user._id)
                          ? '#c85745'
                          : 'none'
                      }
                    />
                  </Pressable>
                )}
                <View style={styles.gridTextWrap}>
                  <ThemedText style={styles.gridCardGenre}>{item.genre}</ThemedText>
                  <ThemedText style={styles.gridCardTitle} numberOfLines={1}>{item.title}</ThemedText>
                  <ThemedText style={styles.gridCardAuthor} numberOfLines={1}>{t('readerHome.author', { name: item.author })}</ThemedText>
                  <View style={styles.gridMeta}>
                  <ThemedText style={styles.gridMetaText}>{t('readerHome.chapter', { count: item.chapters })}</ThemedText>
                    <ThemedText style={styles.gridMetaText}><Star size={10} color="#c6942d" fill="#c6942d" /> {item.rating}</ThemedText>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          {/* Reader Leaderboard Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Trophy size={16} color="#c6942d" />
              <ThemedText type="smallBold" style={[styles.sectionTitle, { color: theme.text }]} numberOfLines={1}>{t('readerHome.readerLeaderboard')}</ThemedText>
            </View>
            <ThemedText style={styles.sectionActionText} numberOfLines={1}>{t('readerHome.thisWeek')}</ThemedText>
          </View>

          <View
            style={[
              styles.leaderboardCard,
              {
                backgroundColor: isDark ? '#35433e' : '#fffaf0',
                borderColor: isDark ? '#4b5a52' : '#cbbda5',
              }
            ]}
          >
            {leaderboard.length === 0 ? (
              <ThemedText themeColor="textSecondary" style={styles.leaderboardEmpty}>{t('readerHome.noReadingActivity')}</ThemedText>
            ) : leaderboard.map((row, idx) => (
              <View key={row.rank} style={[styles.leaderboardRow, idx === leaderboard.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.rankCol}>
                  {row.rank === 1 ? (
                    <View style={[styles.rankCup, { backgroundColor: '#c6942d' }]}><Trophy size={12} color="#1c2928" /></View>
                  ) : row.rank === 2 ? (
                    <View style={[styles.rankCup, { backgroundColor: '#d9cdb8' }]}><Award size={12} color="#1c2928" /></View>
                  ) : row.rank === 3 ? (
                    <View style={[styles.rankCup, { backgroundColor: '#97691e' }]}><Medal size={12} color="#1c2928" /></View>
                  ) : (
                    <ThemedText style={styles.rankNum}>#{row.rank}</ThemedText>
                  )}
                </View>

                <View style={styles.userCol}>
                  <View style={styles.leaderboardAvatar}>
                    <View style={StyleSheet.absoluteFillObject} />
                    <User size={13} color="#fffaf0" />
                  </View>
                  <View>
                    <ThemedText style={[styles.leaderboardUsername, { color: theme.text }]}>{row.name}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.leaderboardBadge}>
                      {row.badge} · {t('readerHome.completedChapters', { count: row.completedChapters })}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.statsCol}>
                  <View
                    style={[
                      styles.levelWrap,
                      { borderColor: isDark ? 'rgba(255,250,240,0.05)' : 'rgba(28,41,40,0.06)' }
                    ]}
                  >
                    <View style={[styles.levelDot, { backgroundColor: row.color }]} />
                    <ThemedText style={[styles.levelText, { color: row.color }]}>{row.level}</ThemedText>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 4 }}>
                    <ThemedText themeColor="textSecondary" style={styles.ratingText}>{row.score}</ThemedText>
                    <ThemedText themeColor="textSecondary" style={styles.scoreLabel}>{t('readerHome.points')}</ThemedText>
                  </View>
                </View>
              </View>
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
  atmosphereLayer: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  atmosphereOrb: { position: 'absolute', borderRadius: 999 },
  orbOne: {
    width: 260,
    height: 260,
    top: -90,
    right: -110,
    backgroundColor: 'rgba(95,91,84,0.035)',
  },
  orbTwo: {
    width: 220,
    height: 220,
    top: 300,
    left: -150,
    backgroundColor: 'rgba(95,91,84,0.025)',
  },
  atmosphereSparkle: {
    position: 'absolute',
    color: '#918f83',
    fontSize: 28,
    fontWeight: '800',
    opacity: 0.34,
  },
  sparkleOne: { top: 112, right: 28 },
  sparkleTwo: { top: 420, left: 20, color: '#b7b2a4', fontSize: 22 },
  safeArea: { flex: 1 },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.four },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerSubtitle: { color: '#59615b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  headerTitle: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.7 },
  refreshBtn: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  profileAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,250,240,0.2)', backgroundColor: '#b94234' },
  activeIndicator: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#357053', position: 'absolute', right: 0, bottom: 0, borderWidth: 1.5, borderColor: '#1c2928' },
  featuredWrap: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(185,66,52, 0.15)',
    elevation: 8,
    shadowColor: '#c85745',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  featuredCover: { minHeight: 280, justifyContent: 'flex-end' },
  featuredBgImage: { borderRadius: 24 },
  featuredOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,41,40,0.42)' },
  featuredContent: { padding: Spacing.four, gap: 10 },
  badgeWrap: { flexDirection: 'row', gap: 8 },
  glassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(39,52,49, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255,250,240, 0.08)',
  },
  badgeText: { color: '#fffaf0', fontSize: 11, fontWeight: '800' },
  featuredTitle: {
    color: '#fffaf0',
    fontSize: 26,
    fontWeight: '900',
    textShadowColor: 'rgba(28,41,40,0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  featuredSubtitle: { color: '#c9c8b8', fontSize: 13, lineHeight: 18, opacity: 0.9 },
  metaWrap: { flexDirection: 'row', gap: 12 },
  metaPill: {
    color: '#fffaf0',
    fontSize: 11,
    fontWeight: '700',
    backgroundColor: 'rgba(39,52,49, 0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,250,240,0.05)',
  },
  carouselActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  playBtnWrap: { borderRadius: 999, overflow: 'hidden' },
  playBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, backgroundColor: '#b94234' },
  playBtnText: { color: '#fffaf0', fontWeight: '800', fontSize: 13 },
  dotIndicatorRow: { flexDirection: 'row', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,250,240,0.3)' },
  dotActive: { width: 16, height: 6, borderRadius: 3, backgroundColor: '#1c2928' },
  searchRow: { flexDirection: 'row', gap: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  searchText: { fontSize: 13 },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 0 },
  iconPill: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  moodRow: { gap: 8, paddingVertical: 2 },
  moodChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, backgroundColor: '#fffaf0', borderWidth: 1, borderColor: '#d9cdb8', overflow: 'hidden' },
  moodText: { color: '#59615b', fontSize: 13, fontWeight: '600' },
  moodTextActive: { color: '#1c2928' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  sectionTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { flexShrink: 1, fontSize: 13, letterSpacing: 0.4, fontWeight: '700' },
  sectionActionText: { flexShrink: 0, marginLeft: Spacing.two, color: '#59615b', fontSize: 12, fontWeight: '700' },
  horizontalList: { gap: 12, paddingRight: Spacing.three },
  resumeCard: { width: 132, gap: 8 },
  resumeCoverWrap: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,250,240,0.06)',
    shadowColor: '#1c2928',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  resumeCover: { width: '100%', height: '100%' },
  resumeOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,41,40,0.32)' },
  progressWrap: { position: 'absolute', bottom: 10, left: 10, right: 10, gap: 4 },
  progressText: { color: '#fffaf0', fontSize: 11, fontWeight: '800' },
  progressBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,250,240,0.2)', overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#1c2928', borderRadius: 2 },
  resumeTitle: { fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridCard: {
    width: '48%',
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,250,240,0.06)',
    position: 'relative',
    shadowColor: '#1c2928',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gridCover: { width: '100%', height: '100%' },
  gridCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(28,41,40,0.42)' },
  hotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#b94234',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    zIndex: 20,
  },
  hotBadgeText: { color: '#fffaf0', fontSize: 9, fontWeight: '900' },
  gridTextWrap: { position: 'absolute', bottom: 12, left: 12, right: 12, gap: 2, zIndex: 10 },
  gridCardGenre: { color: '#b9b59e', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  gridCardTitle: {
    color: '#fffaf0',
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: 'rgba(28,41,40,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  gridCardAuthor: { color: '#c9c8b8', fontSize: 10, fontWeight: '600', opacity: 0.9 },
  gridMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  gridMetaText: { color: '#c9c8b8', fontSize: 11, fontWeight: '700', flexDirection: 'row', alignItems: 'center', gap: 3 },
  leaderboardCard: {
    borderRadius: 24,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: '#cbbda5',
    backgroundColor: '#fffaf0',
    gap: 10,
  },
  shelfTabs: { flexDirection: 'row', gap: 8 },
  shelfTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: 'rgba(255,250,240,0.06)' },
  shelfTabActive: { backgroundColor: 'rgba(200,87,69,0.18)', borderWidth: 1, borderColor: '#c85745' },
  shelfTabText: { color: '#9aa39a', fontSize: 11, fontWeight: '700' },
  shelfTabTextActive: { color: '#fffaf0' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e9ddc7', paddingBottom: 10 },
  rankCol: { width: 30, alignItems: 'center' },
  rankCup: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  rankNum: { color: '#6f7b74', fontSize: 13, fontWeight: '800' },
  userCol: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  leaderboardAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#52707b' },
  leaderboardUsername: { fontSize: 13, fontWeight: '800' },
  leaderboardBadge: { fontSize: 10 },
  leaderboardEmpty: { textAlign: 'center', paddingVertical: 12, fontSize: 12 },
  statsCol: { alignItems: 'flex-end', gap: 2 },
  levelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  levelDot: { width: 5, height: 5, borderRadius: 2.5 },
  levelText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  ratingText: { fontSize: 10, fontWeight: '700' },
  scoreLabel: { fontSize: 10, fontWeight: '700' },
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
    backgroundColor: 'rgba(185,66,52,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(185,66,52,0.3)',
    borderRadius: 16,
    padding: 12,
    marginTop: 10,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: '#c85745',
    fontSize: 12,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: '#c85745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryText: {
    color: '#fffaf0',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
