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
import {
  BookOpen,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  ChevronRight,
} from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/hooks/use-theme';
import { useTranslation } from 'react-i18next';

const roleOptions = [
  { value: 'mangaka', labelKey: 'roles.mangaka', descKey: 'mobile.login.roleMangaka' },
  { value: 'assistant', labelKey: 'roles.assistant', descKey: 'mobile.login.roleAssistant' },
  { value: 'reader', labelKey: 'roles.reader', descKey: 'mobile.login.roleReader' },
];

export default function LoginScreen() {
  const { login, register } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();
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
      setError(t('mobile.login.requiredCredentials'));
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!displayName) {
          setError(t('mobile.login.requiredDisplayName'));
          setLoading(false);
          return;
        }
        await register({ email, password, displayName, role });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || t('mobile.login.genericError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View
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
              <View
                style={styles.logoCircle}
              >
                <BookOpen size={30} color="#fffaf0" />
              </View>
              <ThemedText style={styles.brandTitle}>{t('common.appName')}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.brandSubtitle}>
                {t('mobile.login.brandSubtitle')}
              </ThemedText>
            </View>

            {/* Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(28,41,40, 0.86)' : '#fffaf0',
                  borderColor: isDark ? 'rgba(255,250,240,0.12)' : '#d9cdb8',
                },
              ]}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <ThemedText style={styles.cardTitle}>
                  {isLogin ? t('mobile.login.loginTitle') : t('mobile.login.registerTitle')}
                </ThemedText>
                <ThemedText themeColor="textSecondary" style={styles.cardSubtitle}>
                  {isLogin
                    ? t('mobile.login.loginSubtitle')
                    : t('mobile.login.registerSubtitle')}
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
                  <ThemedText themeColor="textSecondary" style={styles.inputLabel}>{t('mobile.login.displayName')}</ThemedText>
                  <View
                    style={[
                      styles.inputRow,
                      {
                        backgroundColor: isDark ? 'rgba(255,250,240,0.03)' : 'rgba(28,41,40, 0.04)',
                        borderColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(28,41,40, 0.08)',
                      },
                      nameFocused && styles.inputRowActive,
                    ]}
                  >
                    <User size={16} color={nameFocused ? '#1c2928' : '#656b64'} />
                    <TextInput
                      style={[styles.textInput, { color: theme.text }]}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder={t('mobile.login.displayNamePlaceholder')}
                      placeholderTextColor={isDark ? '#59615b' : '#9aa39a'}
                      autoCapitalize="words"
                      onFocus={() => setNameFocused(true)}
                      onBlur={() => setNameFocused(false)}
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.inputGroup}>
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>{t('mobile.login.email')}</ThemedText>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,250,240,0.03)' : 'rgba(28,41,40, 0.04)',
                      borderColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(28,41,40, 0.08)',
                    },
                    emailFocused && styles.inputRowActive,
                  ]}
                >
                  <Mail size={16} color={emailFocused ? '#1c2928' : '#656b64'} />
                  <TextInput
                    style={[styles.textInput, { color: theme.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={isDark ? '#59615b' : '#9aa39a'}
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
                <ThemedText themeColor="textSecondary" style={styles.inputLabel}>{t('mobile.login.password')}</ThemedText>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: isDark ? 'rgba(255,250,240,0.03)' : 'rgba(28,41,40, 0.04)',
                      borderColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(28,41,40, 0.08)',
                    },
                    passwordFocused && styles.inputRowActive,
                  ]}
                >
                  <Lock size={16} color={passwordFocused ? '#1c2928' : '#656b64'} />
                  <TextInput
                    style={[styles.textInput, { flex: 1, color: theme.text }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#59615b' : '#9aa39a'}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)}>
                    {showPassword ? (
                        <EyeOff size={16} color={passwordFocused ? '#1c2928' : '#656b64'} />
                    ) : (
                        <Eye size={16} color={passwordFocused ? '#1c2928' : '#656b64'} />
                    )}
                  </Pressable>
                </View>
              </View>

              {/* Register: Role Picker */}
              {!isLogin && (
                <View style={styles.inputGroup}>
                  <ThemedText themeColor="textSecondary" style={styles.inputLabel}>{t('mobile.login.role')}</ThemedText>
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
                              backgroundColor: isDark ? 'rgba(255,250,240,0.02)' : 'rgba(28,41,40, 0.02)',
                              borderColor: isDark ? 'rgba(255,250,240,0.06)' : 'rgba(28,41,40, 0.06)',
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
                            {t(opt.labelKey)}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.roleChipDesc,
                              active && { color: 'rgba(255,250,240,0.6)' },
                            ]}
                          >
                            {t(opt.descKey)}
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
                <View
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fffaf0" />
                  ) : (
                    <>
                      <ThemedText style={styles.submitText}>
                        {isLogin ? t('mobile.login.submitLogin') : t('mobile.login.submitRegister')}
                      </ThemedText>
                      <ChevronRight size={16} color="#fffaf0" />
                    </>
                  )}
                </View>
              </Pressable>

              {/* Toggle */}
              <View style={styles.toggleRow}>
                <ThemedText themeColor="textSecondary" style={styles.toggleText}>
                  {isLogin ? t('mobile.login.noAccount') : t('mobile.login.hasAccount')}
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setIsLogin(!isLogin);
                    setError('');
                  }}
                >
                  <ThemedText style={styles.toggleLink}>
                    {isLogin ? t('mobile.login.submitRegister') : t('mobile.login.submitLogin')}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f6efdf' },
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
    backgroundColor: '#b94234',
    shadowColor: '#1c2928',
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
    backgroundColor: '#fffaf0',
    borderRadius: 16,
    padding: 22,
    borderWidth: 1,
    borderColor: '#d9cdb8',
    gap: 16,
  },
  cardHeader: { gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '900' },
  cardSubtitle: { fontSize: 12 },
  errorBox: {
    backgroundColor: '#fffaf0',
    borderWidth: 1,
    borderColor: '#e2b09a',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  errorText: { color: '#a43a32', fontSize: 11, fontWeight: '700' },
  inputGroup: { gap: 6 },
  inputLabel: {
    color: '#59615b',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f6efdf',
    borderWidth: 1,
    borderColor: '#d9cdb8',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
  },
  inputRowActive: {
    borderColor: '#1c2928',
    backgroundColor: '#eee2cf',
  },
  textInput: {
    flex: 1,
    color: '#1c2928',
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
    borderColor: '#d9cdb8',
    backgroundColor: '#f6efdf',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  roleChipActive: {
    borderColor: '#1c2928',
    backgroundColor: '#eee2cf',
  },
  roleChipLabel: {
    color: '#59615b',
    fontSize: 12,
    fontWeight: '800',
  },
  roleChipLabelActive: { color: '#1c2928' },
  roleChipDesc: { color: '#918f83', fontSize: 10 },
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
    backgroundColor: '#1c2928',
  },
  submitText: { color: '#fffaf0', fontSize: 16, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  toggleText: { color: '#59615b', fontSize: 12 },
  toggleLink: { color: '#1c2928', fontSize: 12, fontWeight: '800' },
});
