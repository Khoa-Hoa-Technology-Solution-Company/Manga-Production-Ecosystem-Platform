import { ArrowRight, BookHeart, Brush, Pen } from 'lucide-react'
import { Button, Card } from '../ui'

const roleCtas = [
  {
    title: 'Creators — Bring your manga to life',
    description:
      'Tools, assistants and editorial feedback in one workspace built for serialized storytelling.',
    cta: 'Sign up as Creator',
    icon: Pen,
    accent: 'bg-[#f54900]/15 text-[#f54900]',
    buttonVariant: 'default' as const,
  },
  {
    title: 'Assistants — Get paid for your craft',
    description:
      'Pick up gigs from established mangaka with transparent rates, milestones and instant payouts.',
    cta: 'Join as Assistant',
    icon: Brush,
    accent: 'bg-[#009689]/15 text-[#009689]',
    buttonVariant: 'secondary' as const,
  },
  {
    title: 'Readers — Discover and vote for your favorites',
    description:
      'Explore upcoming series, support creators directly and help shape which stories get serialized next.',
    cta: 'Start Reading',
    icon: BookHeart,
    accent: 'bg-[#ffb900]/15 text-[#9a6b00]',
    buttonVariant: 'secondary' as const,
  },
]

export function StudioCtaSection() {
  return (
    <section className="px-4 pb-10 sm:px-6 lg:px-8" id="pricing">
      <div className="space-y-4">
        {roleCtas.map(({ title, description, cta, icon: Icon, accent, buttonVariant }) => (
          <Card key={title} className="p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex items-start gap-4">
                <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${accent}`}>
                  <Icon className="size-6" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h3>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>
                </div>
              </div>

              <Button variant={buttonVariant} className="gap-2 self-start md:self-center">
                {cta} <ArrowRight className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
