import { NativeTabs } from 'expo-router/unstable-native-tabs';
import React from 'react';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { user } = useAuth();
  const role = user?.role || 'reader';

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Reader</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      {/* Mangaka Tabs */}
      {role === 'mangaka' && (
        <>
          <NativeTabs.Trigger name="studio">
            <NativeTabs.Trigger.Label>Studio</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@/assets/images/tabIcons/explore.png')}
              renderingMode="template"
            />
          </NativeTabs.Trigger>
          <NativeTabs.Trigger name="manage">
            <NativeTabs.Trigger.Label>Manage</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon
              src={require('@/assets/images/tabIcons/explore.png')} // Replace with proper icon later if needed
              renderingMode="template"
            />
          </NativeTabs.Trigger>
        </>
      )}

      {/* Assistant Tab */}
      {role === 'assistant' && (
        <NativeTabs.Trigger name="tasks">
          <NativeTabs.Trigger.Label>Tasks</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      {/* Editor Tab */}
      {role === 'editor' && (
        <NativeTabs.Trigger name="editor">
          <NativeTabs.Trigger.Label>Editor</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}

      {/* Editorial Board Tab */}
      {role === 'editorial_board' && (
        <NativeTabs.Trigger name="board">
          <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon
            src={require('@/assets/images/tabIcons/explore.png')}
            renderingMode="template"
          />
        </NativeTabs.Trigger>
      )}
    </NativeTabs>
  );
}
