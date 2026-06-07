import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/lib/auth';

/**
 * HOC for Protected Reader Route (Block 'reader' role)
 * Redirects to /explore if the user is a reader
 */
export function withProtectedReaderRoute<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedReaderRouteWrapper(props: P) {
    const { isAuthenticated, loading, user } = useAuth();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.replace('/login');
      } else if (!loading && isAuthenticated && user?.role?.toLowerCase() === 'reader') {
        router.replace('/explore');
      }
    }, [isAuthenticated, loading, user]);

    if (loading) {
      return (
        <View style={{ flex: 1, backgroundColor: '#07020d', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      );
    }

    if (!isAuthenticated || user?.role?.toLowerCase() === 'reader') {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC for Protected Mangaka Route
 * Redirects to / if the user is not a mangaka
 */
export function withProtectedMangakaRoute<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedMangakaRouteWrapper(props: P) {
    const { isAuthenticated, loading, user } = useAuth();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.replace('/login');
      } else if (!loading && isAuthenticated && user?.role?.toLowerCase() !== 'mangaka') {
        router.replace('/');
      }
    }, [isAuthenticated, loading, user]);

    if (loading) {
      return (
        <View style={{ flex: 1, backgroundColor: '#07020d', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      );
    }

    if (!isAuthenticated || user?.role?.toLowerCase() !== 'mangaka') {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC for Protected Editor Route
 * Redirects to / if the user is not an editor or editorial_board
 */
export function withProtectedEditorRoute<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedEditorRouteWrapper(props: P) {
    const { isAuthenticated, loading, user } = useAuth();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.replace('/login');
      } else if (!loading && isAuthenticated) {
        const role = user?.role?.toLowerCase();
        if (role !== 'editor' && role !== 'editorial_board') {
          router.replace('/');
        }
      }
    }, [isAuthenticated, loading, user]);

    if (loading) {
      return (
        <View style={{ flex: 1, backgroundColor: '#07020d', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      );
    }

    const role = user?.role?.toLowerCase();
    if (!isAuthenticated || (role !== 'editor' && role !== 'editorial_board')) {
      return null;
    }

    return <Component {...props} />;
  };
}

/**
 * HOC for Protected Editorial Board Route
 * Redirects to / if the user is not an editorial_board
 */
export function withProtectedEditorialBoardRoute<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedEditorialBoardRouteWrapper(props: P) {
    const { isAuthenticated, loading, user } = useAuth();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        router.replace('/login');
      } else if (!loading && isAuthenticated && user?.role?.toLowerCase() !== 'editorial_board') {
        router.replace('/');
      }
    }, [isAuthenticated, loading, user]);

    if (loading) {
      return (
        <View style={{ flex: 1, backgroundColor: '#07020d', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#f43f5e" />
        </View>
      );
    }

    if (!isAuthenticated || user?.role?.toLowerCase() !== 'editorial_board') {
      return null;
    }

    return <Component {...props} />;
  };
}
