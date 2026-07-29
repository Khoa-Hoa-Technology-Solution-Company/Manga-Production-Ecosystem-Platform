import { useTranslation } from 'react-i18next'
import { BookMarked } from 'lucide-react'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-neutral-200/80 bg-white/60 px-4 py-6 text-xs text-neutral-500 sm:px-6 lg:px-8">
      <div className="flex items-center">
        <div className="flex items-center gap-2">
          <BookMarked className="size-3.5" />
          <span>{t('footer.copyright')}</span>
        </div>
      </div>
    </footer>
  )
}
