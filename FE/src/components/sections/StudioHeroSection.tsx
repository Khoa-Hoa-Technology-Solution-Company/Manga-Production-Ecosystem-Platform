import { useTranslation } from 'react-i18next'
import { ArrowRight, Pencil, Play, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button } from '../ui'

export function StudioHeroSection() {
  const { t } = useTranslation()

  return (
    <section className="overflow-hidden bg-neutral-950 text-white">
      <div className="grid gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-2 lg:px-12 lg:py-12">
        <div className="flex flex-col justify-center gap-6">
          <Badge variant="secondary" className="w-fit gap-1.5">
            <Sparkles className="size-3" />
            {t('studioLanding.publicBeta')}
          </Badge>

          <div className="space-y-4">
            <h1 className="max-w-xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              {t('studioLanding.heroTitle')}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base sm:leading-7">
              {t('studioLanding.heroDescription')}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" variant="secondary" className="gap-2">
              {t('studioLanding.startCreating')} <ArrowRight className="size-4" />
            </Button>
            <Button size="lg" variant="outline" className="gap-2 border-white/20 bg-transparent text-white hover:bg-white/5">
              <Play className="size-4" />
              {t('studioLanding.watchDemo')}
            </Button>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="flex -space-x-2">
              {['A', 'B', 'C', 'D'].map((initial) => (
                <Avatar key={initial} className="size-8 border-2 border-white bg-neutral-300">
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-white/60 sm:text-sm">{t('studioLanding.creatorsOnboard')}</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_34%),linear-gradient(135deg,#242432_0%,#0c0c10_100%)] shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1763732397784-c5ff2651d40c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3ODc2NDd8MHwxfHNlYXJjaHwxfHxtYW5nYSUyMGlsbHVzdHJhdGlvbiUyMGFydHdvcmt8ZW58MXwwfHx8MTc3OTI2OTQyNHww&ixlib=rb-4.1.0&q=80&w=1200"
              alt="Manga canvas"
              className="h-full w-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-[11px] font-medium text-neutral-950 shadow-lg backdrop-blur">
              <span className="size-2 animate-pulse rounded-full bg-[#e7000b]" />
              {t('studioLanding.liveEditing')}
            </div>

            <div className="absolute right-4 top-16 max-w-48 rounded-xl bg-white/95 p-3 text-neutral-950 shadow-lg backdrop-blur">
              <div className="mb-1.5 flex items-center gap-2">
                <Avatar className="size-5 bg-neutral-200">
                  <AvatarFallback className="text-[8px]">EK</AvatarFallback>
                </Avatar>
                <span className="text-[10px] font-semibold">Editor Kenji</span>
              </div>
              <p className="text-[10px] leading-4 text-neutral-500">{t('studioLanding.tightenPanel')}</p>
            </div>

            <div className="absolute bottom-4 left-4 flex items-center -space-x-2">
              {['M', 'A', 'E'].map((initial, idx) => (
                <Avatar key={initial} className="size-8 border-2 border-white text-white">
                  <AvatarFallback
                    className={idx === 0 ? 'bg-[#f54900] text-white' : idx === 1 ? 'bg-[#009689] text-white' : 'bg-[#ffb900] text-white'}
                  >
                    {initial}
                  </AvatarFallback>
                </Avatar>
              ))}
              <div className="grid size-8 place-items-center rounded-full border-2 border-white bg-white/95 text-[10px] font-semibold text-neutral-950 shadow-lg">
                +3
              </div>
            </div>

            <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-neutral-950 px-3 py-2 text-[10px] font-medium text-white shadow-lg">
              <Pencil className="size-3" />
              {t('studioLanding.annotationTool')}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
