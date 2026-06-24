import { useState, useEffect } from 'react'
import { ArrowUp, ArrowDown, BookOpen, CheckSquare, Heart, Coins } from 'lucide-react'
import { Card, CardContent, CardHeader, Badge } from '../ui'
import { useAuth } from '../../lib/auth'
import { dashboardAPI } from '../../lib/api'

type StatsData = {
  activeSeries?: number
  activeSeriesDelta?: number
  pendingTasks?: number
  urgentTasks?: number
  weeklyVotes?: number
  weeklyVotesDelta?: number
  availableTasks?: number
  inProgress?: number
  completed?: number
  earnings?: number
  reviewing?: number
  approved?: number
  published?: number
  totalSeries?: number
  subscribedSeries?: number
  publishedChapters?: number
  totalVotes?: number
}

export function KpiCardsSection() {
  const { user } = useAuth()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    dashboardAPI.getStats()
      .then((res) => {
        setStats(res.data.stats || {})
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard stats:', err)
        setError('Could not load statistics')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [user])

  if (loading) {
    return (
      <section className="grid gap-4 xl:grid-cols-3">
        {[1, 2, 3].map((idx) => (
          <Card key={idx} className="gap-2 p-4 shadow-sm animate-pulse border border-neutral-100 bg-neutral-50/50">
            <CardHeader className="flex-row items-center justify-between gap-2 p-0">
              <div className="h-4 w-28 bg-neutral-200 rounded" />
              <div className="size-8 bg-neutral-200 rounded-lg" />
            </CardHeader>
            <CardContent className="p-0 space-y-2 mt-2">
              <div className="h-8 w-20 bg-neutral-200 rounded" />
              <div className="h-3 w-40 bg-neutral-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </section>
    )
  }

  if (error || !stats) {
    return (
      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="col-span-3 p-6 text-center text-xs leading-4 text-red-500 border border-red-100 bg-red-50/30">
          {error || 'An error occurred while loading dashboard stats.'}
        </Card>
      </section>
    )
  }

  const role = user?.role || 'reader'

  let metrics: Array<{
    label: string
    value: string | number
    delta?: string | number
    deltaDirection?: 'up' | 'down'
    note: string
    icon: typeof BookOpen
    badge?: string
    badgeVariant?: 'default' | 'secondary' | 'destructive'
  }>

  if (role === 'mangaka') {
    metrics = [
      {
        label: 'Active Series',
        value: stats.activeSeries || 0,
        delta: stats.activeSeriesDelta && stats.activeSeriesDelta > 0 ? `+${stats.activeSeriesDelta}` : undefined,
        deltaDirection: 'up',
        note: stats.activeSeriesDelta && stats.activeSeriesDelta > 0 
          ? `+${stats.activeSeriesDelta} created this month` 
          : 'Total active series',
        icon: BookOpen,
      },
      {
        label: 'Pending Tasks',
        value: stats.pendingTasks || 0,
        note: `${stats.urgentTasks || 0} deadline in 24h`,
        icon: CheckSquare,
        badge: stats.urgentTasks && stats.urgentTasks > 0 ? `${stats.urgentTasks} urgent` : undefined,
        badgeVariant: 'destructive',
      },
      {
        label: 'Weekly Votes',
        value: (stats.weeklyVotes || 0).toLocaleString(),
        note: 'Weekly reader votes',
        icon: Heart,
        badge: stats.weeklyVotesDelta ? `${stats.weeklyVotesDelta >= 0 ? '+' : ''}${stats.weeklyVotesDelta}%` : undefined,
        badgeVariant: stats.weeklyVotesDelta && stats.weeklyVotesDelta >= 0 ? 'secondary' : 'destructive',
      },
    ]
  } else if (role === 'assistant') {
    metrics = [
      {
        label: 'Available Gigs',
        value: stats.availableTasks || 0,
        note: 'Tasks open for recruitment',
        icon: BookOpen,
      },
      {
        label: 'Tasks In Progress',
        value: stats.inProgress || 0,
        note: `${stats.urgentTasks || 0} deadline in 24h`,
        icon: CheckSquare,
        badge: stats.urgentTasks && stats.urgentTasks > 0 ? 'Urgent' : undefined,
        badgeVariant: 'destructive',
      },
      {
        label: 'Total Earnings',
        value: stats.earnings ? `$${stats.earnings.toLocaleString()}` : '$0',
        note: 'Lifetime payout',
        icon: Coins,
      },
    ]
  } else if (role === 'editor' || role === 'editorial_board') {
    metrics = [
      {
        label: 'Chapters Reviewing',
        value: stats.reviewing || 0,
        note: 'Under active review',
        icon: CheckSquare,
        badge: stats.reviewing && stats.reviewing > 0 ? 'Action required' : undefined,
        badgeVariant: 'destructive',
      },
      {
        label: 'Chapters Approved',
        value: stats.approved || 0,
        note: 'Ready for final publication decision',
        icon: BookOpen,
      },
      {
        label: 'Published Chapters',
        value: stats.published || 0,
        note: 'All-time published chapters',
        icon: Heart,
      },
    ]
  } else {
    // Reader & fallback
    metrics = [
      {
        label: 'Subscribed Series',
        value: stats.subscribedSeries || 0,
        note: 'In your reading list',
        icon: BookOpen,
      },
      {
        label: 'Published Chapters',
        value: stats.publishedChapters || 0,
        note: 'Total chapters online',
        icon: CheckSquare,
      },
      {
        label: 'Total Votes Cast',
        value: stats.totalVotes || 0,
        note: 'Your votes supported creators',
        icon: Heart,
      },
    ]
  }

  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {metrics.map((item) => {
        const Icon = item.icon

        return (
          <Card key={item.label} className="gap-2 p-4 shadow-sm border border-neutral-200/80 bg-white hover:border-neutral-300 transition-colors">
            <CardHeader className="flex-row items-center justify-between gap-2 p-0">
              <span className="text-xs font-medium leading-4 text-neutral-500">{item.label}</span>
              <div className="flex size-8 items-center justify-center rounded-lg bg-neutral-50 border border-neutral-100 text-neutral-600">
                <Icon className="size-4" />
              </div>
            </CardHeader>

            <CardContent className="p-0 mt-1">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold leading-8 text-neutral-900">{item.value}</span>
                {item.delta ? (
                  <span className={`flex items-center text-xs font-medium leading-4 ${
                    item.deltaDirection === 'up' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {item.deltaDirection === 'up' ? (
                      <ArrowUp className="size-3 mr-0.5" />
                    ) : (
                      <ArrowDown className="size-3 mr-0.5" />
                    )}
                    {item.delta}
                  </span>
                ) : null}
                {item.badge ? (
                  <Badge variant={item.badgeVariant || 'default'} className="h-4 px-1.5 text-[10px] font-semibold">
                    {item.badge}
                  </Badge>
                ) : null}
              </div>
              <span className="text-xs leading-4 text-neutral-400 font-medium block mt-1">{item.note}</span>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}
