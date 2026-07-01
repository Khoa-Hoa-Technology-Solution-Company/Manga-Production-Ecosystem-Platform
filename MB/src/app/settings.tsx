import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, Pressable,
  ActivityIndicator, Alert, useColorScheme, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Shield, Bell, HelpCircle, Save, LogOut } from 'lucide-react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing, BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { authAPI, getImageUrl } from '@/lib/api';

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { user, logout, updateUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setBio(user.bio || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Lỗi', 'Tên hiển thị không được bỏ trống.');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatar: avatar.trim(),
      });
      if (res?.user) {
        await updateUser({
          displayName: res.user.displayName,
          bio: res.user.bio,
          avatar: res.user.avatar,
        });
        Alert.alert('Thành công', 'Thông tin cá nhân đã được cập nhật.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất tài khoản?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Đăng xuất', style: 'destructive', onPress: logout },
      ]
    );
  };

  const roleLabels: Record<string, string> = {
    mangaka: 'Họa sĩ',
    assistant: 'Trợ lý',
    editor: 'Biên tập viên',
    editorial_board: 'Hội đồng duyệt',
    reader: 'Độc giả',
  };

  const avatarUrl = getImageUrl(avatar);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: theme.background }]}>
      <LinearGradient colors={isDark ? ['#0e051d', '#130e2c', '#07020e'] : ['#faf5ff', '#f0f0ff', '#f8fafc']} style={StyleSheet.absoluteFillObject} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + Spacing.four }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <ThemedText style={[styles.headerSubtitle, { color: '#8b5cf6' }]}>CÁ NHÂN HÓA</ThemedText>
              <ThemedText type="title" style={[styles.headerTitle, { color: theme.text }]}>Tài khoản</ThemedText>
            </View>

            {/* Profile Avatar Card */}
            <View style={[styles.profileCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
              <View style={styles.avatarContainer}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9' }]}>
                    <ThemedText style={[styles.avatarText, { color: theme.text }]}>
                      {(user?.displayName || 'M').charAt(0).toUpperCase()}
                    </ThemedText>
                  </View>
                )}
                <View style={[styles.roleBadge, { backgroundColor: '#8b5cf6' }]}>
                  <ThemedText style={styles.roleBadgeText}>
                    {roleLabels[user?.role || ''] || 'Độc giả'}
                  </ThemedText>
                </View>
              </View>
              <ThemedText style={[styles.profileName, { color: theme.text }]}>{user?.displayName}</ThemedText>
              <ThemedText style={[styles.profileEmail, { color: theme.textSecondary }]}>{user?.email}</ThemedText>
            </View>

            {/* Editing Section */}
            <View style={styles.formGroup}>
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>Tên hiển thị</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: theme.text }]}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Nhập tên hiển thị..."
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>Tiểu sử (Bio)</ThemedText>
              <TextInput
                style={[styles.inputMultiline, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: theme.text }]}
                value={bio}
                onChangeText={setBio}
                placeholder="Giới thiệu bản thân của bạn..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[styles.fieldLabel, { color: theme.text }]}>Link ảnh đại diện (URL)</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', color: theme.text }]}
                value={avatar}
                onChangeText={setAvatar}
                placeholder="https://example.com/avatar.jpg"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            {/* Save Buttons */}
            <Pressable
              style={[styles.saveBtn, { backgroundColor: '#8b5cf6' }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <ThemedText style={styles.saveBtnText}>Lưu Thay Đổi</ThemedText>
                </>
              )}
            </Pressable>

            {/* General Settings placeholder group */}
            <View style={styles.groupContainer}>
              <ThemedText style={styles.groupTitle}>Cài đặt ứng dụng</ThemedText>
              <View style={[styles.groupCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#fff', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)' }]}>
                <View style={[styles.settingItem, styles.borderBottom]}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                    <Shield size={16} color={theme.textSecondary} />
                  </View>
                  <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Bảo mật & Mật khẩu</ThemedText>
                </View>
                <View style={[styles.settingItem, styles.borderBottom]}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                    <Bell size={16} color={theme.textSecondary} />
                  </View>
                  <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Thông báo đẩy</ThemedText>
                </View>
                <View style={styles.settingItem}>
                  <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
                    <HelpCircle size={16} color={theme.textSecondary} />
                  </View>
                  <ThemedText style={[styles.settingLabel, { color: theme.text }]}>Trợ giúp & Hỗ trợ</ThemedText>
                </View>
              </View>
            </View>

            {/* Logout Button */}
            <Pressable
              style={[styles.logoutBtn, { borderColor: isDark ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.5)' }]}
              onPress={handleLogout}
            >
              <LogOut size={18} color="#ef4444" />
              <ThemedText style={styles.logoutBtnText}>Đăng Xuất</ThemedText>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.three, paddingTop: Spacing.four, paddingBottom: Spacing.three },
  headerSubtitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  headerTitle: { fontSize: 28, lineHeight: 32, fontWeight: '800' },
  content: { maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', paddingHorizontal: Spacing.three, gap: Spacing.four },

  profileCard: { borderRadius: 20, padding: 20, alignItems: 'center', borderWidth: 1 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatarImage: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '800' },
  roleBadge: { position: 'absolute', bottom: -6, alignSelf: 'center', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  roleBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  profileName: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  profileEmail: { fontSize: 13 },

  formGroup: { gap: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  inputMultiline: { height: 80, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, textAlignVertical: 'top' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  groupContainer: { marginTop: 10 },
  groupTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 10, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  groupCard: { borderRadius: 16, borderWidth: 1 },
  settingItem: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  borderBottom: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(148,163,184,0.15)' },
  iconBox: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '500' },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  logoutBtnText: { color: '#ef4444', fontSize: 15, fontWeight: 'bold' },
});
