import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../lib/auth'
import { authAPI } from '../../lib/api'
import { Button, Card, Input, Textarea } from '../ui'
import { Bell, Save, User as UserIcon, CheckCircle, AlertCircle } from 'lucide-react'

export function SettingsPage() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState(user?.avatar || '')
  const [subscribedToNewSeries, setSubscribedToNewSeries] = useState(user?.subscribedToNewSeries || false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useState(() => {
    authAPI.getMe()
      .then((res) => {
        const u = res.data.user
        if (u) {
          setDisplayName(u.displayName || '')
          setBio(u.bio || '')
          setAvatar(u.avatar || '')
          setSubscribedToNewSeries(u.subscribedToNewSeries || false)
          updateUser(u)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch user settings:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  })

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await authAPI.updateProfile({
        displayName,
        bio,
        avatar,
        subscribedToNewSeries,
      })
      
      const updatedUser = res.data.user
      if (updatedUser) {
        updateUser(updatedUser)
        setMessage({ type: 'success', text: t('settingsPage.saveSuccess') })
      }
    } catch (err) {
      console.error('Failed to update settings:', err)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMsg = (err as any).response?.data?.error || t('settingsPage.saveError')
      setMessage({ type: 'error', text: errorMsg })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-neutral-350 border-t-neutral-950" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-neutral-950">{t('settingsPage.title')}</h1>
        <p className="text-sm text-neutral-500">{t('settingsPage.subtitle')}</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 rounded-xl p-4 text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-805 border border-emerald-200'
              : 'bg-red-50 text-red-805 border border-red-205'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="size-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="size-5 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="p-6 border border-neutral-200 shadow-sm rounded-2xl bg-white space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
              <UserIcon className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-950">{t('settingsPage.profileSection')}</h2>
              <p className="text-xs text-neutral-550">Update your public identity details.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">{t('settingsPage.displayName')}</label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('settingsPage.displayNamePlaceholder')}
                required
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-700">{t('settingsPage.avatarUrl')}</label>
              <Input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder={t('settingsPage.avatarUrlPlaceholder')}
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-semibold text-neutral-700">{t('settingsPage.bio')}</label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('settingsPage.bioPlaceholder')}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-neutral-200 shadow-sm rounded-2xl bg-white space-y-6">
          <div className="flex items-center gap-3 border-b border-neutral-100 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-neutral-100 text-neutral-600">
              <Bell className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-950">{t('settingsPage.notificationSection')}</h2>
              <p className="text-xs text-neutral-550">Configure how you want to be notified.</p>
            </div>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-950">{t('settingsPage.subscribeNewSeries')}</h3>
              <p className="text-xs text-neutral-550 leading-relaxed max-w-xl">
                {t('settingsPage.subscribeNewSeriesDesc')}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 select-none">
              <input
                type="checkbox"
                checked={subscribedToNewSeries}
                onChange={(e) => setSubscribedToNewSeries(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-950"></div>
            </label>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="h-10 px-6 gap-2 bg-neutral-950 text-white hover:bg-neutral-850 rounded-xl text-sm font-medium transition-all"
          >
            <Save className="size-4" />
            {saving ? t('settingsPage.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </div>
  )
}
