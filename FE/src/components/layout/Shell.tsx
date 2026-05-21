import type { ReactNode } from 'react'

type ShellProps = {
  sidebar: ReactNode
  header: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function Shell({ sidebar, header, children, footer }: ShellProps) {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-screen-2xl flex-col border-x border-neutral-200 lg:flex-row">
        {sidebar}

        <main className="min-w-0 flex-1 flex flex-col">
          {/* Mobile-only top bar with hamburger */}
          {header}

          <div className="flex-1">{children}</div>
          {footer}
        </main>
      </div>
    </div>
  )
}
