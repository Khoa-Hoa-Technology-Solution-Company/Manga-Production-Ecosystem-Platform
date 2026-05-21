import { BookMarked } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 px-4 py-6 text-xs text-neutral-500 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BookMarked className="size-3.5" />
          <span>© 2026 MangaFlow. All rights reserved.</span>
        </div>
        <div className="flex flex-wrap gap-4 sm:justify-end">
          {['Privacy', 'Terms', 'Contact', 'Twitter', 'Discord'].map((item) => (
            <a key={item} href="#" className="transition hover:text-neutral-950">
              {item}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
