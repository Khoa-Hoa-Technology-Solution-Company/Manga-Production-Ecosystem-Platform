import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { seriesAPI, chaptersAPI } from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  Progress,
  Avatar,
  AvatarFallback
} from '../ui'
import {
  Check,
  X,
  BookOpen,
  Layers3,
  PenTool,
  ChevronRight,
  User,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

interface SeriesData {
  _id: string
  title: string
  description?: string
  genre?: string[] | string
  coverImage?: string
  mangakaId?: { _id: string; displayName: string; avatar?: string }
  editorId?: { _id: string; displayName: string }
  status: string
  rejectionNotes?: string
  totalChapters: number
}

interface ChapterData {
  _id: string
  chapterNumber: number
  title: string
  status: string
  totalPages: number
  progress: number
  collaborators?: unknown[]
}

export function EditorPortalPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState<'approvals' | 'monitoring'>('approvals')
  
  // Expanded Series Details states
  const [expandedSeriesId, setExpandedSeriesId] = useState('')
  const [expandedChapters, setExpandedChapters] = useState<ChapterData[]>([])
  const [loadingChaptersForSeries, setLoadingChaptersForSeries] = useState(false)

  const handleToggleExpand = async (seriesId: string) => {
    if (expandedSeriesId === seriesId) {
      setExpandedSeriesId('')
      setExpandedChapters([])
      return
    }
    
    setExpandedSeriesId(seriesId)
    Promise.resolve().then(() => {
      setLoadingChaptersForSeries(true)
    })
    try {
      const res = await chaptersAPI.getBySeries(seriesId)
      setExpandedChapters(res.data.chapters || [])
    } catch (err) {
      console.error('Failed to load chapters for inspect', err)
      setExpandedChapters([])
    } finally {
      Promise.resolve().then(() => {
        setLoadingChaptersForSeries(false)
      })
    }
  }
  
  // States for approvals tab
  const [pendingSeries, setPendingSeries] = useState<SeriesData[]>([])
  const [loadingApprovals, setLoadingApprovals] = useState(false)
  const [submittingAction, setSubmittingAction] = useState(false)

  // States for monitoring tab
  const [assignedSeries, setAssignedSeries] = useState<SeriesData[]>([])
  const [loadingMonitoring, setLoadingMonitoring] = useState(false)
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loadingChapters, setLoadingChapters] = useState(false)

  // Rejection Dialog states
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectSeriesId, setRejectSeriesId] = useState('')
  const [rejectionNotesInput, setRejectionNotesInput] = useState('')

  const isEB = user?.role === 'editorial_board'

  const seriesCoverUrl = (coverImage?: string) => {
    if (!coverImage) return ''
    if (coverImage.startsWith('http')) return coverImage
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    return `${base}${coverImage}`
  }

  // Load approvals
  const loadApprovals = async () => {
    setLoadingApprovals(true)
    try {
      // EB reviews Pending_EB; Tantou reviews Pending_Editor
      const targetStatus = isEB ? 'Pending_EB' : 'Pending_Editor'
      const res = await seriesAPI.getAll({ status: targetStatus })
      setPendingSeries(res.data.series || [])
    } catch (err) {
      console.error('Failed to load pending series approvals', err)
    } finally {
      setLoadingApprovals(false)
    }
  }

  // Load monitored series (assigned to this editor)
  const loadMonitoredSeries = async () => {
    setLoadingMonitoring(true)
    try {
      // Query series where this user is the assigned editor
      const res = await seriesAPI.getAll({ editorId: user?._id })
      const list = res.data.series || []
      setAssignedSeries(list)
      if (list.length > 0 && !selectedSeriesId) {
        setSelectedSeriesId(list[0]._id)
      }
    } catch (err) {
      console.error('Failed to load monitored series', err)
    } finally {
      setLoadingMonitoring(false)
    }
  }

  // Load chapters for selected series
  useEffect(() => {
    if (activeTab === 'monitoring' && selectedSeriesId) {
      Promise.resolve().then(() => {
        setLoadingChapters(true)
      })
      chaptersAPI.getBySeries(selectedSeriesId)
        .then((res) => {
          setChapters(res.data.chapters || [])
        })
        .catch(console.error)
        .finally(() => {
          Promise.resolve().then(() => {
            setLoadingChapters(false)
          })
        })
    }
  }, [selectedSeriesId, activeTab])

  // Trigger loads on tab switch
  useEffect(() => {
    if (activeTab === 'approvals') {
      Promise.resolve().then(() => {
        loadApprovals().catch(console.error)
      })
    } else {
      Promise.resolve().then(() => {
        loadMonitoredSeries().catch(console.error)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?._id])

  // Handle approvals
  const handleApprove = async (seriesId: string) => {
    setSubmittingAction(true)
    try {
      // Editor approves to Pending_EB; EB approves to Active (Published)
      const nextStatus = isEB ? 'Active' : 'Pending_EB'
      await seriesAPI.update(seriesId, { status: nextStatus })
      await loadApprovals()
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to approve series')
    } finally {
      setSubmittingAction(false)
    }
  }

  // Handle rejections
  const handleOpenReject = (seriesId: string) => {
    setRejectSeriesId(seriesId)
    setRejectionNotesInput('')
    setShowRejectModal(true)
  }

  const handleRejectSubmit = async () => {
    if (!rejectionNotesInput.trim()) return
    setSubmittingAction(true)
    try {
      // Rejects transition series back to Draft with custom feedback notes
      await seriesAPI.update(rejectSeriesId, {
        status: 'Draft',
        rejectionNotes: rejectionNotesInput.trim()
      })
      setShowRejectModal(false)
      await loadApprovals()
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to reject series')
    } finally {
      setSubmittingAction(false)
    }
  }

  const toGenreText = (value: unknown): string => {
    if (Array.isArray(value)) {
      const mapped = value.map(item => {
        if (typeof item === 'string') {
          const trimmed = item.trim()
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              const parsed = JSON.parse(trimmed)
              if (Array.isArray(parsed)) return parsed.join(', ')
            } catch {
              // ignore parse errors
            }
          }
        }
        return String(item)
      })
      const joined = mapped.join(', ')
      if (joined.startsWith('[') && joined.endsWith(']')) {
        try {
          const parsed = JSON.parse(joined)
          if (Array.isArray(parsed)) return parsed.join(', ')
        } catch {
          // ignore parse errors
        }
      }
      return joined
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (Array.isArray(parsed)) {
            return parsed.map(item => toGenreText(item)).join(', ')
          }
        } catch {
          // Fallback
        }
      }
      return trimmed
    }
    return ''
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Premium Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
            <Sparkles className="size-4 text-neutral-400" />
            {isEB ? 'Editorial Board Administration' : 'Tantou Editor Workbench'}
          </div>
          <h1 className="mt-2 text-2xl font-bold text-neutral-950">
            {isEB ? t('editor.ebDashboard', 'Editorial Board Hub') : t('editor.tantouDashboard', 'Tantou Editor Dashboard')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isEB 
              ? t('editor.ebSubtitle', 'Manage submissions, publish series, and overview ecosystem status.')
              : t('editor.tantouSubtitle', 'Review manuscript drafts, place coordinate annotations, and track studio completion.')}
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-neutral-100 p-1 rounded-xl shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'approvals' 
                ? 'bg-white text-neutral-950 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t('editor.approvalsTab', 'Submissions Review')}
          </button>
          {!isEB && (
            <button
              onClick={() => setActiveTab('monitoring')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'monitoring' 
                  ? 'bg-white text-neutral-950 shadow-sm' 
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {t('editor.monitoringTab', 'Studio Tracking')}
            </button>
          )}
        </div>
      </div>

      {/* Tab Content 1: Approvals Pipeline */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">
              {isEB ? 'Submissions Pending Publication' : 'Manuscripts Awaiting Tantou Approval'}
            </h2>
            <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
              {pendingSeries.length} {t('editor.pendingCount', 'Pending')}
            </Badge>
          </div>

          {loadingApprovals ? (
            <div className="flex items-center justify-center py-20">
              <div className="size-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
            </div>
          ) : pendingSeries.length === 0 ? (
            <Card className="flex flex-col items-center justify-center text-center py-20 border-dashed border-neutral-300">
              <div className="grid size-12 place-items-center rounded-2xl bg-neutral-50">
                <BookOpen className="size-5 text-neutral-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-neutral-800">{t('editor.noApprovals', 'Perfect Inbox!')}</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                {t('editor.approvalsInboxHint', 'No manga series drafts are currently awaiting review in your pipeline.')}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {pendingSeries.map((series) => (
                <Card key={series._id} className="flex gap-4 p-4 items-start shadow-sm border border-neutral-200 overflow-hidden relative">
                  {/* Status Indicator Bar */}
                  <div className="absolute left-0 inset-y-0 w-1 bg-amber-500" />

                  {series.coverImage ? (
                    <img 
                      src={seriesCoverUrl(series.coverImage)} 
                      alt={series.title} 
                      className="w-20 h-28 object-cover rounded-xl shrink-0 bg-neutral-100 border border-neutral-200" 
                    />
                  ) : (
                    <div className="w-20 h-28 shrink-0 rounded-xl bg-neutral-100 border border-dashed border-neutral-200 flex items-center justify-center text-neutral-400">
                      <BookOpen className="size-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-neutral-900 truncate leading-tight">{series.title}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{series.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0">
                          {toGenreText(series.genre)}
                        </Badge>
                      </div>
                    </div>

                    {/* Owner Details */}
                    {series.mangakaId && (
                      <div className="flex items-center gap-2 rounded-xl bg-neutral-50 p-2 border border-neutral-100">
                        <Avatar className="size-6 bg-neutral-200">
                          <AvatarFallback className="text-[8px]">{series.mangakaId.displayName?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold text-neutral-800 truncate">{series.mangakaId.displayName}</p>
                          <p className="text-[8px] text-neutral-400 uppercase tracking-wider">{t('roles.mangaka', 'Mangaka')}</p>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-semibold rounded-xl h-8 gap-1.5"
                        disabled={submittingAction}
                        onClick={() => handleApprove(series._id)}
                      >
                        <Check className="size-3.5" />
                        {isEB ? t('editor.publish', 'Publish') : t('editor.approve', 'Approve')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-neutral-200 text-red-600 hover:bg-red-50 text-xs font-semibold rounded-xl h-8 gap-1.5"
                        disabled={submittingAction}
                        onClick={() => handleOpenReject(series._id)}
                      >
                        <X className="size-3.5" />
                        {t('editor.reject', 'Reject')}
                      </Button>
                    </div>

                    {/* Expand/Collapse details */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full text-neutral-600 hover:text-neutral-900 text-xs font-semibold rounded-xl h-8 gap-1 border border-neutral-100 hover:bg-neutral-50 mt-1"
                      onClick={() => handleToggleExpand(series._id)}
                    >
                      {expandedSeriesId === series._id ? (
                        <>
                          <ChevronUp className="size-3.5" />
                          {t('editor.collapseDetails', 'Hide Draft Details')}
                        </>
                      ) : (
                        <>
                          <ChevronDown className="size-3.5" />
                          {t('editor.expandDetails', 'Inspect Draft & Chapters')}
                        </>
                      )}
                    </Button>

                    {expandedSeriesId === series._id && (
                      <div className="border-t border-neutral-100 pt-3 mt-2 space-y-2 w-full">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                          {t('editor.submittedChapters', 'Submitted Chapters & Pages')}
                        </span>
                        
                        {loadingChaptersForSeries ? (
                          <div className="flex items-center gap-2 text-xs text-neutral-500 py-2 justify-center">
                            <div className="size-4 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
                            <span>{t('common.loading', 'Loading details...')}</span>
                          </div>
                        ) : expandedChapters.length === 0 ? (
                          <p className="text-xs text-neutral-500 py-2 text-center">
                            {t('editor.noChaptersUploaded', 'No chapters uploaded for this series draft yet.')}
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {expandedChapters.map((chapter) => (
                              <div key={chapter._id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-neutral-800 truncate">
                                    Ch. {chapter.chapterNumber}: {chapter.title}
                                  </p>
                                  <p className="text-[10px] text-neutral-400">
                                    {chapter.totalPages || 0} Pages · {chapter.progress || 0}% Done
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-7 px-2.5 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-semibold rounded-lg shrink-0 gap-1"
                                  onClick={() => navigate(`/editor/review/${chapter._id}`)}
                                >
                                  {t('editor.auditManuscript', 'Audit')}
                                  <ChevronRight className="size-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Assigned Series Progress Monitoring */}
      {activeTab === 'monitoring' && !isEB && (
        <div className="space-y-6">
          {/* Series Selection Dropdown */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-neutral-50 p-4 rounded-2xl border border-neutral-200 shadow-sm">
            <div>
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">{t('editor.selectMonitored', 'Select Series to Track')}</h3>
              <p className="text-xs text-neutral-400">{t('editor.selectMonitoredSub', 'Overview real-time chapter metrics and place corrections.')}</p>
            </div>
            
            <select
              className="h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-white focus:outline-none min-w-56 font-semibold shadow-xs"
              value={selectedSeriesId}
              onChange={(e) => setSelectedSeriesId(e.target.value)}
              disabled={loadingMonitoring || assignedSeries.length === 0}
            >
              {assignedSeries.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
            </select>
          </div>

          {loadingMonitoring ? (
            <div className="flex items-center justify-center py-16">
              <div className="size-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
            </div>
          ) : assignedSeries.length === 0 ? (
            <Card className="flex flex-col items-center justify-center text-center py-20 border-dashed border-neutral-300">
              <div className="grid size-12 place-items-center rounded-2xl bg-neutral-50">
                <Layers3 className="size-5 text-neutral-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-neutral-800">{t('editor.noAssigned', 'No assigned series')}</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                {t('editor.assignedInboxHint', 'You are currently not designated as a Tantou Editor for any production series.')}
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">{t('editor.chaptersProduction', 'Production Chapters Progress')}</h2>
                <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
                  {chapters.length} {t('editor.chaptersCountLabel', 'Chapters')}
                </Badge>
              </div>

              {loadingChapters ? (
                <div className="flex items-center justify-center py-16">
                  <div className="size-8 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-800" />
                </div>
              ) : chapters.length === 0 ? (
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 text-center text-xs text-neutral-500">
                  {t('editor.noChapters', 'No chapters created for this series yet.')}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {chapters.map((chapter) => (
                    <Card key={chapter._id} className="p-4 flex flex-col justify-between border border-neutral-200 shadow-sm relative overflow-hidden">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Ch. {chapter.chapterNumber}</span>
                          <Badge variant="secondary" className="capitalize text-[9px] px-2 py-0">
                            {chapter.status}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-neutral-800 leading-tight truncate">{chapter.title}</h4>
                      </div>

                      {/* Real-time Studio Progress Tracking */}
                      <div className="space-y-1.5 mt-5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-neutral-500">{t('editor.studioProgress', 'Studio Progress:')}</span>
                          <span className="font-semibold text-neutral-800">{chapter.progress || 0}%</span>
                        </div>
                        <Progress value={chapter.progress || 0} className="h-1.5 bg-neutral-100" />
                      </div>

                      {/* Stats */}
                      <div className="flex justify-between items-center text-[10px] text-neutral-500 border-t border-neutral-100 mt-4 pt-3">
                        <div className="flex items-center gap-1">
                          <PenTool className="size-3 text-neutral-400" />
                          <span>{chapter.totalPages || 0} Pages</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="size-3 text-neutral-400" />
                          <span>{chapter.collaborators?.length || 1} Staff</span>
                        </div>
                      </div>

                      {/* Review Manuscript button */}
                      <Button
                        size="sm"
                        className="w-full mt-4 bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl h-8 text-xs font-semibold gap-1.5"
                        onClick={() => navigate(`/editor/review/${chapter._id}`)}
                      >
                        {t('editor.reviewManuscript', 'Review Manuscript')}
                        <ChevronRight className="size-3.5" />
                      </Button>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Rejection Feedback Modal ────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                {t('editor.writeRejectionTitle', 'Provide Revision Feedback')}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {t('editor.writeRejectionDesc', 'Explain what edits, cover updates, or manuscript revisions are required before this series is approved.')}
              </p>
            </div>

            <textarea
              className="w-full min-h-28 rounded-xl border border-neutral-200 p-3 text-xs outline-none bg-neutral-50 focus:bg-white transition-all shadow-xs"
              placeholder={t('editor.rejectionPlaceholder', 'Write corrections details (e.g. Title is clashing, genres mismatch, cover resolution too low...)')}
              value={rejectionNotesInput}
              onChange={(e) => setRejectionNotesInput(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold border-neutral-200"
                onClick={() => setShowRejectModal(false)}
                disabled={submittingAction}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white"
                onClick={handleRejectSubmit}
                disabled={!rejectionNotesInput.trim() || submittingAction}
              >
                {t('editor.submitFeedback', 'Send Corrections')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
