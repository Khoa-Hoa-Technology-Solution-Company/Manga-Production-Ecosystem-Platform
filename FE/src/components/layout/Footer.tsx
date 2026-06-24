import { useTranslation } from 'react-i18next'
import { BookMarked } from 'lucide-react'

export function Footer() {
  const { t } = useTranslation()

  const links = [
    { key: 'footer.privacy', label: t('footer.privacy') },
    { key: 'footer.terms', label: t('footer.terms') },
    { key: 'footer.contact', label: t('footer.contact') },
    { key: 'footer.twitter', label: t('footer.twitter') },
    { key: 'footer.discord', label: t('footer.discord') },
  ]

  return (
    <footer className="border-t border-neutral-200 px-4 py-6 text-xs text-neutral-500 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="size-3.5" />
          <span>{t('footer.copyright')}</span>
        </div>
        <div className="flex flex-wrap gap-4 sm:justify-end">
          {links.map((item) => (
            <a key={item.key} href="#" className="transition hover:text-neutral-950">
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
