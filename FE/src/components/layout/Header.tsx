import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, Badge } from '../ui'
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
    <header className="flex h-auto flex-col justify-between gap-4 border-b border-neutral-200/80 bg-white/80 px-4 py-4 backdrop-blur sm:px-6 lg:h-[4.5rem] lg:flex-row lg:items-center lg:px-8">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold leading-7 tracking-[-0.02em]">{t('header.welcomeBack', { name: displayName })}</h1>
        <span className="text-[11px] leading-4 text-neutral-500">{t('header.currentDate', { date: getFormattedDate() })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <Badge variant="default" className="gap-1">
          <Sparkles className="size-3" />
          {roleName}
        </Badge>
        <Avatar className="size-9 bg-neutral-200">
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
