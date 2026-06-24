import { useTranslation } from 'react-i18next'
import { BookHeart, Brush, Building2, FileEdit, Pen } from 'lucide-react'

export function RoleStripSection() {
  const { t } = useTranslation()

  const roles = [
    { labelKey: 'roleStrip.mangakaLabel', descKey: 'roleStrip.mangakaDesc', icon: Pen },
    { labelKey: 'roleStrip.assistantLabel', descKey: 'roleStrip.assistantDesc', icon: Brush },
    { labelKey: 'roleStrip.editorLabel', descKey: 'roleStrip.editorDesc', icon: FileEdit },
    { labelKey: 'roleStrip.ebLabel', descKey: 'roleStrip.ebDesc', icon: Building2 },
    { labelKey: 'roleStrip.readerLabel', descKey: 'roleStrip.readerDesc', icon: BookHeart },
  ]

  return (
    <section className="border-b border-neutral-200 px-4 py-8 sm:px-6 lg:px-8" id="workflow">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {roles.map(({ labelKey, descKey, icon: Icon }) => (
          <div key={labelKey} className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center sm:p-2">
            <div className="grid size-10 place-items-center rounded-xl bg-neutral-100 text-neutral-950">
              <Icon className="size-5" />
            </div>
            <span className="text-sm font-semibold">{t(labelKey)}</span>
            <span className="text-xs text-neutral-500">{t(descKey)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
