import { useTranslation } from 'react-i18next'
import { Bell, Search, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Input } from '../ui'
import { useAuth } from '../../lib/auth'

export function Header() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()

  const getFormattedDate = (): string => {
    const now = new Date()
    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    return now.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })
  }

  const displayName = user?.displayName || 'User'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const roleName = user?.role ? t(`roles.${user.role}`) : t('roles.reader')

  return (
    <header className="flex h-auto flex-col justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:px-8">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold leading-7">{t('header.welcomeBack', { name: displayName })}</h1>
        <span className="text-xs leading-4 text-neutral-500">{t('header.chaptersDue', { date: getFormattedDate(), count: 3 })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input placeholder={t('header.searchPlaceholder')} className="h-9 w-full pl-9 sm:w-64" />
        </div>
        <Badge variant="default" className="gap-1">
          <Sparkles className="size-3" />
          {roleName}
        </Badge>
        <Button variant="ghost" size="sm" className="relative size-9 p-0">
          <Bell className="size-4" />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-[#e7000b]" />
        </Button>
        <Avatar className="size-9 bg-neutral-200">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
