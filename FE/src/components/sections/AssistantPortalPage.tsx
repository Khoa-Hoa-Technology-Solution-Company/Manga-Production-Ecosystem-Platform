import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Banknote,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ListTodo,
  Search,
  Upload,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Tabs } from '../ui'
import { useAuth } from '../../lib/auth'
import { tasksAPI } from '../../lib/api'
import { formatCurrency } from '../../i18n'

/* ── Type colors ────────────────────────────────────── */
const typeColors: Record<string, string> = {
  inking: 'text-blue-600 bg-blue-50',
  background: 'text-emerald-600 bg-emerald-50',
  tone: 'text-purple-600 bg-purple-50',
  lettering: 'text-amber-600 bg-amber-50',
  effects: 'text-rose-600 bg-rose-50',
}

/* ── Status colors ──────────────────────────────────── */
const statusColors: Record<string, string> = {
  open: 'text-neutral-600',
  assigned: 'text-blue-600',
  in_progress: 'text-blue-600',
  review: 'text-amber-600',
  done: 'text-emerald-600',
}

export function AssistantPortalPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [activeFilter, setActiveFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)

  // ── Stats computed from tasks ─────────────────────
  const stats = [
    {
      label: t('assistant.available', 'Available Tasks'),
      value: tasks.filter(t => t.status === 'open').length.toString(),
      icon: ListTodo,
      bgIcon: 'bg-blue-50',
    },
    {
      label: t('assistant.inProgress', 'In Progress'),
      value: tasks.filter(t => ['assigned', 'in_progress'].includes(t.status)).length.toString(),
      icon: Clock,
      bgIcon: 'bg-amber-50',
    },
    {
      label: t('assistant.completed', 'Completed'),
      value: tasks.filter(t => t.status === 'done').length.toString(),
      icon: CheckCircle2,
      bgIcon: 'bg-emerald-50',
    },
    {
      label: t('assistant.earnings', 'Total Earnings'),
      value: formatCurrency(tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.wage || 0), 0)),
      icon: DollarSign,
      bgIcon: 'bg-purple-50',
      sparkline: true,
    },
  ]

  // ── Load tasks ────────────────────────────────────
  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const res = await tasksAPI.getAll()
      setTasks(res.data.tasks || [])
    } catch {
    } finally {
      setLoading(false)
    }
  }

  // ── Accept task ───────────────────────────────────
  const handleAccept = async (taskId: string) => {
    setAccepting(taskId)
    try {
      await tasksAPI.accept(taskId)
      await loadTasks()
    } catch {
    } finally {
      setAccepting(null)
    }
  }

  // ── Submit task ───────────────────────────────────
  const handleSubmit = async (taskId: string, file?: File) => {
    setSubmitting(taskId)
    try {
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        await tasksAPI.submit(taskId, formData)
      } else {
        await tasksAPI.updateStatus(taskId, 'review')
      }
      await loadTasks()
    } catch {
    } finally {
      setSubmitting(null)
    }
  }

  // ── Start task ────────────────────────────────────
  const handleStart = async (taskId: string) => {
    try {
      await tasksAPI.updateStatus(taskId, 'in_progress')
      await loadTasks()
    } catch {}
  }

  // ── Filter + search ───────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'available') return t.status === 'open'
    if (activeFilter === 'progress') return ['assigned', 'in_progress'].includes(t.status)
    if (activeFilter === 'completed') return t.status === 'done'
    if (activeFilter === 'review') return t.status === 'review'
    return true
  }).filter((t) =>
    searchQuery === '' ||
    t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.seriesId?.title || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex flex-col gap-4 border-b border-neutral-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <h1 className="text-lg font-semibold">{t('assistant.title', 'Assistant Portal')}</h1>
          <p className="text-xs text-neutral-500">{t('assistant.subtitle', 'Find tasks, track progress, and manage your earnings')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Briefcase className="size-3" />
            {t('assistant.availableForWork', 'Available for Work')}
          </Badge>
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
                  </div>
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
              { key: 'all', label: t('common.all', 'All'), count: tasks.length },
              { key: 'available', label: t('assistant.available', 'Available'), count: tasks.filter(t => t.status === 'open').length },
              { key: 'progress', label: t('assistant.inProgress', 'In Progress'), count: tasks.filter(t => ['assigned', 'in_progress'].includes(t.status)).length },
              { key: 'review', label: t('assistant.review', 'Review'), count: tasks.filter(t => t.status === 'review').length },
              { key: 'completed', label: t('assistant.completed', 'Completed'), count: tasks.filter(t => t.status === 'done').length },
            ]}
            active={activeFilter}
            onChange={setActiveFilter}
          />

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder={t('common.search', 'Search tasks...')}
                className="h-8 w-56 pl-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Task Grid ──────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <div className="grid size-16 place-items-center rounded-2xl bg-neutral-100">
              <ListTodo className="size-6 text-neutral-400" />
            </div>
            <h3 className="text-sm font-semibold">{t('assistant.noTasks', 'No tasks found')}</h3>
            <p className="text-xs text-neutral-500">{t('assistant.noTasksHint', 'Try adjusting your filters or check back later.')}</p>
          </div>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {filteredTasks.map((task) => (
              <Card key={task._id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Cover image */}
                <div className="relative h-28 overflow-hidden bg-gradient-to-br from-neutral-200 to-neutral-100">
                  {task.seriesId?.coverImage && (
                    <img src={task.seriesId.coverImage} alt={task.seriesId.title} className="h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold text-white truncate">{task.seriesId?.title || 'Unknown'}</p>
                    <p className="text-[10px] text-white/70">
                      {task.chapterId ? `Ch. ${task.chapterId.chapterNumber}` : ''}
                    </p>
                  </div>
                  {task.deadline && new Date(task.deadline) <= new Date(Date.now() + 86400000) && task.status !== 'done' && (
                    <Badge variant="destructive" className="absolute top-2 right-2 text-[9px] px-1.5 py-0 h-4">
                      {t('assistant.urgent', 'Urgent')}
                    </Badge>
                  )}
                </div>

                <CardContent className="p-3 space-y-2.5">
                  <p className="text-xs font-medium truncate">{task.title}</p>

                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 capitalize ${typeColors[task.type] || ''}`}>
                      {task.type}
                    </Badge>
                    <Badge variant="default" className={`text-[10px] px-2 py-0.5 capitalize ${statusColors[task.status] || ''}`}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    {task.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3" /> {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                    <span className="flex items-center gap-1 font-semibold text-neutral-900">
                      <Banknote className="size-3" /> {formatCurrency(task.wage || 0)}
                    </span>
                  </div>

                  {/* Action buttons based on status */}
                  {task.status === 'open' && (
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs rounded-lg"
                      onClick={() => handleAccept(task._id)}
                      disabled={accepting === task._id}
                    >
                      {accepting === task._id ? t('common.loading', 'Loading...') : t('assistant.acceptTask', 'Accept Task')}
                    </Button>
                  )}

                  {task.status === 'assigned' && task.assignedTo?._id === user?._id && (
                    <Button
                      size="sm"
                      className="w-full h-7 text-xs rounded-lg"
                      onClick={() => handleStart(task._id)}
                    >
                      {t('assistant.startWork', 'Start Working')}
                    </Button>
                  )}

                  {task.status === 'in_progress' && task.assignedTo?._id === user?._id && (
                    <div className="space-y-1.5">
                      <label className="flex items-center justify-center gap-1.5 w-full h-7 text-xs rounded-lg bg-neutral-900 text-white cursor-pointer hover:bg-neutral-800 transition-colors">
                        <Upload className="size-3" />
                        {submitting === task._id ? t('common.loading', 'Loading...') : t('assistant.submitWork', 'Submit Work')}
                        <input
                          type="file"
                          accept="image/*,.psd,.ai"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleSubmit(task._id, e.target.files[0])
                          }}
                          disabled={submitting === task._id}
                        />
                      </label>
                    </div>
                  )}

                  {task.status === 'review' && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5">
                      <Clock className="size-3 text-amber-600" />
                      <span className="text-[10px] text-amber-600 font-medium">{t('assistant.awaitingReview', 'Awaiting Review')}</span>
                    </div>
                  )}

                  {task.status === 'done' && (
                    <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5">
                      <CheckCircle2 className="size-3 text-emerald-600" />
                      <span className="text-[10px] text-emerald-600 font-medium">{t('assistant.completed', 'Completed')}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* ── Earnings Section ───────────────────────── */}
        <Card className="p-6 shadow-sm">
          <CardHeader className="flex-row items-center justify-between gap-2 p-0 mb-4">
            <div>
              <CardTitle className="text-base">{t('assistant.earningsOverview', 'Earnings Overview')}</CardTitle>
              <span className="text-xs text-neutral-500">{t('assistant.earningsHint', 'Your earnings from completed tasks')}</span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{t('assistant.totalEarned', 'Total Earned')}</p>
                <p className="text-lg font-semibold mt-1">
                  {formatCurrency(tasks.filter(t => t.status === 'done').reduce((sum, t) => sum + (t.wage || 0), 0))}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{t('assistant.pending', 'Pending')}</p>
                <p className="text-lg font-semibold mt-1">
                  {formatCurrency(tasks.filter(t => ['in_progress', 'review', 'assigned'].includes(t.status)).reduce((sum, t) => sum + (t.wage || 0), 0))}
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 p-3">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">{t('assistant.avgPerTask', 'Avg. per Task')}</p>
                <p className="text-lg font-semibold mt-1">
                  {(() => {
                    const done = tasks.filter(t => t.status === 'done')
                    return done.length > 0 ? formatCurrency(done.reduce((sum, t) => sum + (t.wage || 0), 0) / done.length) : formatCurrency(0)
                  })()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
