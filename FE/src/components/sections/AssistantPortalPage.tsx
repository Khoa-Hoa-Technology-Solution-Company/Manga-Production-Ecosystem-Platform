/* eslint-disable */
import { useEffect, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ListTodo,
  Search,
  Upload,
  AlertCircle,
  Download,
  Eye,
  X,
  ChevronLeft,
  BookOpen,
  FileText,
  Star,
  Sparkles,
} from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, Input, Tabs } from '../ui'
import { useAuth } from '../../lib/auth'
import { tasksAPI, pagesAPI, zonesAPI } from '../../lib/api'

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

  const mainTab = 'tasks'
  const [activeFilter, setActiveFilter] = useState('all')
  const [assistantTypeFilter, setAssistantTypeFilter] = useState<'all' | 'dedicated' | 'freelance'>('all')
  const [assignmentLevelFilter, setAssignmentLevelFilter] = useState<'all' | 'chapter' | 'page'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [chapterPages, setChapterPages] = useState<Record<string, any[]>>({})

  // ── Viewer Modal States ────────────────────────────
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerPage, setViewerPage] = useState<any>(null)
  const [viewerTask, setViewerTask] = useState<any>(null)
  const [viewerZones, setViewerZones] = useState<any[]>([])
  const [viewerLoading, setViewerLoading] = useState(false)
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)

  const openViewer = async (page: any, task: any) => {
    setViewerPage(page)
    setViewerTask(task)
    setViewerOpen(true)
    setViewerLoading(true)
    setSelectedZoneId(null)
    try {
      const res = await zonesAPI.getByPage(page._id)
      setViewerZones(res.data.zones || [])
    } catch (err) {
      console.error('Failed to load zones for page', err)
      setViewerZones([])
    } finally {
      setViewerLoading(false)
    }
  }

  // Automatically fetch pages for any chapter tasks that are in progress
  useEffect(() => {
    const chapterTasks = tasks.filter(t => t.assignmentLevel === 'chapter' && t.status === 'in_progress')
    chapterTasks.forEach(async (t) => {
      const cid = t.chapterId?._id || t.chapterId
      if (cid && !chapterPages[cid]) {
        try {
          const res = await pagesAPI.getByChapter(cid)
          setChapterPages(prev => ({ ...prev, [cid]: res.data.pages || [] }))
        } catch (err) {
          console.error('Failed to fetch chapter pages:', err)
        }
      }
    })
  }, [tasks])

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

  // ── Decline task ───────────────────────────────────
  const handleDecline = async (taskId: string) => {
    if (!window.confirm(t('assistant.confirmDecline', 'Are you sure you want to decline this assigned task?'))) return
    try {
      await tasksAPI.decline(taskId)
      await loadTasks()
    } catch { }
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

  const handleChapterPageSubmit = async (taskId: string, pageId: string, file: File) => {
    setSubmitting(taskId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('pageId', pageId)
      await tasksAPI.submit(taskId, formData)

      const task = tasks.find(t => t._id === taskId)
      const cid = task?.chapterId?._id || task?.chapterId
      if (cid) {
        const res = await pagesAPI.getByChapter(cid)
        setChapterPages(prev => ({ ...prev, [cid]: res.data.pages || [] }))
      }
      await loadTasks()
    } catch (err) {
      console.error('Failed to submit page', err)
    } finally {
      setSubmitting(null)
    }
  }

  // ── Start task ────────────────────────────────────
  const handleStart = async (taskId: string) => {
    try {
      await tasksAPI.updateStatus(taskId, 'in_progress')
      await loadTasks()
    } catch { }
  }

  // ── Download draft helper ─────────────────────────
  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Failed to download image:', err)
      window.open(url, '_blank')
    }
  }

  // ── Filter + search ───────────────────────────────
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'available') return t.status === 'open'
    if (activeFilter === 'progress') return ['assigned', 'in_progress'].includes(t.status)
    if (activeFilter === 'completed') return t.status === 'done'
    if (activeFilter === 'review') return t.status === 'review'
    return true
  }).filter((t) => {
    if (assistantTypeFilter === 'dedicated') return t.assistantType === 'dedicated'
    if (assistantTypeFilter === 'freelance') return t.assistantType === 'freelance' || !t.assistantType
    return true
  }).filter((t) => {
    if (assignmentLevelFilter === 'chapter') return t.assignmentLevel === 'chapter'
    if (assignmentLevelFilter === 'page') return t.assignmentLevel === 'page'
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

      <div className="border-b border-neutral-200 px-4 sm:px-6 lg:px-8">
        <div className="flex gap-6 -mb-px">
          <button
            className="py-3 text-sm font-semibold border-b-2 border-neutral-900 text-neutral-900"
          >
            My Tasks
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
        {mainTab === 'tasks' && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
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

              <div className="flex flex-wrap items-center gap-4">
                {/* Assistant Type Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">Type:</span>
                  {(['all', 'dedicated', 'freelance'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setAssistantTypeFilter(type)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all border ${assistantTypeFilter === type
                          ? type === 'dedicated' ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : type === 'freelance' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-neutral-100 text-neutral-800 border-neutral-300'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                        }`}
                    >
                      {type === 'all' ? t('common.all', 'All') : type === 'dedicated' ? t('assistant.dedicated', 'Dedicated') : t('assistant.freelance', 'Freelance')}
                    </button>
                  ))}
                </div>

                {/* Assignment Level Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mr-1">Level:</span>
                  {(['all', 'chapter', 'page'] as const).map(lvl => (
                    <button
                      key={lvl}
                      onClick={() => setAssignmentLevelFilter(lvl)}
                      className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all border ${assignmentLevelFilter === lvl
                          ? 'bg-neutral-900 text-white border-neutral-900'
                          : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                        }`}
                    >
                      {lvl === 'all' ? t('common.all', 'All') : lvl === 'chapter' ? (
                        <span className="flex items-center gap-1"><BookOpen className="size-3" /> {t('common.chapter', 'Chapter')}</span>
                      ) : (
                        <span className="flex items-center gap-1"><FileText className="size-3" /> {t('common.page', 'Page')}</span>
                      )}
                    </button>
                  ))}
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
                      <div>
                        <p className="text-xs font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 bg-neutral-100 text-neutral-600 border-none font-semibold flex items-center gap-1 shrink-0">
                            {task.assignmentLevel === 'chapter' ? (
                              <>
                                <BookOpen className="size-2.5" />
                                <span>Chapter</span>
                              </>
                            ) : (
                              <>
                                <FileText className="size-2.5" />
                                <span>Page</span>
                              </>
                            )}
                          </Badge>
                          {task.assignmentLevel === 'page' && task.pageId && (
                            <span className="text-[10px] text-neutral-500 font-medium">Page {task.pageId.pageNumber || task.pageId}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 capitalize ${typeColors[task.type] || ''}`}>
                            {task.type}
                          </Badge>
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0.5 flex items-center gap-1 ${task.assistantType === 'dedicated'
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            }`}>
                            {task.assistantType === 'dedicated' ? (
                              <>
                                <Star className="size-2.5 fill-blue-650 text-blue-600" />
                                <span>Dedicated</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="size-2.5 text-emerald-600" />
                                <span>Freelance</span>
                              </>
                            )}
                          </Badge>
                        </div>
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
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7 text-xs rounded-lg text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDecline(task._id)}
                          >
                            {t('assistant.declineTask', 'Decline')}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 h-7 text-xs rounded-lg bg-neutral-900 text-white hover:bg-neutral-800"
                            onClick={() => handleStart(task._id)}
                          >
                            {t('assistant.startWork', 'Start Work')}
                          </Button>
                        </div>
                      )}

                      {task.status === 'in_progress' && task.assignedTo?._id === user?._id && (
                        <div className="space-y-2.5">
                          {task.reviewNotes && (
                            <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-2.5 text-[10px] text-rose-700 space-y-1">
                              <div className="font-semibold flex items-center gap-1">
                                <AlertCircle className="size-3 text-rose-500 shrink-0" />
                                <span>{t('assistant.revisionNotesFromMangaka', 'Revision Notes from Mangaka:')}</span>
                              </div>
                              <p className="text-neutral-600 leading-normal font-normal bg-white/75 p-1.5 rounded-md border border-rose-50/30 whitespace-pre-wrap text-[9px]">
                                {task.reviewNotes}
                              </p>
                            </div>
                          )}

                          {task.assignmentLevel === 'chapter' ? (
                            <div className="space-y-2 border-t border-neutral-100 pt-2">
                              <p className="text-[10px] font-semibold text-neutral-500 mb-1">Upload files for pages:</p>
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {(chapterPages[task.chapterId?._id || task.chapterId] || []).map((page: any) => (
                                  <div key={page._id} className="flex items-center justify-between gap-2 p-1.5 rounded-lg border border-neutral-100 bg-neutral-50/50 text-[10px]">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <div className="size-6 rounded overflow-hidden bg-neutral-200 shrink-0">
                                        <img src={page.originalImage.startsWith('http') ? page.originalImage : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${page.originalImage}`} className="h-full w-full object-cover" />
                                      </div>
                                      <span className="truncate">Page {page.pageNumber}</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {page.processedImage && (
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1 rounded font-medium">Uploaded</span>
                                      )}
                                      <button
                                        title={t('assistant.viewManuscript', 'View Manuscript')}
                                        onClick={() => openViewer(page, task)}
                                        className="flex items-center justify-center size-6 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                      >
                                        <Eye className="size-3" />
                                      </button>
                                      <button
                                        title={t('assistant.downloadDraft', 'Download Draft')}
                                        onClick={() => {
                                          const url = page.originalImage.startsWith('http')
                                            ? page.originalImage
                                            : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${page.originalImage}`;
                                          const ext = page.originalImage.split('.').pop() || 'png';
                                          const filename = `${task.seriesId?.title || 'series'}_Ch${task.chapterId?.chapterNumber || ''}_Page${page.pageNumber}.${ext}`;
                                          handleDownload(url, filename);
                                        }}
                                        className="flex items-center justify-center size-6 rounded bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                                      >
                                        <Download className="size-3" />
                                      </button>
                                      <label className="flex items-center justify-center size-6 rounded bg-neutral-900 text-white cursor-pointer hover:bg-neutral-800 transition-colors">
                                        <Upload className="size-3" />
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={(e) => {
                                            if (e.target.files?.[0]) handleChapterPageSubmit(task._id, page._id, e.target.files[0])
                                          }}
                                        />
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <Button
                                size="sm"
                                className="w-full h-7 text-xs rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 mt-2"
                                onClick={() => handleSubmit(task._id)}
                                disabled={submitting === task._id}
                              >
                                {submitting === task._id ? t('common.loading', 'Loading...') : 'Submit Chapter for Review'}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 w-full">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openViewer(task.pageId, task)}
                                className="w-full h-7 text-xs rounded-lg border-neutral-200 text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-1.5"
                              >
                                <Eye className="size-3" />
                                {t('assistant.viewManuscript', 'View Manuscript')}
                              </Button>
                              <div className="flex gap-2 w-full">
                                {task.pageId?.originalImage && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const url = task.pageId.originalImage.startsWith('http')
                                        ? task.pageId.originalImage
                                        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}${task.pageId.originalImage}`;
                                      const ext = task.pageId.originalImage.split('.').pop() || 'png';
                                      const filename = `${task.seriesId?.title || 'series'}_Ch${task.chapterId?.chapterNumber || ''}_Page${task.pageId.pageNumber || 'X'}.${ext}`;
                                      handleDownload(url, filename);
                                    }}
                                    className="flex-1 h-7 text-xs rounded-lg border-neutral-200 text-neutral-700 hover:bg-neutral-50 flex items-center justify-center gap-1.5"
                                  >
                                    <Download className="size-3" />
                                    {t('assistant.downloadDraft', 'Download')}
                                  </Button>
                                )}
                                <label className="flex-1 flex items-center justify-center gap-1.5 h-7 text-xs rounded-lg bg-neutral-900 text-white cursor-pointer hover:bg-neutral-800 transition-colors">
                                  <Upload className="size-3" />
                                  {submitting === task._id ? t('common.loading', 'Loading...') : t('assistant.submitWork', 'Submit')}
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
                            </div>
                          )}
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
          </>
        )}
      </div>
      {/* ── Manuscript Viewer Modal ────────────────── */}
      <ManuscriptViewerModal
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        page={viewerPage}
        task={viewerTask}
        zones={viewerZones}
        loading={viewerLoading}
        selectedZoneId={selectedZoneId}
        setSelectedZoneId={setSelectedZoneId}
      />
    </div>
  )
}

/* ── Viewer Modal Component ────────────────────────── */
type ViewerModalProps = {
  isOpen: boolean
  onClose: () => void
  page: any
  task: any
  zones: any[]
  loading: boolean
  selectedZoneId: string | null
  setSelectedZoneId: (id: string | null) => void
}

function ManuscriptViewerModal({
  isOpen,
  onClose,
  page,
  task,
  zones,
  loading,
  selectedZoneId,
  setSelectedZoneId,
}: ViewerModalProps) {
  const { t } = useTranslation()
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 1, height: 1 })

  const handleImgLoad = () => {
    if (imgRef.current) {
      setImgSize({
        width: imgRef.current.clientWidth,
        height: imgRef.current.clientHeight,
      })
      setNaturalSize({
        width: imgRef.current.naturalWidth || 1,
        height: imgRef.current.naturalHeight || 1,
      })
    }
  }

  useEffect(() => {
    if (!isOpen) return
    const handleResize = () => {
      if (imgRef.current) {
        setImgSize({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight,
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen, page])

  if (!isOpen || !page) return null

  const scaleX = imgSize.width / (naturalSize.width || 1)
  const scaleY = imgSize.height / (naturalSize.height || 1)

  const selectedZone = zones.find(z => z._id === selectedZoneId)
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  const imgUrl = page.originalImage.startsWith('http')
    ? page.originalImage
    : `${apiBase}${page.originalImage}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 px-6 py-4 bg-neutral-50 dark:bg-neutral-900/50">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
              {task?.seriesId?.title || 'Series'}
            </h2>
            <p className="text-xs text-neutral-500">
              {task?.chapterId ? `Ch. ${task.chapterId.chapterNumber || task.chapterId} - ` : ''}Page {page.pageNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors text-neutral-500 dark:text-neutral-400"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden bg-neutral-50 dark:bg-neutral-900">

          {/* Left Panel - Image Viewer */}
          <div className="flex-1 bg-neutral-100 dark:bg-neutral-950 p-6 flex items-center justify-center overflow-auto relative">
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-950" />
              </div>
            ) : (
              <div className="relative inline-block shadow-md border border-neutral-200 dark:border-neutral-800 rounded overflow-hidden bg-white dark:bg-neutral-900">
                <img
                  ref={imgRef}
                  src={imgUrl}
                  alt={`Page ${page.pageNumber}`}
                  onLoad={handleImgLoad}
                  className="max-h-[60vh] w-auto object-contain select-none"
                  draggable={false}
                />

                {/* Zone Overlays */}
                {zones.map((zone) => {
                  const left = zone.boundingBox.x * scaleX
                  const top = zone.boundingBox.y * scaleY
                  const width = zone.boundingBox.width * scaleX
                  const height = zone.boundingBox.height * scaleY
                  const isSelected = selectedZoneId === zone._id

                  return (
                    <div
                      key={zone._id}
                      onClick={() => setSelectedZoneId(zone._id)}
                      className={`absolute border-2 transition-all cursor-pointer flex flex-col justify-between p-1 select-none ${isSelected
                          ? 'ring-2 ring-white z-10 shadow-lg'
                          : 'hover:border-neutral-950/60 hover:bg-neutral-950/5'
                        }`}
                      style={{
                        left,
                        top,
                        width,
                        height,
                        borderColor: zone.color,
                        backgroundColor: isSelected ? `${zone.color}35` : `${zone.color}15`,
                      }}
                      title={`${zone.name} (${zone.type})`}
                    >
                      <span
                        className="text-[9px] font-semibold text-white px-1 py-0.5 rounded self-start truncate max-w-full"
                        style={{ backgroundColor: zone.color }}
                      >
                        {zone.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Panel - Zones & Task details */}
          <div className="w-80 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col overflow-hidden">

            {/* Zones list header */}
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                {t('studio.pageZones', 'Page Zones')}
              </h3>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {selectedZone ? (
                <div className="space-y-4">
                  {/* Back button/zone header */}
                  <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                    <button
                      onClick={() => setSelectedZoneId(null)}
                      className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <ChevronLeft className="size-4 text-neutral-600 dark:text-neutral-400" />
                    </button>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-700 dark:text-neutral-350 flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: selectedZone.color }} />
                        {selectedZone.name}
                      </h4>
                      <p className="text-[10px] text-neutral-400">Zone Details</p>
                    </div>
                  </div>

                  {/* Zone Meta Info */}
                  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-50/50 dark:bg-neutral-900/50 space-y-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Zone Type:</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 capitalize">
                        {selectedZone.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-neutral-500">Status:</span>
                      <Badge
                        variant="default"
                        className={`text-[9px] px-1.5 py-0 h-4 capitalize font-semibold ${selectedZone.status === 'done'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : selectedZone.status === 'review'
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : selectedZone.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                : 'bg-neutral-50 text-neutral-700 hover:bg-neutral-100'
                          }`}
                      >
                        {selectedZone.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-neutral-500">
                        <span>Progress:</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {selectedZone.progress}%
                        </span>
                      </div>
                      <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-neutral-900 dark:bg-white h-full transition-all duration-300"
                          style={{ width: `${selectedZone.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Task detail card */}
                  {task && (
                    <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <h5 className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                        Task Instructions
                      </h5>
                      <Card className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs space-y-2.5 rounded-xl">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-250 truncate">{task.title}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">{task.description || 'No description provided.'}</p>
                          </div>
                        </div>

                        {task.reviewNotes && task.status === 'in_progress' && (
                          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-2.5 text-[10px] text-rose-700 space-y-1">
                            <div className="font-semibold flex items-center gap-1">
                              <AlertCircle className="size-3 text-rose-500 shrink-0" />
                              <span>Revision Required:</span>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-400 leading-normal font-normal bg-white/75 dark:bg-neutral-950 p-1.5 rounded-md border border-rose-50/30 whitespace-pre-wrap text-[9px]">
                              {task.reviewNotes}
                            </p>
                          </div>
                        )}
                      </Card>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.length === 0 ? (
                    <div className="rounded-xl bg-neutral-50 dark:bg-neutral-950 p-4 text-center">
                      <p className="text-xs text-neutral-500">No zones yet.</p>
                    </div>
                  ) : (
                    zones.map((zone) => (
                      <div
                        key={zone._id}
                        onClick={() => setSelectedZoneId(zone._id)}
                        className="rounded-xl border border-neutral-200 hover:border-neutral-400 dark:border-neutral-800 dark:hover:border-neutral-650 p-2.5 cursor-pointer transition-all space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-sm" style={{ backgroundColor: zone.color }} />
                            <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{zone.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 capitalize">
                            {zone.type}
                          </Badge>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-neutral-900 dark:bg-white h-full transition-all duration-300"
                            style={{ width: `${zone.progress}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}
