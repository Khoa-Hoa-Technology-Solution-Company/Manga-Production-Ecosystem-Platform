import { Tabs } from 'expo-router';
import React from 'react';
import { useColorScheme } from 'react-native';
import { Image } from 'expo-image';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user } = useAuth();
  const role = user?.role || 'reader';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.backgroundElement,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Reader',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: 'Discover',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
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
          title: 'Studio',
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
          title: 'Manage',
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
          title: 'Tasks',
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
          title: 'Editor',
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
          title: 'Board',
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
          title: 'Thông Báo',
          tabBarIcon: ({ color }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: 22, height: 22, tintColor: color }}
              contentFit="contain"
            />
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
    </Tabs>
  );
}
