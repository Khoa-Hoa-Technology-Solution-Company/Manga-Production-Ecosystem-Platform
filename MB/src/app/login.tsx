import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen,
  Eye,
  EyeOff,
  Sparkles,
  User,
  Mail,
  Lock,
  ChevronRight,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';

const roleOptions = [
  { value: 'mangaka', label: 'Mangaka', desc: 'Tác giả truyện' },
  { value: 'assistant', label: 'Assistant', desc: 'Trợ lý vẽ' },
  { value: 'reader', label: 'Reader', desc: 'Độc giả' },
];

const demoAccounts = [
  { email: 'mangaka@mangaflow.com', label: 'Mangaka' },
  { email: 'assistant@mangaflow.com', label: 'Assistant' },
  { email: 'editor@mangaflow.com', label: 'Editor' },
  { email: 'reader@mangaflow.com', label: 'Reader' },
];

export default function LoginScreen() {
  const { login, register } = useAuth();
  const theme = useTheme();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('reader');

  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!displayName) {
          setError('Vui lòng nhập tên hiển thị.');
          setLoading(false);
          return;
        }
        await register({ email, password, displayName, role });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setIsLogin(true);
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={isDark ? ['#0e051d', '#07020e'] : ['#fff5f6', '#faf5ff', '#f8fafc']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo & Brand */}
            <View style={styles.brandSection}>
              <LinearGradient
                colors={['#f43f5e', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoCircle}
              >
                <BookOpen size={30} color="#fff" />
              </LinearGradient>
              <ThemedText style={styles.brandTitle}>MangaFlow</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.brandSubtitle}>
                Nền tảng sản xuất Manga chuyên nghiệp
              </ThemedText>
            </View>

            {/* Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(22, 17, 41, 0.65)' : 'rgba(255, 255, 255, 0.85)',
                  borderColor: isDark ? 'rgba(244, 63, 94, 0.12)' : 'rgba(244, 63, 94, 0.15)',
                },
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>
                  {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.cardSubtitle}>
                  {isLogin
                    ? 'Đăng nhập để truy cập workspace'
                    : 'Tạo tài khoản mới để bắt đầu'}
                </ThemedText>
              </View>

              {/* Error */}
              {error !== '' && (
                <View style={styles.errorBox}>
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              )}

              {/* Register: Display Name */}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <ThemedText themeColor="textSecondary" style={styles.inputLabel}>Tên hiển thị</ThemedText>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
                      },
                      nameFocused && styles.inputRowActive,
                    ]}
                  >
                    <User size={16} color={nameFocused ? '#fb7185' : '#64748b'} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Yuki Mori"
                      placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                      autoCapitalize="words"
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>Email</ThemedText>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
                    },
                    emailFocused && styles.inputRowActive,
                  ]}
                >
                  <Mail size={16} color={emailFocused ? '#fb7185' : '#64748b'} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>Mật khẩu</ThemedText>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15, 23, 42, 0.04)',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.08)',
                    },
                    passwordFocused && styles.inputRowActive,
                  ]}
                >
                  <Lock size={16} color={passwordFocused ? '#fb7185' : '#64748b'} />
                  <TextInput
                    style={[styles.textInput, { flex: 1, color: theme.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={16} color={passwordFocused ? '#fb7185' : '#64748b'} />
                    ) : (
                      <Eye size={16} color={passwordFocused ? '#fb7185' : '#64748b'} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Register: Role Picker */}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <ThemedText themeColor="textSecondary" style={styles.inputLabel}>Vai trò</ThemedText>
                  <View style={styles.rolesGrid}>
                    {roleOptions.map((opt) => {
                      const active = role === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setRole(opt.value)}
                          style={[
                            styles.roleChip,
                            {
                              backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(15, 23, 42, 0.02)',
                              borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15, 23, 42, 0.06)',
                            },
                            active && styles.roleChipActive,
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.roleChipLabel,
                              active && styles.roleChipLabelActive,
                            ]}
                          >
                            {opt.label}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.roleChipDesc,
                              active && { color: 'rgba(255,255,255,0.6)' },
                            ]}
                          >
                            {opt.desc}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Submit */}
              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitBtnWrap,
                  (loading || pressed) && { opacity: 0.8 }
                ]}
              >
                <LinearGradient
                  colors={['#f43f5e', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <ThemedText style={styles.submitText}>
                        {isLogin ? 'Đăng nhập' : 'Đăng ký'}
                      </ThemedText>
                      <ChevronRight size={16} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Toggle */}
              <View style={styles.toggleRow}>
                <ThemedText themeColor="textSecondary" style={styles.toggleText}>
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                >
                  <ThemedText style={styles.toggleLink}>
                    {isLogin ? 'Đăng ký' : 'Đăng nhập'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Demo Accounts */}
            <View
              style={[
                styles.demoCard,
                {
                  backgroundColor: isDark ? 'rgba(22, 17, 41, 0.45)' : 'rgba(15, 23, 42, 0.03)',
                  borderColor: isDark ? 'rgba(139, 92, 246, 0.1)' : 'rgba(15, 23, 42, 0.08)',
                },
              ]}
            >
              <View style={styles.demoHeader}>
                <Sparkles size={12} color="#f43f5e" />
                <ThemedText themeColor="textSecondary" style={styles.demoTitle}>TÀI KHOẢN DEMO</ThemedText>
              </View>
              <View style={styles.demoGrid}>
                {demoAccounts.map((d) => (
                  <Pressable
                    key={d.email}
                    onPress={() => fillDemo(d.email)}
                    style={({ pressed }) => [
                      styles.demoChip,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#ffffff',
                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15, 23, 42, 0.06)',
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <ThemedText style={[styles.demoChipLabel, { color: theme.text }]}>{d.label}</ThemedText>
                    <ThemedText style={[styles.demoChipEmail, { color: theme.textSecondary }]} numberOfLines={1}>
                      {d.email}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <ThemedText style={[styles.demoHint, { color: theme.textSecondary }]}>
                Mật khẩu: password123
              </ThemedText>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07020d' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 24,
  },
  brandSection: { alignItems: 'center', gap: 10 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#f43f5e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgba(22, 17, 41, 0.65)',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.12)',
    gap: 16,
  },
  cardHeader: { gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardSubtitle: { fontSize: 12 },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  inputGroup: { gap: 6 },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  inputRowActive: {
    borderColor: '#f43f5e',
    backgroundColor: 'rgba(244, 63, 94, 0.05)',
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleChip: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  roleChipActive: {
    borderColor: '#f43f5e',
    backgroundColor: 'rgba(244,63,94,0.1)',
  },
  roleChipLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  roleChipLabelActive: { color: '#fff' },
  roleChipDesc: { color: '#475569', fontSize: 10 },
  submitBtnWrap: {
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: { color: '#64748b', fontSize: 12 },
  toggleLink: { color: '#f43f5e', fontSize: 12, fontWeight: '800' },
  demoCard: {
    backgroundColor: 'rgba(22, 17, 41, 0.45)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    gap: 10,
  },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  demoTitle: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  demoChip: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  demoChipLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
  demoChipEmail: { color: '#475569', fontSize: 9 },
  demoHint: {
    color: '#475569',
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
