import { useState } from 'react'
import {
  ArrowUp,
  Banknote,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  ListTodo,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Progress, Tabs } from '../ui'

/* ── Stats ───────────────────────────────────────────── */
const stats = [
  { label: 'Available Tasks', value: '18', icon: ListTodo, delta: '+3 new', deltaColor: 'text-blue-600', bgIcon: 'bg-blue-50' },
  { label: 'In Progress', value: '5', icon: Clock, note: '2 due soon', bgIcon: 'bg-amber-50' },
  { label: 'Completed', value: '142', icon: CheckCircle2, delta: '+12 this month', deltaColor: 'text-emerald-600', bgIcon: 'bg-emerald-50' },
  { label: 'Total Earnings', value: '¥1.86M', icon: DollarSign, delta: '+18.2%', deltaColor: 'text-emerald-600', bgIcon: 'bg-purple-50', sparkline: true },
]

/* ── Tasks ────────────────────────────────────────────── */
const tasks = [
  { id: 1, series: 'Shadow Blade Saga', chapter: 'Ch. 42', type: 'Inking', deadline: 'Mar 22', payment: '¥45,000', status: 'Available', cover: '/manga/cover-action.png', urgency: 'high' },
  { id: 2, series: 'Neon Samurai', chapter: 'Ch. 106', type: 'Background', deadline: 'Mar 24', payment: '¥38,000', status: 'Available', cover: '/manga/cover-scifi.png', urgency: 'medium' },
  { id: 3, series: 'Lunar Whispers', chapter: 'Ch. 19', type: 'Tone', deadline: 'Mar 25', payment: '¥28,000', status: 'In Progress', cover: '/manga/cover-fantasy.png', urgency: 'low' },
  { id: 4, series: 'Iron Dragon Heart', chapter: 'Ch. 68', type: 'Lettering', deadline: 'Mar 21', payment: '¥22,000', status: 'In Progress', cover: '/manga/cover-horror.png', urgency: 'high' },
  { id: 5, series: 'Cherry Blossom Code', chapter: 'Ch. 30', type: 'Inking', deadline: 'Mar 27', payment: '¥52,000', status: 'Available', cover: '/manga/cover-action.png', urgency: 'medium' },
  { id: 6, series: 'Ocean Phantom', chapter: 'Ch. 89', type: 'Background', deadline: 'Mar 18', payment: '¥35,000', status: 'Completed', cover: '/manga/cover-scifi.png', urgency: 'none' },
  { id: 7, series: 'Tokyo Spirits', chapter: 'Ch. 32', type: 'Effects', deadline: 'Mar 20', payment: '¥40,000', status: 'Completed', cover: '/manga/cover-fantasy.png', urgency: 'none' },
  { id: 8, series: 'Forge of Legends', chapter: 'Ch. 55', type: 'Tone', deadline: 'Mar 28', payment: '¥30,000', status: 'Available', cover: '/manga/cover-horror.png', urgency: 'low' },
]

/* ── Earnings breakdown ─────────────────────────────── */
const earningsMonths = [
  { month: 'Oct', amount: 120000 },
  { month: 'Nov', amount: 185000 },
  { month: 'Dec', amount: 150000 },
  { month: 'Jan', amount: 220000 },
  { month: 'Feb', amount: 195000 },
  { month: 'Mar', amount: 280000 },
]
const maxEarnings = Math.max(...earningsMonths.map(e => e.amount))

/* ── Type colors ────────────────────────────────────── */
const typeColors: Record<string, string> = {
  Inking: 'text-blue-600 bg-blue-50',
  Background: 'text-emerald-600 bg-emerald-50',
  Tone: 'text-purple-600 bg-purple-50',
  Lettering: 'text-amber-600 bg-amber-50',
  Effects: 'text-rose-600 bg-rose-50',
}

export function AssistantPortalPage() {
  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'available') return t.status === 'Available'
    if (activeFilter === 'progress') return t.status === 'In Progress'
    if (activeFilter === 'completed') return t.status === 'Completed'
    return true
  }).filter((t) =>
    searchQuery === '' || t.series.toLowerCase().includes(searchQuery.toLowerCase()) || t.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex flex-col gap-4 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold">Assistant Portal</h1>
          <p className="text-xs text-neutral-500">Find tasks, track progress, and manage your earnings</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Briefcase className="size-3" />
            Available for Work
          </Badge>
          <Button size="sm" className="gap-1.5">
            <TrendingUp className="size-3.5" />
            My Skills
          </Button>
        </div>
      </header>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {/* ── Stats Row ──────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.label} className="gap-2 p-4 shadow-sm">
                <CardHeader className="flex-row items-center justify-between gap-2 p-0">
                  <span className="text-xs leading-4 text-neutral-500">{item.label}</span>
                  <div className={`flex size-8 items-center justify-center rounded-lg ${item.bgIcon}`}>
                    <Icon className="size-4" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-semibold leading-8">{item.value}</span>
                    {item.delta && (
                      <span className={`flex items-center text-xs leading-4 ${item.deltaColor}`}>
                        <ArrowUp className="size-3" />
                        {item.delta}
                      </span>
                    )}
                  </div>
                  {item.note && <span className="text-xs leading-4 text-neutral-500">{item.note}</span>}
                  {item.sparkline && (
                    <div className="mt-2 flex h-8 items-end gap-0.5">
                      {[3, 5, 2, 6, 4, 7, 8].map((h, i) => (
                        <div key={i} className="rounded-xs bg-purple-500/60" style={{ height: `${h * 4}px`, width: '4px' }} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </section>

        {/* ── Filter + Search ────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs
            tabs={[
              { key: 'all', label: 'All', count: tasks.length },
              { key: 'available', label: 'Available', count: tasks.filter(t => t.status === 'Available').length },
              { key: 'progress', label: 'In Progress', count: tasks.filter(t => t.status === 'In Progress').length },
              { key: 'completed', label: 'Completed', count: tasks.filter(t => t.status === 'Completed').length },
            ]}
            active={activeFilter}
            onChange={setActiveFilter}
          />

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search tasks..."
                className="h-8 w-56 pl-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1">
              <Filter className="size-3" /> Filter
            </Button>
          </div>
        </div>

        {/* ── Task Grid ──────────────────────────────── */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Cover image */}
              <div className="relative h-28 overflow-hidden">
                <img src={task.cover} alt={task.series} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-xs font-semibold text-white truncate">{task.series}</p>
                  <p className="text-[10px] text-white/70">{task.chapter}</p>
                </div>
                {task.urgency === 'high' && (
                  <Badge variant="destructive" className="absolute top-2 right-2 text-[9px] px-1.5 py-0 h-4">
                    Urgent
                  </Badge>
                )}
              </div>

              <CardContent className="p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 ${typeColors[task.type] || ''}`}>
                    {task.type}
                  </Badge>
                  <Badge
                    variant="default"
                    className={`text-[10px] px-2 py-0.5 ${
                      task.status === 'Completed' ? 'text-emerald-600' : task.status === 'In Progress' ? 'text-blue-600' : 'text-neutral-600'
                    }`}
                  >
                    {task.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" /> {task.deadline}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-neutral-900">
                    <Banknote className="size-3" /> {task.payment}
                  </span>
                </div>

                {task.status === 'Available' ? (
                  <Button size="sm" className="w-full h-7 text-xs rounded-lg">Accept Task</Button>
                ) : task.status === 'In Progress' ? (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-neutral-500">Progress</span>
                      <span className="font-medium">65%</span>
                    </div>
                    <Progress value={65} className="h-1" />
                  </div>
                ) : (
                  <Button variant="ghost" size="sm" className="w-full h-7 text-xs rounded-lg text-neutral-500">View Details</Button>
                )}
              </CardContent>
            </Card>
          ))}
        </section>

        {/* ── Earnings Section ───────────────────────── */}
        <Card className="p-6 shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-2 p-0 mb-4">
            <div>
              <CardTitle className="text-base">Earnings Overview</CardTitle>
              <span className="text-xs text-neutral-500">Your earnings over the last 6 months</span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5">
              <DollarSign className="size-3.5" />
              Withdraw
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Bar chart */}
              <div className="flex items-end gap-3 h-40">
                {earningsMonths.map((month) => (
                  <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] font-medium text-neutral-700">
                      ¥{(month.amount / 1000).toFixed(0)}K
                    </span>
                    <div
                      className="w-full rounded-t-md bg-neutral-900 transition-all hover:bg-neutral-700"
                      style={{ height: `${(month.amount / maxEarnings) * 100}%` }}
                    />
                    <span className="text-[10px] text-neutral-500">{month.month}</span>
                  </div>
                ))}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">This Month</p>
                  <p className="text-lg font-semibold mt-1">¥280,000</p>
                  <p className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                    <ArrowUp className="size-2.5" /> +43.6%
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Pending</p>
                  <p className="text-lg font-semibold mt-1">¥67,000</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">2 payments</p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Avg. per Task</p>
                  <p className="text-lg font-semibold mt-1">¥35,200</p>
                  <p className="text-[10px] text-emerald-600 flex items-center gap-0.5 mt-0.5">
                    <ArrowUp className="size-2.5" /> +8.1%
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Rating</p>
                  <p className="text-lg font-semibold mt-1">4.9 ★</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">142 reviews</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
