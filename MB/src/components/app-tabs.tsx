import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { Bell } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { notificationsAPI } from '@/lib/api';
import { socketService } from '@/lib/socket';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user } = useAuth();
  const { t } = useTranslation();
  const role = user?.role || 'reader';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    notificationsAPI.getAll({ unreadOnly: 'true' })
      .then((data) => setUnreadCount(data.unread || 0))
      .catch(console.error);

    const handleNew = (data: any) => {
      setUnreadCount((previous) => typeof data?.unreadCount === 'number' ? data.unreadCount : previous + 1);
    };
    const handleRead = (data: any) => {
      setUnreadCount((previous) => typeof data?.unread === 'number' ? data.unread : Math.max(0, previous - 1));
    };
    const handleReadAll = () => setUnreadCount(0);
    socketService.on('notification:new', handleNew);
    socketService.on('notification:read', handleRead);
    socketService.on('notification:read-all', handleReadAll);
    return () => {
      socketService.off('notification:new', handleNew);
      socketService.off('notification:read', handleRead);
      socketService.off('notification:read-all', handleReadAll);
    };
  }, [user]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: scheme === 'dark' ? '#10081f' : '#fff8fd',
          borderTopColor: scheme === 'dark' ? '#2d1b50' : '#f3d5ef',
          borderTopWidth: 1,
          height: 66,
          paddingBottom: 9,
          paddingTop: 8,
          shadowColor: '#a855f7',
          shadowOpacity: 0.14,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: -4 },
          elevation: 10,
        },
        tabBarActiveTintColor: colors.primaryNeon,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '800',
          letterSpacing: 0.2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('readerHome.title'),
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      {/* Mangaka Tabs */}
      <Tabs.Screen
        name="studio"
        options={{
          title: t('sidebar.studio'),
          href: role === 'mangaka' ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="manage"
        options={{
          title: t('sidebar.manage'),
          href: role === 'mangaka' ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      {/* Assistant Tab */}
      <Tabs.Screen
        name="tasks"
        options={{
          title: t('sidebar.assistant'),
          href: role === 'assistant' ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      {/* Editor Tab */}
      <Tabs.Screen
        name="editor"
        options={{
          title: t('sidebar.editorPortal'),
          href: role === 'editor' ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      {/* Editorial Board Tab */}
      <Tabs.Screen
        name="board"
        options={{
          title: t('sidebar.editorialBoard'),
          href: role === 'editorial_board' ? undefined : null,
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      {/* Notifications Tab — visible to all roles */}
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#fb7185',
            color: '#fff',
            fontSize: 9,
            fontWeight: '900',
            minWidth: 18,
            height: 18,
            lineHeight: 18,
            borderRadius: 9,
            paddingHorizontal: 4,
            top: -2,
            right: -8,
            borderWidth: 1.5,
            borderColor: scheme === 'dark' ? '#10081f' : '#fff8fd',
          },
          title: t('notifications.title'),
          tabBarIcon: ({ color }) => (
            <Bell size={22} color={color} strokeWidth={2.4} />
          ),
        }}
      />

      {/* Detail screens are registered but hidden from the tab bar */}
      <Tabs.Screen
        name="series/[seriesId]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="read/[seriesId]"
        options={{
          href: null,
        }}
      />

      {/* Other screens that should be hidden from tab bar */}
      <Tabs.Screen
        name="login"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="editor/review/[chapterId]"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="editor/review/[id]"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
