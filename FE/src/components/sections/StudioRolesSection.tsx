import { BookHeart, Brush, Building2, FileEdit, Pen } from 'lucide-react'

const roles = [
  { label: 'Mangaka', description: 'Lead creators', icon: Pen },
  { label: 'Assistant', description: 'Background & inking', icon: Brush },
  { label: 'Editor', description: 'Review & feedback', icon: FileEdit },
  { label: 'Editorial Board', description: 'Publishing decisions', icon: Building2 },
  { label: 'Reader', description: 'Discover & vote', icon: BookHeart },
]

export function StudioRolesSection() {
  return (
    <section className="border-b border-neutral-200 px-4 py-8 sm:px-6 lg:px-8" id="workflow">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {roles.map(({ label, description, icon: Icon }) => (
          <div key={label} className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center sm:p-2">
            <div className="grid size-10 place-items-center rounded-xl bg-neutral-100 text-neutral-950">
              <Icon className="size-5" />
            </div>
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-xs text-neutral-500">{description}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
