import { useMemo, useState, useRef, useEffect } from 'react';
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Animated,
  Dimensions,
  TextInput,
  GestureResponderEvent,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Download,
  Heart,
  Maximize2,
  MessageCircle,
  MoonStar,
  PanelTop,
  Play,
  Sparkles,
  Star,
  Share2,
  Volume2,
  ZoomIn,
  ThumbsUp,
  X,
  Send,
  Settings,
  Sliders,
  Sun,
  Activity,
  ZoomOut,
  ChevronDown,
  Pause,
  Bell,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { seriesAPI, chaptersAPI, pagesAPI, commentsAPI, votesAPI, getImageUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const { width: screenWidth } = Dimensions.get('window');

const quickReactions = [
  { emoji: '🔥', label: 'Fire' },
  { emoji: '❤️', label: 'Love' },
  { emoji: '😮', label: 'Shock' },
  { emoji: '😭', label: 'Sad' },
  { emoji: '👏', label: 'Clap' },
];

function FloatingEmoji({ emoji, onComplete }: { emoji: string; onComplete: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 1600,
      useNativeDriver: true,
    }).start(onComplete);
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -220],
  });

  const translateX = anim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, Math.random() > 0.5 ? 20 : -20, Math.random() > 0.5 ? 40 : -40],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [1, 1, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.15, 1],
    outputRange: [0.5, 1.3, 0.7],
  });

  const rotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', Math.random() > 0.5 ? '25deg' : '-25deg'],
  });

  return (
    <Animated.View
      style={[
        styles.floatingEmojiContainer,
        {
          transform: [{ translateY }, { translateX }, { scale }, { rotate }],
          opacity,
        },
      ]}
    >
      <ThemedText style={{ fontSize: 32 }}>{emoji}</ThemedText>
    </Animated.View>
  );
}

// Curated Harmonies / Premium Design Themes
const themes = {
  light: {
    bg: '#ffffff',
    text: '#0f172a',
    subText: '#475569',
    cardBg: 'rgba(241,245,249,0.92)',
    cardBorder: 'rgba(226,232,240,0.8)',
    inputBg: 'rgba(0,0,0,0.05)',
    inputText: '#000000',
    primary: '#fb7185',
    glowColors: ['#f8fafc', '#f1f5f9'] as [string, string],
  },
  dark: {
    bg: '#07020d',
    text: '#f8fafc',
    subText: '#cbd5e1',
    cardBg: 'rgba(22,17,41,0.85)',
    cardBorder: 'rgba(255,255,255,0.06)',
    inputBg: 'rgba(255,255,255,0.06)',
    inputText: '#ffffff',
    primary: '#f43f5e',
    glowColors: ['#0e051d', '#07020e'] as [string, string],
  },
  sepia: {
    bg: '#f4ece1',
    text: '#433422',
    subText: '#5f4b32',
    cardBg: 'rgba(235,224,209,0.92)',
    cardBorder: 'rgba(67,52,34,0.15)',
    inputBg: 'rgba(0,0,0,0.04)',
    inputText: '#433422',
    primary: '#ea580c',
    glowColors: ['#faf7f2', '#f4ece1'] as [string, string],
  },
  cinema: {
    bg: '#000000',
    text: '#e2e8f0',
    subText: '#94a3b8',
    cardBg: 'rgba(15,15,15,0.95)',
    cardBorder: 'rgba(255,255,255,0.08)',
    inputBg: 'rgba(255,255,255,0.08)',
    inputText: '#ffffff',
    primary: '#fb7185',
    glowColors: ['#000000', '#000000'] as [string, string],
  },
};

export default function ReaderScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { seriesId } = useLocalSearchParams<{ seriesId: string }>();
  const { width: screenWidth } = Dimensions.get('window');

  const { user } = useAuth();
  const [subscribingSeries, setSubscribingSeries] = useState(false);

  const handleToggleSeriesSubscribe = async () => {
    if (!user || !seriesId) return;
    setSubscribingSeries(true);
    try {
      const data = await seriesAPI.subscribe(seriesId);
      if (data?.series) {
        setSeriesData(data.series);
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
      setSubscribingSeries(false);
    }
  };

  // Reading settings & customization states
  const [immersiveMode, setImmersiveMode] = useState(false);
  const [bgTheme, setBgTheme] = useState<'light' | 'dark' | 'sepia' | 'cinema'>('dark');
  const [brightnessLevel, setBrightnessLevel] = useState(100); // 20% to 100%
  const [autoScroll, setAutoScroll] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(2); // 1 to 5
  const [zoomScale, setZoomScale] = useState(1); // 1x, 1.25x, 1.5x, 2x
  const [showSettings, setShowSettings] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Standard reader states
  const [readingMode, setReadingMode] = useState<'scroll' | 'cinema'>('scroll');
  const [currentPage, setCurrentPage] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [voted, setVoted] = useState(false);
  const [voteCount, setVoteCount] = useState<number>(0);
  const [userRating, setUserRating] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [showCommentsTray, setShowCommentsTray] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // ── Backend API Cascade State ──────────────────
  const [loading, setLoading] = useState(true);
  const [seriesData, setSeriesData] = useState<any>(null);
  const [chapters, setChapters] = useState<any[]>([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Fetch series details and chapters
  const loadSeriesData = () => {
    if (!seriesId) return;
    setError(null);
    setLoading(true);

    Promise.all([
      seriesAPI.getById(seriesId),
      chaptersAPI.getBySeries(seriesId)
    ])
      .then(([sData, cData]) => {
        setSeriesData(sData);
        const chs = cData.chapters || [];
        setChapters(chs);
        if (chs.length > 0) {
          setActiveChapterIndex(0);
        }
      })
      .catch((err) => {
        console.error('Read screen series load error:', err);
        setError(err.message || 'Không thể kết nối đến máy chủ.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSeriesData();
  }, [seriesId]);

  // Fetch pages and comments cascade when active chapter changes
  useEffect(() => {
    const currentChapter = chapters[activeChapterIndex];
    if (!currentChapter) return;

    setLoadingPages(true);
    setError(null);

    Promise.all([
      pagesAPI.getByChapter(currentChapter._id),
      commentsAPI.getByChapter(currentChapter._id)
    ])
      .then(([pData, cData]) => {
        const fetchedPages = (pData.pages || [])
          .map((p: any) => getImageUrl(p.imageUrl))
          .filter((url): url is string => !!url);
        setPages(fetchedPages.length > 0 ? fetchedPages : [
          'https://picsum.photos/seed/p1/900/1200',
          'https://picsum.photos/seed/p2/900/1200',
          'https://picsum.photos/seed/p3/900/1200'
        ]);

        const fetchedComments = (cData.comments || []).map((c: any) => ({
          id: c._id,
          user: c.userId?.displayName || 'Cộng đồng',
          initials: (c.userId?.displayName || 'C').slice(0, 2).toUpperCase(),
          time: new Date(c.createdAt).toLocaleDateString('vi-VN') || 'Vừa xong',
          text: c.content,
          likes: c.likesCount || 0,
          liked: false,
          color: ['#fb7185', '#f43f5e'],
          replies: []
        }));
        setComments(fetchedComments);
      })
      .catch((err) => {
        console.error('Read screen pages load error:', err);
        setError(err.message || 'Không thể kết nối đến máy chủ để tải nội dung chương.');
      })
      .finally(() => setLoadingPages(false));
  }, [activeChapterIndex, chapters]);

  // Derive series metadata
  const series = useMemo(() => {
    if (!seriesData) {
      return {
        title: 'Đang tải...',
        chapter: 'Ch. 1',
        titleEn: 'Loading...',
        genre: 'Action',
        author: '...',
        mood: 'Immersive',
        publishedDate: '...',
        cover: 'https://picsum.photos/800/1200',
        totalPages: 0,
        rating: 4.9,
        ratingCount: 120,
        voteCount: 0,
      };
    }
    const currentChapter = chapters[activeChapterIndex];
    return {
      title: seriesData.title,
      chapter: currentChapter ? `Chương ${currentChapter.chapterNumber}` : 'Đang tải...',
      titleEn: currentChapter?.title || seriesData.title,
      genre: seriesData.genre?.[0] || 'Unknown',
      author: seriesData.mangakaId?.displayName || 'Unknown Author',
      mood: seriesData.genre?.join(', ') || 'Hấp dẫn, kịch tính',
      publishedDate: currentChapter ? new Date(currentChapter.createdAt).toLocaleDateString('vi-VN') : 'Mới cập nhật',
      cover: getImageUrl(seriesData.coverImage) || `https://picsum.photos/seed/${seriesData._id}/800/1200`,
      totalPages: pages.length,
      rating: 4.9,
      ratingCount: 154,
      voteCount: seriesData.totalVotes || 0,
    };
  }, [seriesData, chapters, activeChapterIndex, pages]);

  // Sync voteCount with seriesData
  useEffect(() => {
    if (seriesData) {
      setVoteCount(seriesData.totalVotes || 0);
    }
  }, [seriesData]);

  const handleNextChapter = () => {
    if (activeChapterIndex < chapters.length - 1) {
      setActiveChapterIndex((idx) => idx + 1);
      setCurrentPage(0);
      setScrollProgress(0);
      scrollYRef.current = 0;
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  // Auto-scroll loop engine
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const autoScrollInterval = useRef<any>(null);

  // Touch gesture swiping variables for Cinema Mode
  const touchStartX = useRef(0);

  const currentTheme = themes[bgTheme];

  useEffect(() => {
    if (autoScroll && readingMode === 'scroll') {
      let lastTime = Date.now();
      const tick = () => {
        if (!autoScroll) return;
        const speedMap = [10, 22, 45, 90, 180]; // speed in pixels per second
        const pixelsPerSecond = speedMap[scrollSpeed - 1] || 45;
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;

        scrollYRef.current += pixelsPerSecond * delta;
        scrollViewRef.current?.scrollTo({
          y: scrollYRef.current,
          animated: false,
        });
        autoScrollInterval.current = requestAnimationFrame(tick);
      };
      autoScrollInterval.current = requestAnimationFrame(tick);
    } else {
      if (autoScrollInterval.current) {
        cancelAnimationFrame(autoScrollInterval.current);
      }
    }
    return () => {
      if (autoScrollInterval.current) {
        cancelAnimationFrame(autoScrollInterval.current);
      }
    };
  }, [autoScroll, scrollSpeed, readingMode]);

  // Touch Swipe Handlers for Cinema Mode
  const handleTouchStart = (e: GestureResponderEvent) => {
    touchStartX.current = e.nativeEvent.pageX;
  };

  const handleTouchEnd = (e: GestureResponderEvent) => {
    const touchEndX = e.nativeEvent.pageX;
    const deltaX = touchEndX - touchStartX.current;
    if (deltaX > 60) {
      // Swipe Right -> Turn to previous page
      setCurrentPage((p) => Math.max(0, p - 1));
    } else if (deltaX < -60) {
      // Swipe Left -> Turn to next page
      setCurrentPage((p) => Math.min(pages.length - 1, p + 1));
    }
  };

  // Animated Floating Reactions
  const [activeFloatingReactions, setActiveFloatingReactions] = useState<
    { id: string; emoji: string }[]
  >([]);

  const triggerReaction = (emoji: string) => {
    const newId = Date.now().toString() + Math.random().toString();
    setActiveFloatingReactions((prev) => [...prev, { id: newId, emoji }]);
  };

  const removeFloatingReaction = (id: string) => {
    setActiveFloatingReactions((prev) => prev.filter((r) => r.id !== id));
  };

  const handleVote = () => {
    const currentChapter = chapters[activeChapterIndex];
    if (!currentChapter) return;
    votesAPI
      .vote(currentChapter._id, { seriesId: currentChapter.seriesId })
      .then(() => {
        if (voted) {
          setVoteCount((v) => Math.max(0, v - 1));
          setVoted(false);
          Alert.alert("Bình chọn", "Đã rút lại bình chọn cho chương này.");
        } else {
          setVoteCount((v) => v + 1);
          setVoted(true);
          Alert.alert("Bình chọn", "Cảm ơn bạn đã bình chọn cho chương này!");
        }
      })
      .catch((err) => {
        console.error('Vote error:', err);
        Alert.alert("Lỗi", err.message || "Không thể thực hiện bình chọn.");
      });
  };

  const handleAddComment = () => {
    if (!newCommentText.trim()) return;
    const currentChapter = chapters[activeChapterIndex];
    if (!currentChapter) return;
    commentsAPI
      .create(currentChapter._id, { content: newCommentText })
      .then((data) => {
        const comment = data.comment || {};
        const newComment = {
          id: comment._id || Date.now().toString(),
          user: comment.userId?.displayName || 'Bạn (Reader)',
          initials: (comment.userId?.displayName || 'YO').slice(0, 2).toUpperCase(),
          time: 'Vừa xong',
          text: comment.content || newCommentText,
          likes: 0,
          liked: false,
          color: ['#fb7185', '#f43f5e'],
          replies: [],
        };
        setComments((prev) => [newComment, ...prev]);
        setNewCommentText('');
      })
      .catch((err) => {
        console.error('Add comment error:', err);
        Alert.alert("Lỗi", err.message || "Không thể gửi bình luận.");
      });
  };

  const handleAddReply = (commentId: string) => {
    if (!replyText.trim()) return;
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [
              ...c.replies,
              {
                id: Date.now().toString(),
                user: 'Bạn (Reader)',
                initials: 'YO',
                time: 'Vừa xong',
                text: replyText,
                likes: 0,
                liked: false,
                color: ['#fb7185', '#f43f5e'],
              },
            ],
          };
        }
        return c;
      })
    );
    setReplyText('');
    setReplyingToId(null);
  };

  const handleLikeComment = (commentId: string, replyId?: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (!replyId && c.id === commentId) {
          return {
            ...c,
            liked: !c.liked,
            likes: c.liked ? c.likes - 1 : c.likes + 1,
          };
        }
        if (replyId && c.id === commentId) {
          return {
            ...c,
            replies: c.replies.map((r: any) =>
              r.id === replyId ? { ...r, liked: !r.liked, likes: r.liked ? r.likes - 1 : r.likes + 1 } : r
            ),
          };
        }
        return c;
      })
    );
  };

  const showUI = !immersiveMode;

  return (
    <ThemedView style={[styles.screen, { backgroundColor: currentTheme.bg }]}>
      {/* Background glow lines */}
      <LinearGradient colors={currentTheme.glowColors} style={StyleSheet.absoluteFillObject} />

      {/* Global Brightness Dimming Overlay */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#000000',
            opacity: Math.max(0, Math.min(0.8, 1 - brightnessLevel / 100)),
            zIndex: 999,
          },
        ]}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Immersive Top Bar */}
        {showUI && (
          <View style={[styles.topBar, { backgroundColor: currentTheme.cardBg, borderBottomColor: currentTheme.cardBorder }]}>
            <Pressable onPress={() => router.back()} style={styles.iconCircle}>
              <ChevronLeft size={20} color={currentTheme.text} />
            </Pressable>

            <View style={styles.topTitleCol}>
              <ThemedText style={[styles.topTitleText, { color: currentTheme.text }]} numberOfLines={1}>{series.title}</ThemedText>
              <ThemedText style={[styles.topSubtitleText, { color: currentTheme.subText }]} numberOfLines={1}>
                {series.chapter} — {series.titleEn}
              </ThemedText>
            </View>

            <View style={styles.topActions}>
              <Pressable
                onPress={() => setShowSettings(true)}
                style={[styles.iconCircle, { width: 36 }]}
              >
                <Settings size={16} color={currentTheme.primary} />
              </Pressable>

              {user && (
                <Pressable
                  onPress={handleToggleSeriesSubscribe}
                  disabled={subscribingSeries}
                  style={[styles.iconCircle, { width: 52, height: 52, borderRadius: 26 }]}
                >
                  <Bell
                    size={32}
                    color={
                      seriesData?.subscribers?.includes(user._id)
                        ? '#6366f1'
                        : currentTheme.text
                    }
                    fill={
                      seriesData?.subscribers?.includes(user._id)
                        ? '#6366f1'
                        : 'none'
                    }
                  />
                </Pressable>
              )}

              <Pressable onPress={() => setBookmarked(!bookmarked)} style={styles.iconCircle}>
                <Heart size={16} color={bookmarked ? '#f43f5e' : currentTheme.text} fill={bookmarked ? '#f43f5e' : 'none'} />
              </Pressable>

              <Pressable onPress={() => setShowCommentsTray(true)} style={styles.iconCircle}>
                <MessageCircle size={16} color={currentTheme.text} />
                <View style={styles.commentsDot} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Floating Bubble Canvas Overlay */}
        <View style={styles.bubbleOverlay} pointerEvents="none">
          {activeFloatingReactions.map((reaction) => (
            <FloatingEmoji
              key={reaction.id}
              emoji={reaction.emoji}
              onComplete={() => removeFloatingReaction(reaction.id)}
            />
          ))}
        </View>

        {/* Floating Zoom Panel */}
        {showUI && (
          <View style={[styles.floatingZoomPanel, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder }]}>
            <Pressable
              onPress={() => setZoomScale((z) => Math.min(2, z + 0.25))}
              style={styles.zoomPillBtn}
            >
              <ZoomIn size={16} color={currentTheme.text} />
            </Pressable>

            <View style={styles.zoomValueBadge}>
              <ThemedText style={[styles.zoomValueText, { color: currentTheme.text }]}>{zoomScale}x</ThemedText>
            </View>

            <Pressable
              onPress={() => setZoomScale((z) => Math.max(1, z - 0.25))}
              style={styles.zoomPillBtn}
            >
              <ZoomOut size={16} color={currentTheme.text} />
            </Pressable>
          </View>
        )}

        {/* Immersive HUD toggle feedback indicator */}
        {!showUI && (
          <Pressable
            onPress={() => setImmersiveMode(false)}
            style={styles.floatingShowUIHint}
          >
            <ChevronDown size={14} color="#ffffff" />
            <ThemedText style={styles.showUIHintText}>Hiện Menu</ThemedText>
          </Pressable>
        )}

        {/* Reader Display Area */}
        <View style={styles.displayArea}>
          {error ? (
            <View style={styles.fullscreenErrorWrap}>
              <Sparkles size={36} color="#fb7185" style={{ marginBottom: 12 }} />
              <ThemedText style={styles.fullscreenErrorTitle}>Không thể tải nội dung</ThemedText>
              <ThemedText style={styles.fullscreenErrorText}>{error}</ThemedText>
              <Pressable onPress={loadSeriesData} style={styles.fullscreenRetryBtn}>
                <ThemedText style={styles.fullscreenRetryText}>Thử lại</ThemedText>
              </Pressable>
            </View>
          ) : readingMode === 'scroll' ? (
            <ScrollView
              ref={scrollViewRef}
              contentContainerStyle={[styles.scrollReaderContent, { backgroundColor: currentTheme.bg }]}
              showsVerticalScrollIndicator={false}
              onScroll={(event) => {
                const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
                if (!autoScroll) {
                  scrollYRef.current = contentOffset.y;
                }
                const scrollY = contentOffset.y;
                const maxScroll = contentSize.height - layoutMeasurement.height;
                if (maxScroll > 0) {
                  setScrollProgress(Math.min(100, Math.max(0, (scrollY / maxScroll) * 100)));
                }
              }}
              scrollEventThrottle={16}
            >
              {/* Cover intro strip */}
              <View style={[styles.chapterIntroCard, { borderColor: currentTheme.cardBorder }]}>
                <ImageBackground source={{ uri: series.cover }} style={styles.introCover} imageStyle={{ borderRadius: 20 }}>
                  <LinearGradient colors={['transparent', 'rgba(10,5,22,0.96)']} style={styles.introOverlay} />
                  <View style={styles.introDetails}>
                    <View style={styles.badgeWrap}>
                      <View style={styles.introBadge}><Sparkles size={11} color="#fb7185" /><ThemedText style={styles.introBadgeText}>Immersive</ThemedText></View>
                      <View style={styles.introBadge}><MoonStar size={11} color="#a855f7" /><ThemedText style={styles.introBadgeText}>{series.mood}</ThemedText></View>
                    </View>
                    <ThemedText style={styles.introTitle}>{series.title}</ThemedText>
                    <ThemedText style={styles.introMeta}>
                      Tác giả: {series.author} • {series.genre} • Xuất bản: {series.publishedDate}
                    </ThemedText>
                  </View>
                </ImageBackground>
              </View>

              {/* Pages Cascade */}
              <View style={styles.pagesCascade}>
                {pages.map((url, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => setImmersiveMode((prev) => !prev)}
                    style={[styles.pageCard, { backgroundColor: currentTheme.bg, borderColor: currentTheme.cardBorder }]}
                  >
                    <Image
                      source={{ uri: url }}
                      style={[styles.pageImage, { transform: [{ scale: zoomScale }] }]}
                      contentFit="contain"
                    />
                    <LinearGradient colors={['rgba(255,255,255,0.02)', 'transparent']} style={StyleSheet.absoluteFillObject} />
                    <View style={styles.pageNumberBadge}>
                      <ThemedText style={styles.pageNumberText}>{idx + 1} / {pages.length}</ThemedText>
                    </View>
                  </Pressable>
                ))}
              </View>

              {/* Reader Interaction Footers */}
              <View style={styles.interactionWrap}>
                {/* Five star rating widget */}
                <LinearGradient colors={[currentTheme.cardBg, 'rgba(39,29,74,0.1)']} style={[styles.ratingCard, { borderColor: currentTheme.cardBorder }]}>
                  <View style={styles.ratingCardHeader}>
                    <ThemedText style={[styles.ratingCardTitle, { color: currentTheme.text }]}>Đánh giá chương truyện</ThemedText>
                    <ThemedText style={[styles.ratingCount, { color: currentTheme.subText }]}>{series.rating} ({series.ratingCount} lượt)</ThemedText>
                  </View>
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => setUserRating(star)} style={styles.starPressable}>
                        <Star size={32} color={star <= userRating ? '#fbbf24' : '#4b5563'} fill={star <= userRating ? '#fbbf24' : 'none'} />
                      </Pressable>
                    ))}
                  </View>
                  {userRating > 0 && (
                    <ThemedText style={styles.userRatingMessage}>Cảm ơn bạn đã chấm {userRating} sao!</ThemedText>
                  )}
                </LinearGradient>

                {/* Vote widget */}
                <LinearGradient colors={[currentTheme.cardBg, 'rgba(39,29,74,0.1)']} style={[styles.voteCard, { borderColor: currentTheme.cardBorder }]}>
                  <View>
                    <ThemedText style={[styles.voteTitle, { color: currentTheme.text }]}>Bầu chọn cho tác phẩm</ThemedText>
                    <ThemedText style={[styles.voteCount, { color: currentTheme.subText }]}>{voteCount.toLocaleString()} lượt bầu</ThemedText>
                  </View>
                  <Pressable onPress={handleVote} style={[styles.voteButton, voted && styles.voteButtonActive]}>
                    <Heart size={16} color={voted ? '#fff' : '#fb7185'} fill={voted ? '#fff' : 'none'} />
                    <ThemedText style={[styles.voteButtonText, voted && { color: '#fff' }]}>
                      {voted ? 'Đã Bầu!' : 'Bầu Chọn'}
                    </ThemedText>
                  </Pressable>
                </LinearGradient>

                {/* Next chapter CTA */}
                <View style={[styles.nextChapterCard, { backgroundColor: currentTheme.cardBg, borderColor: currentTheme.cardBorder }]}>
                  <ThemedText style={styles.nextText}>
                    {activeChapterIndex < chapters.length - 1 ? `HẾT ${series.chapter.toUpperCase()}` : 'BẠN ĐÃ ĐỌC HẾT CÁC CHƯƠNG'}
                  </ThemedText>
                  <ThemedText style={[styles.nextSub, { color: currentTheme.subText }]}>
                    {activeChapterIndex < chapters.length - 1 ? 'Nhấn nút để sang chương kế tiếp ngay.' : 'Cảm ơn bạn đã đồng hành cùng bộ truyện này!'}
                  </ThemedText>
                  {activeChapterIndex < chapters.length - 1 && (
                    <Pressable onPress={handleNextChapter} style={styles.nextBtn}>
                      <ChevronUp size={16} color="#0a051d" />
                      <ThemedText style={styles.nextBtnText}>Lên Chapter Kế</ThemedText>
                    </Pressable>
                  )}
                </View>
              </View>
            </ScrollView>
          ) : (
            /* Cinema Swiping Mode */
            <View
              style={[styles.cinemaContainer, { backgroundColor: currentTheme.bg }]}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <View style={styles.cinemaViewPager}>
                <Image
                  source={{ uri: pages[currentPage] }}
                  style={[styles.cinemaImage, { transform: [{ scale: zoomScale }] }]}
                  contentFit="contain"
                />
                <LinearGradient colors={['transparent', 'rgba(10,5,22,0.65)']} style={StyleSheet.absoluteFillObject} />

                {/* Page Overlays Left/Right/Center touch hotspots */}
                <Pressable
                  style={[styles.cinemaHotspot, { left: 0 }]}
                  onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}
                />
                <Pressable
                  style={[styles.cinemaHotspot, { left: screenWidth / 3, right: screenWidth / 3, width: screenWidth / 3 }]}
                  onPress={() => setImmersiveMode((prev) => !prev)}
                />
                <Pressable
                  style={[styles.cinemaHotspot, { right: 0 }]}
                  onPress={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                />

                <View style={styles.cinemaPagerBadge}>
                  <ThemedText style={styles.cinemaPageText}>
                    Trang {currentPage + 1} / {pages.length}
                  </ThemedText>
                </View>
              </View>

              {/* Bottom horizontal slider thumbnails bar */}
              {showUI && (
                <View style={[styles.cinemaThumbnailsBar, { backgroundColor: currentTheme.bg, borderTopColor: currentTheme.cardBorder }]}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cinemaThumbRow}>
                    {pages.map((p, idx) => (
                      <Pressable
                        key={idx}
                        onPress={() => setCurrentPage(idx)}
                        style={[
                          styles.cinemaThumbFrame,
                          currentPage === idx && styles.cinemaThumbFrameActive,
                        ]}
                      >
                        <Image source={{ uri: p }} style={styles.cinemaThumbImage} />
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Ambient Reading Progress Bar */}
        <View style={styles.ambientProgressBarContainer}>
          <LinearGradient
            colors={['#fb7185', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.ambientProgressBarFill,
              { width: `${readingMode === 'scroll' ? scrollProgress : ((currentPage + 1) / pages.length) * 100}%` }
            ]}
          />
        </View>

        {/* Quick Reactions Bar fixed above comments trigger */}
        {showUI && (
          <View style={[styles.reactionsBarWrap, { backgroundColor: currentTheme.bg, borderTopColor: currentTheme.cardBorder }]}>
            <LinearGradient colors={[currentTheme.cardBg, 'rgba(39,29,74,0.3)']} style={[styles.reactionsBar, { borderColor: currentTheme.cardBorder }]}>
              <ThemedText style={[styles.reactionLabel, { color: currentTheme.subText }]}>Biểu cảm nhanh:</ThemedText>
              <View style={styles.reactionEmojis}>
                {quickReactions.map((r) => (
                  <Pressable key={r.label} onPress={() => triggerReaction(r.emoji)} style={styles.reactionEmojiBtn}>
                    <ThemedText style={styles.emojiText}>{r.emoji}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Live Nested Comments Bottom Drawer Overlay */}
        {showCommentsTray && (
          <View style={styles.drawerOverlay}>
            <Pressable style={styles.drawerDismissHotspot} onPress={() => setShowCommentsTray(false)} />
            <View style={[styles.drawerContentCard, { backgroundColor: currentTheme.bg === '#ffffff' ? '#f8fafc' : '#130d2d', borderColor: currentTheme.cardBorder }]}>
              {/* Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: currentTheme.cardBorder }]}>
                <View style={styles.drawerHeaderTitle}>
                  <MessageCircle size={18} color="#fb7185" />
                  <ThemedText style={[styles.drawerHeaderTitleText, { color: currentTheme.text }]}>Phòng Trò Chuyện ({comments.length})</ThemedText>
                </View>
                <Pressable onPress={() => setShowCommentsTray(false)} style={styles.drawerCloseBtn}>
                  <X size={18} color={currentTheme.text} />
                </Pressable>
              </View>

              {/* Comments Scroll list */}
              <ScrollView style={styles.commentsListScroll} showsVerticalScrollIndicator={false}>
                {comments.map((comment) => (
                  <View key={comment.id} style={[styles.commentCascadeItem, { borderBottomColor: currentTheme.cardBorder }]}>
                    {/* Parent Comment */}
                    <View style={styles.commentBodyRow}>
                      <LinearGradient colors={comment.color as [string, string]} style={styles.avatarCircle}>
                        <ThemedText style={styles.avatarInitials}>{comment.initials}</ThemedText>
                      </LinearGradient>
                      <View style={styles.commentContentCol}>
                        <View style={styles.commentHeaderWrap}>
                          <ThemedText style={[styles.commentUsername, { color: currentTheme.text }]}>{comment.user}</ThemedText>
                          <ThemedText style={styles.commentTime}>{comment.time}</ThemedText>
                        </View>
                        <ThemedText style={[styles.commentText, { color: currentTheme.text }]}>{comment.text}</ThemedText>

                        {/* Comment Action Links */}
                        <View style={styles.commentActionsRow}>
                          <Pressable
                            onPress={() => handleLikeComment(comment.id)}
                            style={styles.commentLikeBtn}
                          >
                            <ThumbsUp size={11} color={comment.liked ? '#fb7185' : '#94a3b8'} fill={comment.liked ? '#fb7185' : 'none'} />
                            <ThemedText style={[styles.commentActionText, comment.liked && { color: '#fb7185' }]}>
                              {comment.likes} Thích
                            </ThemedText>
                          </Pressable>

                          <Pressable
                            onPress={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                            style={styles.commentActionBtn}
                          >
                            <ThemedText style={styles.commentActionText}>Trả Lời</ThemedText>
                          </Pressable>
                        </View>

                        {/* Reply Form */}
                        {replyingToId === comment.id && (
                          <View style={styles.replyBoxForm}>
                            <TextInput
                              placeholder={`Trả lời ${comment.user}...`}
                              placeholderTextColor="#94a3b8"
                              style={[styles.trayWebInput, { backgroundColor: currentTheme.inputBg, color: currentTheme.text }]}
                              value={replyText}
                              onChangeText={setReplyText}
                            />
                            <Pressable onPress={() => handleAddReply(comment.id)} style={styles.sendReplyBtn}>
                              <Send size={12} color="#fff" />
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Replies Thread */}
                    {comment.replies.map((reply: any) => (
                      <View key={reply.id} style={[styles.replyCascadeItem, { borderLeftColor: currentTheme.cardBorder }]}>
                        <LinearGradient colors={reply.color as [string, string]} style={[styles.avatarCircle, { width: 24, height: 24 }]} />
                        <View style={styles.commentContentCol}>
                          <View style={styles.commentHeaderWrap}>
                            <ThemedText style={[styles.commentUsername, { color: currentTheme.text }]}>{reply.user}</ThemedText>
                            <ThemedText style={styles.commentTime}>{reply.time}</ThemedText>
                          </View>
                          <ThemedText style={[styles.commentText, { color: currentTheme.text }]}>{reply.text}</ThemedText>
                          <View style={styles.commentActionsRow}>
                            <Pressable
                              onPress={() => handleLikeComment(comment.id, reply.id)}
                              style={styles.commentLikeBtn}
                            >
                              <ThumbsUp size={10} color={reply.liked ? '#fb7185' : '#94a3b8'} fill={reply.liked ? '#fb7185' : 'none'} />
                              <ThemedText style={[styles.commentActionText, reply.liked && { color: '#fb7185' }]}>
                                {reply.likes} Thích
                              </ThemedText>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>

              {/* New Comment Posting Form footer */}
              <View style={[styles.newCommentFooter, { paddingBottom: insets.bottom + 12, borderTopColor: currentTheme.cardBorder }]}>
                <LinearGradient colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']} style={[styles.inputWrap, { borderColor: currentTheme.cardBorder }]}>
                  <TextInput
                    placeholder="Chia sẻ suy nghĩ của bạn..."
                    placeholderTextColor="#a5b4fc"
                    style={[styles.commentWebInput, { color: currentTheme.text }]}
                    value={newCommentText}
                    onChangeText={setNewCommentText}
                  />
                  <Pressable onPress={handleAddComment} style={[styles.sendBtn, { backgroundColor: currentTheme.text }]}>
                    <Send size={16} color={currentTheme.bg === '#ffffff' ? '#ffffff' : '#0a051d'} />
                  </Pressable>
                </LinearGradient>
              </View>
            </View>
          </View>
        )}

        {/* Tùy Chỉnh Đọc Truyện (Settings Panel) */}
        {showSettings && (
          <View style={styles.drawerOverlay}>
            <Pressable style={styles.drawerDismissHotspot} onPress={() => setShowSettings(false)} />
            <View style={[styles.settingsDrawerCard, { backgroundColor: bgTheme === 'light' ? '#ffffff' : '#130d2d', borderColor: currentTheme.cardBorder }]}>
              {/* Settings Header */}
              <View style={[styles.drawerHeader, { borderBottomColor: currentTheme.cardBorder }]}>
                <View style={styles.drawerHeaderTitle}>
                  <Sliders size={18} color="#fb7185" />
                  <ThemedText style={[styles.drawerHeaderTitleText, { color: currentTheme.text }]}>Cài đặt trải nghiệm</ThemedText>
                </View>
                <Pressable onPress={() => setShowSettings(false)} style={styles.drawerCloseBtn}>
                  <X size={18} color={currentTheme.text} />
                </Pressable>
              </View>

              {/* Settings list */}
              <ScrollView style={styles.settingsContentScroll} showsVerticalScrollIndicator={false}>
                {/* Background Themes */}
                <View style={styles.settingGroup}>
                  <ThemedText style={[styles.settingLabel, { color: currentTheme.subText }]}>GIAO DIỆN PHÔNG NỀN</ThemedText>
                  <View style={styles.themeSelectorRow}>
                    {[
                      { key: 'light', label: 'Sáng', dot: '#ffffff' },
                      { key: 'sepia', label: 'Sepia', dot: '#f4ece1' },
                      { key: 'dark', label: 'Tối', dot: '#07020d' },
                      { key: 'cinema', label: 'Cinema', dot: '#000000' },
                    ].map((themeOption) => {
                      const active = bgTheme === themeOption.key;
                      return (
                        <Pressable
                          key={themeOption.key}
                          onPress={() => setBgTheme(themeOption.key as any)}
                          style={[
                            styles.themeOptionBtn,
                            active && { borderColor: '#fb7185', backgroundColor: 'rgba(251,113,133,0.1)' }
                          ]}
                        >
                          <View style={[styles.themeColorDot, { backgroundColor: themeOption.dot, borderColor: '#ccc', borderWidth: themeOption.key === 'light' ? 1 : 0 }]} />
                          <ThemedText style={[styles.themeOptionText, { color: currentTheme.text }]}>{themeOption.label}</ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Brightness Presets Slider */}
                <View style={styles.settingGroup}>
                  <View style={styles.settingHeaderRow}>
                    <ThemedText style={[styles.settingLabel, { color: currentTheme.subText }]}>ĐỘ SÁNG MÀN HÌNH (DỊU MẮT)</ThemedText>
                    <ThemedText style={[styles.settingValueText, { color: currentTheme.text }]}>{brightnessLevel}%</ThemedText>
                  </View>
                  <View style={styles.brightnessPresetsRow}>
                    {[20, 40, 60, 80, 100].map((level) => {
                      const active = brightnessLevel === level;
                      return (
                        <Pressable
                          key={level}
                          onPress={() => setBrightnessLevel(level)}
                          style={[
                            styles.brightnessPresetBtn,
                            active && { backgroundColor: '#fb7185' },
                          ]}
                        >
                          <Sun size={12} color={active ? '#0a051d' : currentTheme.text} />
                          <ThemedText style={[styles.brightnessPresetText, { color: active ? '#0a051d' : currentTheme.text }]}>
                            {level}%
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Reading Mode */}
                <View style={styles.settingGroup}>
                  <ThemedText style={[styles.settingLabel, { color: currentTheme.subText }]}>CHẾ ĐỘ ĐỌC TRUYỆN</ThemedText>
                  <View style={styles.modeSelectorRow}>
                    <Pressable
                      onPress={() => {
                        setReadingMode('scroll');
                        setAutoScroll(false);
                      }}
                      style={[
                        styles.modeOptionBtn,
                        readingMode === 'scroll' && { backgroundColor: '#fb7185' },
                      ]}
                    >
                      <BookOpen size={16} color={readingMode === 'scroll' ? '#0a051d' : currentTheme.text} />
                      <ThemedText style={[styles.modeOptionText, { color: readingMode === 'scroll' ? '#0a051d' : currentTheme.text }]}>
                        Cuộn Dọc
                      </ThemedText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        setReadingMode('cinema');
                        setAutoScroll(false);
                      }}
                      style={[
                        styles.modeOptionBtn,
                        readingMode === 'cinema' && { backgroundColor: '#fb7185' },
                      ]}
                    >
                      <PanelTop size={16} color={readingMode === 'cinema' ? '#0a051d' : currentTheme.text} />
                      <ThemedText style={[styles.modeOptionText, { color: readingMode === 'cinema' ? '#0a051d' : currentTheme.text }]}>
                        Cinema Ngang
                      </ThemedText>
                    </Pressable>
                  </View>
                </View>

                {/* Auto Scroll (For Scroll mode only) */}
                {readingMode === 'scroll' && (
                  <View style={styles.settingGroup}>
                    <View style={styles.settingHeaderRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Activity size={14} color="#fb7185" />
                        <ThemedText style={[styles.settingLabel, { color: currentTheme.subText }]}>TỰ ĐỘNG CUỘN KHÔNG CHẠM</ThemedText>
                      </View>
                      <Pressable
                        onPress={() => setAutoScroll(!autoScroll)}
                        style={[
                          styles.autoScrollToggleBtn,
                          autoScroll && { backgroundColor: '#22c55e' }
                        ]}
                      >
                        <ThemedText style={styles.autoScrollToggleText}>{autoScroll ? 'Đang bật' : 'Đang tắt'}</ThemedText>
                      </Pressable>
                    </View>

                    {autoScroll && (
                      <View style={styles.speedControlRow}>
                        <ThemedText style={[styles.speedLabel, { color: currentTheme.subText }]}>Tốc độ cuộn:</ThemedText>
                        <View style={styles.speedOptionsGrid}>
                          {[1, 2, 3, 4, 5].map((speed) => {
                            const active = scrollSpeed === speed;
                            return (
                              <Pressable
                                key={speed}
                                onPress={() => setScrollSpeed(speed)}
                                style={[
                                  styles.speedOptionBtn,
                                  active && { backgroundColor: '#fb7185' }
                                ]}
                              >
                                <ThemedText style={[styles.speedOptionText, { color: active ? '#0a051d' : currentTheme.text }]}>
                                  {speed}x
                                </ThemedText>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, zIndex: 10 },
  iconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  topTitleCol: { flex: 1, marginLeft: 10, marginRight: 10 },
  topTitleText: { fontSize: 14, fontWeight: '900' },
  topSubtitleText: { fontSize: 11 },
  topActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  commentsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fb7185', position: 'absolute', top: 0, right: 0 },
  displayArea: { flex: 1 },
  scrollReaderContent: { paddingHorizontal: 12, paddingVertical: 16, gap: Spacing.four },
  chapterIntroCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1 },
  introCover: { minHeight: 220, justifyContent: 'flex-end' },
  introOverlay: { ...StyleSheet.absoluteFillObject },
  introDetails: { padding: 16, gap: 8 },
  badgeWrap: { flexDirection: 'row', gap: 6 },
  introBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)' },
  introBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  introTitle: { color: '#fff', fontSize: 22, fontWeight: '900' },
  introMeta: { color: '#cbd5e1', fontSize: 11 },
  pagesCascade: { gap: 8 },
  pageCard: { width: '100%', height: 520, borderRadius: 16, overflow: 'hidden', borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  pageImage: { width: '100%', height: '100%' },
  pageNumberBadge: { position: 'absolute', bottom: 10, right: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
  pageNumberText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  interactionWrap: { gap: 12, marginTop: 10 },
  ratingCard: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12 },
  ratingCardTitle: { fontSize: 14, fontWeight: '800' },
  ratingCount: { fontSize: 12 },
  ratingCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  starRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  starPressable: { padding: 4 },
  userRatingMessage: { color: '#fbbf24', fontSize: 12, textAlign: 'center', fontWeight: '700' },
  voteCard: { borderRadius: 20, padding: 16, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  voteTitle: { fontSize: 14, fontWeight: '800' },
  voteCount: { fontSize: 12 },
  voteButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(244,63,94,0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(244,63,94,0.3)' },
  voteButtonActive: { backgroundColor: '#f43f5e', borderColor: '#f43f5e' },
  voteButtonText: { color: '#fb7185', fontWeight: '800', fontSize: 12 },
  nextChapterCard: { borderRadius: 20, padding: 20, borderWidth: 1, alignItems: 'center', gap: 8 },
  nextText: { color: '#fb7185', fontWeight: '900', letterSpacing: 1.5, fontSize: 12 },
  nextSub: { fontSize: 11, textAlign: 'center' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 999 },
  nextBtnText: { color: '#0a051d', fontWeight: '800', fontSize: 13 },
  cinemaContainer: { flex: 1, justifyContent: 'space-between' },
  cinemaViewPager: { flex: 1, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  cinemaImage: { width: '100%', height: '100%' },
  cinemaHotspot: { position: 'absolute', top: 0, bottom: 0, width: screenWidth / 3 },
  cinemaPagerBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.6)' },
  cinemaPageText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cinemaThumbnailsBar: { height: 74, borderTopWidth: 1 },
  cinemaThumbRow: { gap: 10, paddingHorizontal: 12, alignItems: 'center' },
  cinemaThumbFrame: { width: 44, height: 52, borderRadius: 8, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  cinemaThumbFrameActive: { borderColor: '#fb7185' },
  cinemaThumbImage: { width: '100%', height: '100%', opacity: 0.6 },
  reactionsBarWrap: { borderTopWidth: 1, paddingVertical: 10, paddingHorizontal: 12, zIndex: 10 },
  reactionsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1 },
  reactionLabel: { fontSize: 11, fontWeight: '800' },
  reactionEmojis: { flexDirection: 'row', gap: 12 },
  reactionEmojiBtn: { padding: 4 },
  emojiText: { fontSize: 22 },
  bubbleOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 50 },
  floatingEmojiContainer: { position: 'absolute', bottom: 50, right: 40, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  drawerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  drawerDismissHotspot: { ...StyleSheet.absoluteFillObject },
  drawerContentCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, height: '70%', borderWidth: 1 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1 },
  drawerHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drawerHeaderTitleText: { fontSize: 15, fontWeight: '900' },
  drawerCloseBtn: { padding: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' },
  commentsListScroll: { flex: 1, padding: 16 },
  commentCascadeItem: { borderBottomWidth: 1, paddingBottom: 16, marginBottom: 16 },
  commentBodyRow: { flexDirection: 'row', gap: 12 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontSize: 10, fontWeight: '800' },
  commentContentCol: { flex: 1, gap: 4 },
  commentHeaderWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentUsername: { fontSize: 13, fontWeight: '800' },
  commentTime: { color: '#64748b', fontSize: 10 },
  commentText: { fontSize: 12, lineHeight: 18 },
  commentActionsRow: { flexDirection: 'row', gap: 14, marginTop: 4, alignItems: 'center' },
  commentLikeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  commentActionBtn: { paddingVertical: 2 },
  commentActionText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  replyBoxForm: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  trayWebInput: { flex: 1, fontSize: 12, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  sendReplyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fb7185', alignItems: 'center', justifyContent: 'center' },
  replyCascadeItem: { flexDirection: 'row', gap: 10, marginLeft: 36, marginTop: 12, paddingLeft: 10, borderLeftWidth: 1.5 },
  newCommentFooter: { padding: 12, borderTopWidth: 1 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  commentWebInput: { flex: 1, backgroundColor: 'transparent', fontSize: 13 },
  sendBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },

  // Optimized Reader Custom Styles
  floatingZoomPanel: { position: 'absolute', right: 12, top: 120, borderRadius: 20, borderWidth: 1, padding: 8, gap: 8, alignItems: 'center', zIndex: 100 },
  zoomPillBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  zoomValueBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  zoomValueText: { fontSize: 10, fontWeight: '800' },
  ambientProgressBarContainer: { width: '100%', height: 3, backgroundColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  ambientProgressBarFill: { height: '100%' },
  floatingShowUIHint: { position: 'absolute', top: 16, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 100, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.2)' },
  showUIHintText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },

  // Settings Drawer Sheet Styles
  settingsDrawerCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '60%', borderWidth: 1, paddingBottom: 24 },
  settingsContentScroll: { flex: 1, padding: 16 },
  settingGroup: { marginBottom: 20 },
  settingLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  settingHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  settingValueText: { fontSize: 12, fontWeight: '800' },
  themeSelectorRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  themeOptionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' },
  themeColorDot: { width: 14, height: 14, borderRadius: 7 },
  themeOptionText: { fontSize: 11, fontWeight: '800' },
  brightnessPresetsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  brightnessPresetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  brightnessPresetText: { fontSize: 11, fontWeight: '800' },
  modeSelectorRow: { flexDirection: 'row', gap: 10 },
  modeOptionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  modeOptionText: { fontSize: 12, fontWeight: '800' },
  autoScrollToggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  autoScrollToggleText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  speedControlRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 12 },
  speedLabel: { fontSize: 11, fontWeight: '800' },
  speedOptionsGrid: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  speedOptionBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  speedOptionText: { fontSize: 11, fontWeight: '800' },
  fullscreenErrorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  fullscreenErrorTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  fullscreenErrorText: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  fullscreenRetryBtn: {
    backgroundColor: '#fb7185',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  fullscreenRetryText: {
    color: '#0a051d',
    fontSize: 13,
    fontWeight: '900',
  },
});
