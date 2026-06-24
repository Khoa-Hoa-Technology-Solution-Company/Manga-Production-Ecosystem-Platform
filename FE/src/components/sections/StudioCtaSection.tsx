import { useTranslation } from 'react-i18next'
import { ArrowRight, BookHeart, Brush, Pen } from 'lucide-react'
import { Button, Card } from '../ui'

export function StudioCtaSection() {
  const { t } = useTranslation()

  const roleCtas = [
    {
      titleKey: 'roleCta.creatorsTitle',
      descKey: 'roleCta.creatorsDesc',
      ctaKey: 'roleCta.creatorsCta',
      icon: Pen,
      accent: 'bg-[#f54900]/15 text-[#f54900]',
      buttonVariant: 'default' as const,
    },
    {
      titleKey: 'roleCta.assistantsTitle',
      descKey: 'roleCta.assistantsDesc',
      ctaKey: 'roleCta.assistantsCta',
      icon: Brush,
      accent: 'bg-[#009689]/15 text-[#009689]',
      buttonVariant: 'secondary' as const,
    },
    {
      titleKey: 'roleCta.readersTitle',
      descKey: 'roleCta.readersDesc',
      ctaKey: 'roleCta.readersCta',
      icon: BookHeart,
      accent: 'bg-[#ffb900]/15 text-[#9a6b00]',
      buttonVariant: 'secondary' as const,
    },
  ]

  return (
    <section className="px-4 pb-10 sm:px-6 lg:px-8" id="pricing">
      <div className="space-y-4">
        {roleCtas.map(({ titleKey, descKey, ctaKey, icon: Icon, accent, buttonVariant }) => (
          <Card key={titleKey} className="p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex items-start gap-4">
                <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${accent}`}>
                  <Icon className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight sm:text-lg">{t(titleKey)}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">{t(descKey)}</p>
                </div>
              </div>

              <Button variant={buttonVariant} className="gap-2 self-start md:self-center">
                {t(ctaKey)} <ArrowRight className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
