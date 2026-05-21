import { KanbanSquare, PencilRuler, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui'

const featureCards = [
  {
    title: 'Real-Time Canvas Annotation',
    description:
      'Collaborative drawing tools with pixel-perfect comments, layer locking, and live cursors across every team member.',
    icon: PencilRuler,
  },
  {
    title: 'Automated Workflow Engine',
    description:
      'Kanban-based chapter states automate handoffs from thumbnail to publish — no more lost files or version chaos.',
    icon: KanbanSquare,
  },
  {
    title: 'Role-Based Ecosystem',
    description:
      'Permission-driven access per role keeps creators, editors, and publishers focused on exactly what they own.',
    icon: ShieldCheck,
  },
]

export function StudioFeaturesSection() {
  return (
    <section className="px-4 py-10 sm:px-6 lg:px-8" id="features">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Core Features</p>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Everything you need to ship a chapter</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {featureCards.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="p-6 shadow-sm">
            <CardHeader className="gap-3 p-0">
              <div className="grid size-10 place-items-center rounded-xl bg-neutral-950 text-white">
                <Icon className="size-5" />
              </div>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pt-3">
              <p className="text-sm leading-6 text-neutral-500">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
