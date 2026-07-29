import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import React, { useEffect, type ErrorInfo, type ReactNode } from 'react';
import { useColorScheme, ActivityIndicator, Pressable, Text, View } from 'react-native';

import { initLanguage } from '@/i18n';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { AuthProvider, useAuth } from '@/lib/auth';
import LoginScreen from './login';

type RootErrorBoundaryState = { hasError: boolean };

class RootErrorBoundary extends React.Component<{ children: ReactNode }, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RootErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught mobile render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, padding: 24, backgroundColor: '#f6efdf', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <ActivityIndicator size="large" color="#b94234" />
          <Pressable
            accessibilityRole="button"
            onPress={() => this.setState({ hasError: false })}
            style={{ paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, backgroundColor: '#1c2928' }}
          >
            <Text style={{ color: '#fffaf0', fontWeight: '700' }}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

function AuthGate() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1c2928', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#b94234" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AppTabs />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initLanguage();
  }, []);

  return (
    <RootErrorBoundary>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <AuthGate />
        </ThemeProvider>
      </AuthProvider>
    </RootErrorBoundary>
  );
}
