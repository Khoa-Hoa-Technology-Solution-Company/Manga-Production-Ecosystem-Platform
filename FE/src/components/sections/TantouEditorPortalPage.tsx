import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileEdit, Clock, CheckCircle2, XCircle, Eye, Send,
  ChevronRight, AlertTriangle, BookOpen, Users, BarChart3,
  MessageSquare, Loader2, Layers, PenTool
} from 'lucide-react'
import { Badge, Button, Card, CardContent, Progress, Tabs, Textarea } from '../ui'
import { seriesAPI, approvalAPI, chaptersAPI, tasksAPI, pagesAPI } from '../../lib/api'
import { DraftReviewCanvas, type AnnotationData } from './DraftReviewCanvas'

/* ────────────────────────────────────── types ── */
type SeriesItem = {
  _id: string
  title: string
  description: string
  genre: string[]
  coverImage?: string
  status: string
  mangakaId: { _id: string; displayName: string; avatar?: string }
  editorId?: { _id: string; displayName: string }
  totalChapters: number
  createdAt: string
  updatedAt: string
}

type ChapterItem = {
  _id: string
  chapterNumber: number
  title: string
  status: string
  totalPages: number
  progress: number
  updatedAt: string
}

type TaskSummary = {
  total: number
  done: number
  inProgress: number
  review: number
}

/* ──────────────────────────────────── component ── */
export function TantouEditorPortalPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('pending')
  const [pendingSeries, setPendingSeries] = useState<SeriesItem[]>([])
  const [reviewedSeries, setReviewedSeries] = useState<SeriesItem[]>([])
  const [activeSeries, setActiveSeries] = useState<SeriesItem[]>([])
  const [loading, setLoading] = useState(true)

  // Review modal state
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null)
  const [reviewComments, setReviewComments] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Draft viewer state (Phase 2)
  const [reviewChapters, setReviewChapters] = useState<ChapterItem[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null)
  const [chapterPages, setChapterPages] = useState<Array<{ _id: string; pageNumber: number; originalImage: string; width: number; height: number }>>([])
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [showCanvas, setShowCanvas] = useState(false)
  const [loadingChapters, setLoadingChapters] = useState(false)
  const [loadingPages, setLoadingPages] = useState(false)

  // Studio progress state
  const [progressData, setProgressData] = useState<Record<string, { chapters: ChapterItem[]; tasks: TaskSummary }>>({})

  const tabs = [
    { key: 'pending', label: t('editor.pendingReview'), icon: <Clock className="size-3.5" /> },
    { key: 'reviewed', label: t('editor.reviewed'), icon: <CheckCircle2 className="size-3.5" /> },
    { key: 'progress', label: t('editor.studioProgress'), icon: <BarChart3 className="size-3.5" /> },
  ]

  /* ── data fetching ── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pendingRes, allRes] = await Promise.all([
        seriesAPI.getPendingReview({ role: 'editor' }).catch(() => ({ data: { series: [] } })),
        seriesAPI.getAll({ limit: '100' }).catch(() => ({ data: { series: [] } })),
      ])

      const allSeries: SeriesItem[] = allRes.data.series || []

      // Filter pending = EditorReview status
      const pending = pendingRes.data.series?.length
        ? pendingRes.data.series
        : allSeries.filter((s: SeriesItem) => s.status === 'EditorReview' || s.status === 'Draft')
      setPendingSeries(pending)

      // Filter reviewed = EBReview or Rejected status
      const reviewed = allSeries.filter((s: SeriesItem) => ['EBReview', 'Rejected'].includes(s.status))
      setReviewedSeries(reviewed)

      // Active series for progress tracking
      const active = allSeries.filter((s: SeriesItem) => ['Active', 'EditorReview', 'EBReview'].includes(s.status))
      setActiveSeries(active)
    } catch (err) {
      console.error('Failed to fetch editor data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── fetch studio progress for a series ── */
  const fetchProgress = useCallback(async (seriesId: string) => {
    if (progressData[seriesId]) return
    try {
      const [chaptersRes, tasksRes] = await Promise.all([
        chaptersAPI.getBySeries(seriesId).catch(() => ({ data: { chapters: [] } })),
        tasksAPI.getAll({ seriesId, limit: '200' }).catch(() => ({ data: { tasks: [] } })),
      ])
      const chapters: ChapterItem[] = chaptersRes.data.chapters || []
      const tasks = tasksRes.data.tasks || []
      const taskSummary: TaskSummary = {
        total: tasks.length,
        done: tasks.filter((t: any) => t.status === 'done').length,
        inProgress: tasks.filter((t: any) => t.status === 'in_progress').length,
        review: tasks.filter((t: any) => t.status === 'review').length,
      }
      setProgressData(prev => ({ ...prev, [seriesId]: { chapters, tasks: taskSummary } }))
    } catch (err) {
      console.error('Failed to fetch progress:', err)
    }
  }, [progressData])

  /* ── review actions ── */
  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!selectedSeries) return
    setSubmitting(true)
    try {
      await approvalAPI.editorDecision(selectedSeries._id, {
        decision,
        comments: reviewComments,
        annotations: annotations.length > 0 ? annotations : undefined,
      })
      setSelectedSeries(null)
      setReviewComments('')
      setAnnotations([])
      setReviewChapters([])
      setSelectedChapterId(null)
      setChapterPages([])
      fetchData()
    } catch (err) {
      console.error('Failed to submit decision:', err)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── open series review: fetch chapters ── */
  const handleOpenReview = async (series: SeriesItem) => {
    setSelectedSeries(series)
    setReviewComments('')
    setAnnotations([])
    setSelectedChapterId(null)
    setChapterPages([])
    setLoadingChapters(true)
    try {
      const res = await chaptersAPI.getBySeries(series._id)
      setReviewChapters(res.data.chapters || [])
    } catch {
      setReviewChapters([])
    } finally {
      setLoadingChapters(false)
    }
  }

  /* ── select chapter: fetch pages ── */
  const handleSelectChapter = async (chapterId: string) => {
    setSelectedChapterId(chapterId)
    setLoadingPages(true)
    try {
      const res = await pagesAPI.getByChapter(chapterId)
      setChapterPages(res.data.pages || [])
    } catch {
      setChapterPages([])
    } finally {
      setLoadingPages(false)
    }
  }

  /* ── status helpers ── */
  const getStatusBadge = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      Draft: { label: 'Draft', className: 'bg-neutral-100 text-neutral-600 border-neutral-200' },
      EditorReview: { label: 'Pending Review', className: 'bg-amber-50 text-amber-700 border-amber-200' },
      EBReview: { label: 'Sent to EB', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      Rejected: { label: 'Revision Requested', className: 'bg-red-50 text-red-600 border-red-200' },
      Active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    }
    const conf = map[status] || { label: status, className: 'bg-neutral-100 text-neutral-600 border-neutral-200' }
    return <Badge className={conf.className}>{conf.label}</Badge>
  }

  const getProgressStatus = (progress: number) => {
    if (progress >= 80) return { label: t('editor.onTrack'), color: 'text-emerald-600', bg: 'bg-emerald-500' }
    if (progress >= 40) return { label: t('editor.atRisk'), color: 'text-amber-600', bg: 'bg-amber-500' }
    return { label: t('editor.delayed'), color: 'text-red-600', bg: 'bg-red-500' }
  }

  /* ── render ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-neutral-400" />
          <span className="text-sm text-neutral-500">{t('common.loading')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200">
            <FileEdit className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-950">{t('editor.title')}</h1>
            <p className="text-sm text-neutral-500">{t('editor.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: t('editor.pendingReview'), value: pendingSeries.length, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
          { label: t('editor.reviewed'), value: reviewedSeries.length, icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
          { label: t('editor.studioProgress'), value: activeSeries.length, icon: BarChart3, gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-200' },
        ].map(({ label, value, icon: Icon, gradient, shadow }) => (
          <Card key={label} className="overflow-hidden">
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-lg ${shadow}`}>
                <Icon className="size-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-950">{value}</p>
                <p className="text-xs text-neutral-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

      {/* ── Tab Content ── */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pendingSeries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                  <CheckCircle2 className="size-7 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700">{t('editor.noPending')}</p>
                <p className="mt-1 text-xs text-neutral-400">{t('editor.noPendingHint')}</p>
              </CardContent>
            </Card>
          ) : (
            pendingSeries.map((series) => (
              <Card key={series._id} className="overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Cover */}
                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200 sm:h-auto sm:w-44">
                      {series.coverImage ? (
                        <img src={series.coverImage} alt={series.title} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <BookOpen className="size-10 text-neutral-300" />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-950">{series.title}</h3>
                          {getStatusBadge(series.status)}
                        </div>
                        <p className="mb-3 line-clamp-2 text-sm text-neutral-500">{series.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Users className="size-3.5" />
                            {series.mangakaId?.displayName || 'Unknown'}
                          </span>
                          <span>{series.genre?.join(', ')}</span>
                          <span>{series.totalChapters} ch.</span>
                          <span>{new Date(series.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-xl"
                          onClick={() => handleOpenReview(series)}
                        >
                          <Eye className="size-3.5" />
                          {t('editor.viewDraft')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'reviewed' && (
        <div className="space-y-3">
          {reviewedSeries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                  <FileEdit className="size-7 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700">No reviewed series yet</p>
              </CardContent>
            </Card>
          ) : (
            reviewedSeries.map((series) => (
              <Card key={series._id} className="overflow-hidden">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-100">
                      <BookOpen className="size-5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-950">{series.title}</p>
                      <p className="text-xs text-neutral-400">
                        {series.mangakaId?.displayName} · {new Date(series.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(series.status)}
                    <ChevronRight className="size-4 text-neutral-300" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div className="space-y-4">
          {activeSeries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                  <BarChart3 className="size-7 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700">No active series to track</p>
              </CardContent>
            </Card>
          ) : (
            activeSeries.map((series) => {
              const data = progressData[series._id]
              if (!data) {
                fetchProgress(series._id)
              }
              const taskPercent = data?.tasks.total ? Math.round((data.tasks.done / data.tasks.total) * 100) : 0
              const ps = getProgressStatus(taskPercent)

              return (
                <Card key={series._id} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-100 to-purple-100">
                          <BookOpen className="size-5 text-violet-600" />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-neutral-950">{series.title}</h4>
                          <p className="text-xs text-neutral-400">{series.mangakaId?.displayName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(series.status)}
                        <span className={`text-xs font-medium ${ps.color}`}>{ps.label}</span>
                      </div>
                    </div>

                    {data ? (
                      <>
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-neutral-500">{t('editor.tasksCompleted')}</span>
                            <span className="font-medium text-neutral-700">{data.tasks.done}/{data.tasks.total}</span>
                          </div>
                          <Progress value={taskPercent} />
                        </div>

                        {/* Chapter list */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-neutral-500">{t('editor.chapterProgress')}</p>
                          {data.chapters.slice(0, 5).map((ch) => (
                            <div key={ch._id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-neutral-700">Ch. {ch.chapterNumber}</span>
                                <span className="text-xs text-neutral-400">{ch.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
                                  <div
                                    className={`h-full rounded-full transition-all ${ch.progress >= 80 ? 'bg-emerald-500' : ch.progress >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                                    style={{ width: `${ch.progress}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right text-[10px] font-medium text-neutral-500">{ch.progress}%</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Task stats */}
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {[
                            { label: 'In Progress', value: data.tasks.inProgress, color: 'text-blue-600 bg-blue-50' },
                            { label: 'In Review', value: data.tasks.review, color: 'text-amber-600 bg-amber-50' },
                            { label: 'Completed', value: data.tasks.done, color: 'text-emerald-600 bg-emerald-50' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className={`rounded-xl px-3 py-2 text-center ${color}`}>
                              <p className="text-lg font-bold">{value}</p>
                              <p className="text-[10px]">{label}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="size-5 animate-spin text-neutral-400" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* ── Review Modal (Enhanced with Chapter Selection + Canvas) ── */}
      {selectedSeries && !showCanvas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="border-b border-neutral-100 bg-gradient-to-r from-violet-50 to-purple-50 px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-neutral-950">{selectedSeries.title}</h2>
                  <p className="text-sm text-neutral-500">
                    {selectedSeries.mangakaId?.displayName} · {selectedSeries.genre?.join(', ')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setSelectedSeries(null)
                    setReviewChapters([])
                    setSelectedChapterId(null)
                    setChapterPages([])
                    setAnnotations([])
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
              {/* Description */}
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-400">Description</p>
                <p className="text-sm leading-relaxed text-neutral-700">{selectedSeries.description}</p>
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] font-medium uppercase text-neutral-400">Chapters</p>
                  <p className="text-lg font-bold text-neutral-900">{selectedSeries.totalChapters}</p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] font-medium uppercase text-neutral-400">Submitted</p>
                  <p className="text-lg font-bold text-neutral-900">
                    {new Date(selectedSeries.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-3">
                  <p className="text-[10px] font-medium uppercase text-neutral-400">Annotations</p>
                  <p className="text-lg font-bold text-violet-600">{annotations.length}</p>
                </div>
              </div>

              {/* Chapter Selection */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                  <Layers className="size-3.5" />
                  Select Chapter to Review
                </p>
                {loadingChapters ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-neutral-400" />
                  </div>
                ) : reviewChapters.length === 0 ? (
                  <div className="rounded-xl bg-neutral-50 py-6 text-center text-sm text-neutral-400">
                    No chapters found for this series
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewChapters.map((ch) => (
                      <div
                        key={ch._id}
                        onClick={() => handleSelectChapter(ch._id)}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border-2 p-3 transition-all ${
                          selectedChapterId === ch._id
                            ? 'border-violet-400 bg-violet-50 shadow-sm'
                            : 'border-neutral-100 bg-white hover:border-neutral-200 hover:bg-neutral-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`grid size-9 place-items-center rounded-lg ${
                            selectedChapterId === ch._id ? 'bg-violet-500 text-white' : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            <span className="text-xs font-bold">{ch.chapterNumber}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900">{ch.title}</p>
                            <p className="text-xs text-neutral-400">{ch.totalPages} pages · {ch.status}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className={`h-full rounded-full transition-all ${ch.progress >= 80 ? 'bg-emerald-500' : ch.progress >= 40 ? 'bg-amber-500' : 'bg-red-400'}`}
                              style={{ width: `${ch.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-medium text-neutral-400">{ch.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Open Annotation Canvas */}
                {selectedChapterId && (
                  <div className="mt-3">
                    {loadingPages ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="size-5 animate-spin text-neutral-400" />
                      </div>
                    ) : chapterPages.length > 0 ? (
                      <Button
                        size="sm"
                        className="w-full gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 py-5 text-white shadow-lg shadow-violet-200 hover:from-violet-700 hover:to-purple-700"
                        onClick={() => setShowCanvas(true)}
                      >
                        <PenTool className="size-4" />
                        Open Annotation Canvas ({chapterPages.length} pages)
                      </Button>
                    ) : (
                      <div className="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-600">
                        No pages uploaded for this chapter yet
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Review Comments */}
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                  <MessageSquare className="size-3.5" />
                  {t('editor.comments')}
                </label>
                <Textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder={t('editor.commentsPlaceholder')}
                  className="min-h-[100px] rounded-xl"
                />
              </div>

              {/* Annotation Summary */}
              {annotations.length > 0 && (
                <div className="rounded-xl bg-violet-50 p-4">
                  <div className="flex items-center gap-2">
                    <PenTool className="size-4 text-violet-600" />
                    <span className="text-xs font-semibold text-violet-800">
                      {annotations.length} annotation{annotations.length > 1 ? 's' : ''} added
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-violet-600">
                    Annotations will be sent with your review decision
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-6 py-4">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl"
                onClick={() => {
                  setSelectedSeries(null)
                  setReviewChapters([])
                  setSelectedChapterId(null)
                  setChapterPages([])
                  setAnnotations([])
                }}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                onClick={() => handleDecision('rejected')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                {t('editor.reject')}
              </Button>
              <Button
                size="sm"
                className="gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700"
                onClick={() => handleDecision('approved')}
                disabled={submitting}
              >
                {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                {t('editor.approve')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen Annotation Canvas ── */}
      {showCanvas && selectedSeries && chapterPages.length > 0 && (
        <DraftReviewCanvas
          pages={chapterPages}
          annotations={annotations}
          onAnnotationsChange={setAnnotations}
          onClose={() => setShowCanvas(false)}
          seriesTitle={selectedSeries.title}
          chapterTitle={reviewChapters.find(ch => ch._id === selectedChapterId)?.title || 'Chapter'}
        />
      )}
    </div>
  )
}
