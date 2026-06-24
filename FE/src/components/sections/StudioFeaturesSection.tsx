import { useTranslation } from 'react-i18next'
import { KanbanSquare, PencilRuler, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui'

export function StudioFeaturesSection() {
  const { t } = useTranslation()

  const featureCards = [
    {
      titleKey: 'studioLanding.featureCanvas',
      descKey: 'studioLanding.featureCanvasDesc',
      icon: PencilRuler,
    },
    {
      titleKey: 'studioLanding.featureWorkflow',
      descKey: 'studioLanding.featureWorkflowDesc',
      icon: KanbanSquare,
    },
    {
      titleKey: 'studioLanding.featureRoles',
      descKey: 'studioLanding.featureRolesDesc',
      icon: ShieldCheck,
    },
  ]

  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8" id="features">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">{t('studioLanding.coreFeatures')}</p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('studioLanding.coreFeaturesTitle')}</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {featureCards.map(({ titleKey, descKey, icon: Icon }) => (
          <Card key={titleKey} className="p-6 shadow-sm">
            <CardHeader className="gap-3 p-0">
              <div className="grid size-10 place-items-center rounded-xl bg-neutral-950 text-white">
                <Icon className="size-5" />
              </div>
              <CardTitle>{t(titleKey)}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <p className="text-sm leading-6 text-neutral-500">{t(descKey)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
