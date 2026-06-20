import { ArrowUp, BookOpen, CheckSquare, Heart } from 'lucide-react'
import { Card, CardContent, CardHeader, Badge } from '../ui'

const metrics = [
  {
    label: 'Active Series',
    value: '12',
    delta: '+2',
    note: '+2 since last month',
    icon: BookOpen,
  },
  {
    label: 'Pending Tasks',
    value: '27',
    note: '5 due in 24h',
    icon: CheckSquare,
    badge: '8 urgent',
    badgeVariant: 'destructive' as const,
  },
  {
    label: 'Reader Votes',
    value: '184.2K',
    note: 'This week',
    icon: Heart,
    badge: '+12.4%',
    badgeVariant: 'secondary' as const,
  },
]

export function KpiCardsSection() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {metrics.map((item) => {
        const Icon = item.icon

        return (
          <Card key={item.label} className="gap-2 p-4 shadow-sm">
            <CardHeader className="flex-row items-center justify-between gap-2 p-0">
              <span className="text-xs leading-4 text-neutral-500">{item.label}</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-100">
                <Icon className="size-4" />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold leading-8">{item.value}</span>
                {item.delta ? (
                  <span className="flex items-center text-xs leading-4 text-emerald-600">
                    <ArrowUp className="size-3" />
                    {item.delta}
                  </span>
                ) : null}
                {item.badge ? (
                  <Badge variant="default" className={item.badgeVariant === 'destructive' ? 'h-4 px-1 text-[10px] text-red-600' : 'h-4 px-1 text-[10px] text-emerald-600'}>
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
              <span className="text-xs leading-4 text-neutral-500">{item.note}</span>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
