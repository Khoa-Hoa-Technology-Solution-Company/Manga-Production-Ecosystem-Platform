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

const roleOptions = [
  { value: 'mangaka', label: 'Mangaka', desc: 'Tác giả truyện' },
  { value: 'assistant', label: 'Assistant', desc: 'Trợ lý vẽ' },
  { value: 'editor', label: 'Editor', desc: 'Biên tập viên' },
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
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('reader');

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
        colors={['#0e051d', '#07020e']}
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
              <View style={styles.logoCircle}>
                <BookOpen size={28} color="#fff" />
              </View>
              <ThemedText style={styles.brandTitle}>MangaFlow</ThemedText>
              <ThemedText style={styles.brandSubtitle}>
                Nền tảng sản xuất Manga chuyên nghiệp
              </ThemedText>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>
                  {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
                </ThemedText>
                <ThemedText style={styles.cardSubtitle}>
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
                  <ThemedText style={styles.inputLabel}>Tên hiển thị</ThemedText>
                  <View style={styles.inputRow}>
                    <User size={16} color="#64748b" />
                    <TextInput
                      style={styles.textInput}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Yuki Mori"
                      placeholderTextColor="#475569"
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Email</ThemedText>
                <View style={styles.inputRow}>
                  <Mail size={16} color="#64748b" />
                  <TextInput
                    style={styles.textInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#475569"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Mật khẩu</ThemedText>
                <View style={styles.inputRow}>
                  <Lock size={16} color="#64748b" />
                  <TextInput
                    style={[styles.textInput, { flex: 1 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#475569"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                      <EyeOff size={16} color="#64748b" />
                    ) : (
                      <Eye size={16} color="#64748b" />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Register: Role Picker */}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>Vai trò</ThemedText>
                  <View style={styles.rolesGrid}>
                    {roleOptions.map((opt) => {
                      const active = role === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => setRole(opt.value)}
                          style={[
                            styles.roleChip,
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
                style={[styles.submitBtn, loading && { opacity: 0.6 }]}
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
              </Pressable>

              {/* Toggle */}
              <View style={styles.toggleRow}>
                <ThemedText style={styles.toggleText}>
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
            <View style={styles.demoCard}>
              <View style={styles.demoHeader}>
                <Sparkles size={12} color="#f43f5e" />
                <ThemedText style={styles.demoTitle}>TÀI KHOẢN DEMO</ThemedText>
              </View>
              <View style={styles.demoGrid}>
                {demoAccounts.map((d) => (
                  <Pressable
                    key={d.email}
                    onPress={() => fillDemo(d.email)}
                    style={styles.demoChip}
                  >
                    <ThemedText style={styles.demoChipLabel}>{d.label}</ThemedText>
                    <ThemedText style={styles.demoChipEmail} numberOfLines={1}>
                      {d.email}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
              <ThemedText style={styles.demoHint}>
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
  brandSection: { alignItems: 'center', gap: 8 },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#f43f5e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brandTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    color: '#64748b',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  card: {
    backgroundColor: 'rgba(15, 10, 30, 0.8)',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 16,
  },
  cardHeader: { gap: 4 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  cardSubtitle: { color: '#64748b', fontSize: 12 },
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
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
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f43f5e',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
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
    gap: 6,
  },
  demoChip: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
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
