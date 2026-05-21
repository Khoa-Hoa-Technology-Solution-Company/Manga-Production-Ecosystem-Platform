import { Bell, Search, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Input } from '../ui'

function getFormattedDate(): string {
  const now = new Date()
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`
}

export function Header() {
  return (
    <header className="flex h-auto flex-col justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:px-8">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold leading-7">Welcome back, Hiro</h1>
        <span className="text-xs leading-4 text-neutral-500">{getFormattedDate()} · 3 chapters due this week</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input placeholder="Search series, chapters..." className="h-9 w-full pl-9 sm:w-64" />
        </div>
        <Badge variant="default" className="gap-1">
          <Sparkles className="size-3" />
          Mangaka
        </Badge>
        <Button variant="ghost" size="sm" className="relative size-9 p-0">
          <Bell className="size-4" />
          <span className="absolute right-1 top-1 size-2 rounded-full bg-[#e7000b]" />
        </Button>
        <Avatar className="size-9 bg-neutral-200">
          <AvatarFallback>HK</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
