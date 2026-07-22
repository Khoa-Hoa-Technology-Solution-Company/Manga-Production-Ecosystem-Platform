import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, BellOff, Check, CheckCheck, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { notificationsAPI, tasksAPI, chaptersAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';
import { useAuth } from '@/lib/auth';

interface Notification {
  _id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  type?: string;
  relatedId?: string;
  relatedType?: string;
  target?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  const days = Math.floor(hrs / 24);
  return `${days} ngày trước`;
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    notificationsAPI
      .getAll()
      .then((data) => {
        setNotifications(data.notifications || []);
      })
      .catch((err) => {
        console.error('Failed to load notifications on refresh:', err);
      })
      .finally(() => setRefreshing(false));
  }, []);

  // Listen to realtime notifications via Socket
  useEffect(() => {
    const handleNewNotification = (n: any) => {
      setNotifications((prev) => prev.some((item) => item._id === n._id) ? prev : [n, ...prev]);
    };
    const handleReadNotification = (data: any) => {
      setNotifications((prev) => prev.map((item) =>
        item._id === data.notificationId ? { ...item, read: true } : item
      ));
    };
    const handleReadAllNotifications = () => {
      setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    };

    socketService.on('notification:new', handleNewNotification);
    socketService.on('notification:read', handleReadNotification);
    socketService.on('notification:read-all', handleReadAllNotifications);
    return () => {
      socketService.off('notification:new', handleNewNotification);
      socketService.off('notification:read', handleReadNotification);
      socketService.off('notification:read-all', handleReadAllNotifications);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const loadNotifications = useCallback(() => {
    setLoading(true);
    notificationsAPI
      .getAll()
      .then((data) => {
        setNotifications(data.notifications || []);
      })
      .catch((err) => {
        console.error('Failed to load notifications:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = (id: string) => {
    notificationsAPI.markRead(id).catch((err) =>
      console.error('Failed to mark notification read:', err)
    );
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await notificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationPress = async (notif: Notification) => {
    // Mark read
    if (!notif.read) {
      handleMarkRead(notif._id);
    }

    if (!notif.relatedId) return;

    try {
      if (notif.target === 'tasks' || notif.target === 'assistant_series') {
        router.push('/tasks');
        return;
      }
      if (notif.target === 'editor_chapter_review') {
        router.push(user?.role === 'editor' ? `/editor/review/${notif.relatedId}` as any : '/editor');
        return;
      }
      if (notif.target === 'mangaka_series') {
        router.push(user?.role === 'mangaka'
          ? { pathname: '/manage', params: { seriesId: notif.relatedId } }
          : '/explore');
        return;
      }
      if (notif.target === 'editor_portfolio' || notif.target === 'editor_approvals') {
        router.push(user?.role === 'editor' ? '/editor' : '/explore');
        return;
      }
      if (notif.target === 'eb_assign_editor' || notif.target === 'eb_votes' || notif.target === 'eb_meetings') {
        router.push(user?.role === 'editorial_board' ? '/board' : user?.role === 'editor' ? '/editor' : '/explore');
        return;
      }
      if (notif.target === 'reader_series') {
        router.push(`/series/${notif.relatedId}` as any);
        return;
      }
      if (notif.target === 'reader_chapter') {
        const res = await chaptersAPI.getById(notif.relatedId);
        const chapter = res?.chapter;
        if (!chapter) {
          router.push('/explore');
          return;
        }
        const chaptersRes = await chaptersAPI.getBySeries(chapter.seriesId);
        const chapters = chaptersRes?.chapters || [];
        const chapterIndex = chapters.findIndex((item: any) => item._id === chapter._id);
        router.push({
          pathname: `/read/${chapter.seriesId}` as any,
          params: { chapterIndex: chapterIndex >= 0 ? String(chapterIndex) : '0' },
        });
        return;
      }
      if (notif.target === 'chapter_context' && user?.role === 'editor') {
        router.push(`/editor/review/${notif.relatedId}` as any);
        return;
      }
      if (notif.target === 'chapter_context' && user?.role === 'editorial_board') {
        router.push('/board');
        return;
      }

      if (notif.type === 'task_assigned' || notif.type === 'task_revision') {
        router.push('/tasks');
      } else if (notif.type === 'task_submitted' || notif.type === 'task_declined') {
        if (user?.role === 'mangaka') {
          try {
            const res = await tasksAPI.getById(notif.relatedId);
            const task = res?.task;
            if (task) {
              router.push({
                pathname: '/studio',
                params: { seriesId: task.seriesId, chapterId: task.chapterId, pageId: task.pageId || '' },
              });
            } else {
              router.push('/studio');
            }
          } catch {
            router.push('/studio');
          }
        } else {
          router.push('/tasks');
        }
      } else if (notif.type === 'chapter_status') {
        if (user?.role === 'editor') {
          router.push(`/editor/review/${notif.relatedId}` as any);
        } else if (user?.role === 'editorial_board') {
          router.push('/board');
        } else if (user?.role === 'reader') {
          try {
            const res = await chaptersAPI.getById(notif.relatedId);
            const chapter = res?.chapter;
            if (chapter) {
              const chaptersRes = await chaptersAPI.getBySeries(chapter.seriesId);
              const chapters = chaptersRes?.chapters || [];
              const idx = chapters.findIndex((c: any) => c._id === chapter._id);
              router.push({
                pathname: `/read/${chapter.seriesId}` as any,
                params: { chapterIndex: idx !== -1 ? String(idx) : '0' },
              });
            } else {
              router.push('/explore');
            }
          } catch {
            router.push('/explore');
          }
        } else if (user?.role === 'mangaka') {
          try {
            const res = await chaptersAPI.getById(notif.relatedId);
            const chapter = res?.chapter;
            if (chapter) {
              router.push({
                pathname: '/studio',
                params: { seriesId: chapter.seriesId, chapterId: chapter._id },
              });
            } else {
              router.push('/studio');
            }
          } catch {
            router.push('/studio');
          }
        } else router.push('/tasks');
      } else if (notif.relatedType === 'Series') {
        if (user?.role === 'editor') {
          router.push('/editor');
        } else if (user?.role === 'editorial_board') {
          router.push('/board');
        } else if (user?.role === 'reader') {
          router.push('/explore');
        } else {
          router.push('/manage');
        }
      } else if (notif.relatedType === 'Meeting') {
        if (user?.role === 'editor') {
          router.push('/editor');
        } else if (user?.role === 'editorial_board') {
          router.push('/board');
        }
      } else {
        // Fallback by role
        if (user?.role === 'editorial_board') {
          router.push('/board');
        } else if (user?.role === 'editor') {
          router.push('/editor');
        } else if (user?.role === 'assistant') {
          router.push('/tasks');
        } else if (user?.role === 'mangaka') {
          router.push('/manage');
        } else {
          router.push('/explore');
        }
      }
    } catch (err) {
      console.error('Notification navigation failed', err);
    }
  };

  const renderItem = ({ item }: { item: Notification }) => (
    <Pressable
      onPress={() => handleNotificationPress(item)}
      style={[
        styles.card,
        {
          backgroundColor: item.read
            ? (isDark ? 'rgba(22, 17, 41, 0.45)' : '#ffffff')
            : (isDark ? 'rgba(244, 63, 94, 0.06)' : 'rgba(244, 63, 94, 0.04)'),
          borderColor: item.read
            ? (isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(15, 23, 42, 0.06)')
            : (isDark ? 'rgba(244, 63, 94, 0.25)' : 'rgba(244, 63, 94, 0.2)'),
          shadowColor: '#000',
          shadowOpacity: isDark ? 0 : (item.read ? 0.02 : 0.04),
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: isDark ? 0 : 2,
        },
      ]}
    >
      {/* Unread dot */}
      {!item.read && <View style={styles.unreadDot} />}

      <View style={[styles.cardIconWrap, { backgroundColor: item.read ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.04)') : 'rgba(244, 63, 94, 0.1)' }]}>
        <Bell size={18} color={item.read ? theme.textSecondary : '#fb7185'} />
      </View>

      <View style={styles.cardContent}>
        <ThemedText
          style={[
            styles.cardTitle,
            { color: theme.text, fontWeight: item.read ? '400' : '700' },
          ]}
          numberOfLines={1}
        >
          {item.title || 'Thông báo mới'}
        </ThemedText>
        <ThemedText
          style={[styles.cardMessage, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {item.message}
        </ThemedText>
        <ThemedText style={[styles.cardTime, { color: theme.textSecondary }]}>
          {timeAgo(item.createdAt)}
        </ThemedText>
      </View>

      {item.relatedId ? (
        <View style={styles.cardAction}>
          <ChevronRight size={16} color={theme.textSecondary} style={{ opacity: 0.7 }} />
        </View>
      ) : !item.read ? (
        <View style={styles.cardAction}>
          <Check size={14} color="#fb7185" />
        </View>
      ) : null}
    </Pressable>
  );

  return (
    <ThemedView style={styles.screen}>
      <LinearGradient
        colors={isDark ? ['#0e051d', '#130e2c', '#07020e'] : ['#fff5f6', '#faf5ff', '#f8fafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)' },
          ]}
        >
          <View>
            <ThemedText style={[styles.headerTitle, { color: theme.text }]}>
              Thông Báo
            </ThemedText>
            {unreadCount > 0 && (
              <ThemedText style={[styles.headerSub, { color: theme.textSecondary }]}>
                {unreadCount} chưa đọc
              </ThemedText>
            )}
          </View>

          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              disabled={markingAll}
              style={[
                styles.markAllBtn,
                { backgroundColor: isDark ? 'rgba(244,63,94,0.12)' : 'rgba(244,63,94,0.08)' },
              ]}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color="#fb7185" />
              ) : (
                <>
                  <CheckCheck size={14} color="#fb7185" />
                  <ThemedText style={styles.markAllText}>Đọc tất cả</ThemedText>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                <BellOff size={52} color={theme.textSecondary} style={{ opacity: 0.4 }} />
                <ThemedText style={[styles.emptyTitle, { color: theme.text }]}>
                  Chưa có thông báo nào
                </ThemedText>
                <ThemedText style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  Các cập nhật về series bạn theo dõi sẽ hiện ở đây.
                </ThemedText>
              </View>
            )}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: (BottomTabInset ?? 80) + insets.bottom + 24 },
              notifications.length === 0 && { flex: 1, justifyContent: 'center' }
            ]}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '700' },
  headerSub: { fontSize: 13, marginTop: 2 },

  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  markAllText: { fontSize: 13, color: '#fb7185', fontWeight: '600' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21, opacity: 0.7 },

  list: { padding: 16 },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#fb7185',
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 14 },
  cardMessage: { fontSize: 13, lineHeight: 19 },
  cardTime: { fontSize: 11, marginTop: 2 },
  cardAction: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    flexShrink: 0,
  },
});
