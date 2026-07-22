/* eslint-disable */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookMarked, Eye, EyeOff, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { Button, Input } from '../ui';

const roleOptions = [
  { value: 'mangaka', labelKey: 'roles.mangaka' },
  { value: 'assistant', labelKey: 'roles.assistant' },
  { value: 'reader', labelKey: 'roles.reader' },
];

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { login, register, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Auto redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role?.toLowerCase() === 'reader') {
        navigate('/discover', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('reader');

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register({ email, password, displayName, role });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-neutral-950 text-white">
        <img
          src="/manga/featured-banner.png"
          alt="MangaFlow"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="grid size-10 place-items-center rounded-xl bg-white text-neutral-900">
              <BookMarked className="size-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MangaFlow</span>
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-3">
            {i18n.language === 'vi'
              ? 'Nền tảng sản xuất Manga\nchuyên nghiệp'
              : 'The Professional\nManga Production Platform'}
          </h2>
          <p className="text-white/60 text-sm leading-6 max-w-md">
            {i18n.language === 'vi'
              ? 'Kết nối tác giả, trợ lý, biên tập viên và độc giả trong một hệ sinh thái hoàn chỉnh.'
              : 'Connect mangaka, assistants, editors and readers in one complete ecosystem.'}
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Language toggle */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={toggleLang}
              className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              <Globe className="size-3.5" />
              {i18n.language === 'en' ? 'VI' : 'EN'}
            </button>
          </div>

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="grid size-8 place-items-center rounded-lg bg-neutral-900 text-white">
              <BookMarked className="size-4" />
            </div>
            <span className="text-base font-semibold">MangaFlow</span>
          </div>

          {/* Header */}
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              {isLogin ? t('auth.loginTitle') : t('auth.registerTitle')}
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-neutral-700 mb-1.5 block">
                  {t('auth.displayName')}
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Yuki Mori"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-neutral-700 mb-1.5 block">
                {t('auth.email')}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 mb-1.5 block">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pr-9"
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <label className="text-xs font-medium text-neutral-700 mb-1.5 block">
                  {t('auth.selectRole')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roleOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                        role === opt.value
                          ? 'border-neutral-900 bg-neutral-900 text-white'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-400'
                      }`}
                      onClick={() => setRole(opt.value)}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('common.loading') : isLogin ? t('auth.login') : t('auth.register')}
            </Button>
          </form>

          {/* Toggle login/register */}
          <p className="text-center text-xs text-neutral-500">
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}{' '}
            <button
              type="button"
              className="font-semibold text-neutral-900 hover:underline"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
            >
              {isLogin ? t('auth.register') : t('auth.login')}
            </button>
          </p>

          {/* Demo accounts hint */}
          <div className="rounded-xl bg-neutral-100 p-3 space-y-1">
            <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] text-neutral-600">
              <span>mangaka@mangaflow.com</span><span>password123</span>
              <span>assistant@mangaflow.com</span><span>password123</span>
              <span>editor@mangaflow.com</span><span>password123</span>
              <span>reader@mangaflow.com</span><span>password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
