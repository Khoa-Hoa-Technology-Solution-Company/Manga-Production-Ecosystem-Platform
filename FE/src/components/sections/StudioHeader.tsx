import { ArrowRight, Sparkles } from 'lucide-react'
import { Badge, Button } from '../ui'

export function StudioHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 lg:px-8">
      <nav className="hidden items-center gap-6 text-sm sm:flex">
        <a className="font-medium text-neutral-950" href="#features">
          Features
        </a>
        <a className="text-neutral-500 transition hover:text-neutral-950" href="#workflow">
          Workflow
        </a>
        <a className="text-neutral-500 transition hover:text-neutral-950" href="#pricing">
          Pricing
        </a>
        <a className="text-neutral-500 transition hover:text-neutral-950" href="#about">
          About
        </a>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="default" className="hidden gap-1.5 sm:inline-flex">
          <Sparkles className="size-3" />
          Live Studio
        </Badge>
        <Button variant="ghost" size="sm">
          Log In
        </Button>
        <Button size="sm" className="gap-1.5">
          Get Started <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </header>
  )
}
