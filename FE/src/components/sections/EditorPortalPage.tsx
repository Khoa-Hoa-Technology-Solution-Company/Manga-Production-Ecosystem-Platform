import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { seriesAPI, chaptersAPI, editorAPI, meetingAPI, authAPI } from '../../lib/api'
import {
  Badge,
  Button,
  Card,
  Progress,
  Avatar,
  AvatarFallback,
  Input,
  Textarea
} from '../ui'
import {
  Check,
  X,
  BookOpen,
  Layers3,
  PenTool,
  ChevronRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Activity,
  Settings,
  Loader2
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
  deadline?: string
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

interface PortfolioItem {
  series: SeriesData
  totalProgress: number
  daysRemaining: number | null
  healthStatus: 'green' | 'yellow' | 'red'
  totalChaptersCount: number
  activeChaptersCount: number
  latestChapter: ChapterData | null
}

interface WarningItem {
  type: 'BOTTLENECK' | 'DEADLINE_APPROACHING' | 'EXCESSIVE_REJECTIONS'
  severity: 'yellow' | 'red'
  chapterId: string
  chapterTitle: string
  chapterNumber: number
  seriesId: string
  seriesTitle: string
  progress: number
  daysRemaining?: number
  rejectionCount?: number
  message: string
}

interface MilestonePhase {
  title: string
  range: string
  percentage: number
  totalPages: number
  chapters: ChapterData[]
}

interface MilestonesData {
  milestones: {
    name: MilestonePhase
    draft: MilestonePhase
    final: MilestonePhase
  }
}

interface AnalyticsData {
  mangaka: {
    _id: string
    displayName: string
    avatar?: string
  }
  reliability: {
    onTime: number
    late: number
    total: number
  }
  velocity: {
    averageDays: number
    completedChaptersCount: number
  }
  rejections: {
    seriesRejections: number
    totalReviewAnnotations: number
    rejectionHistory: Array<{
      seriesId: string
      seriesTitle: string
      rejectionNotes: string
      date: string
    }>
  }
}

export function EditorPortalPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()

  const isEB = user?.role === 'editorial_board'

  // Tab State: default 'portfolio' for Tantou, 'approvals' for Editorial Board
  const [activeTab, setActiveTab] = useState<'portfolio' | 'milestones' | 'warnings' | 'approvals' | 'analytics' | 'meetings'>(
    isEB ? 'approvals' : 'portfolio'
  )

  // Meetings schedule state
  const [meetings, setMeetings] = useState<any[]>([])
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDesc, setMeetingDesc] = useState('')
  const [meetingDateTime, setMeetingDateTime] = useState('')
  const [meetingLoc, setMeetingLoc] = useState('')
  const [meetingSeriesId, setMeetingSeriesId] = useState('')
  const [meetingParticipants, setMeetingParticipants] = useState<string[]>([])
  const [availableReviewers, setAvailableReviewers] = useState<any[]>([])
  const [submittingMeeting, setSubmittingMeeting] = useState(false)

  // Expanded Series Details states (in Approvals)
  const [expandedSeriesId, setExpandedSeriesId] = useState('')
  const [expandedChapters, setExpandedChapters] = useState<ChapterData[]>([])
  const [loadingChaptersForSeries, setLoadingChaptersForSeries] = useState(false)

  // ── Tab 1: Portfolio Dashboard States ────────────────
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([])
  const [invites, setInvites] = useState<SeriesData[]>([])
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [deadlineModalSeries, setDeadlineModalSeries] = useState<SeriesData | null>(null)
  const [deadlineInput, setDeadlineInput] = useState('')
  const [submittingDeadline, setSubmittingDeadline] = useState(false)

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('')
  const [healthFilter, setHealthFilter] = useState<'all' | 'green' | 'yellow' | 'red'>('all')
  const [sortBy, setSortBy] = useState<'deadline' | 'progress' | 'chapters'>('deadline')

  // ── Tab 2: Milestone Tracking States ─────────────────
  const [milestoneSeriesId, setMilestoneSeriesId] = useState('')
  const [milestonesData, setMilestonesData] = useState<MilestonesData | null>(null)
  const [loadingMilestones, setLoadingMilestones] = useState(false)

  // ── Tab 3: Early Warning System States ───────────────
  const [warnings, setWarnings] = useState<WarningItem[]>([])
  const [loadingWarnings, setLoadingWarnings] = useState(false)
  
  // Custom reminder thresholds (stored in localStorage)
  const [bottleneckThreshold, setBottleneckThreshold] = useState<number>(50)
  const [daysThreshold, setDaysThreshold] = useState<number>(2)
  const [rejectionsThreshold, setRejectionsThreshold] = useState<number>(3)
  const [showSettings, setShowSettings] = useState(false)

  // ── Tab 4: Approvals Pipeline States ─────────────────
  const [pendingSeries, setPendingSeries] = useState<SeriesData[]>([])
  const [loadingApprovals, setLoadingApprovals] = useState(false)
  const [submittingAction, setSubmittingAction] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectSeriesId, setRejectSeriesId] = useState('')
  const [rejectionNotesInput, setRejectionNotesInput] = useState('')

  // ── Tab 5: Performance Analytics States ──────────────
  const [selectedMangakaId, setSelectedMangakaId] = useState('')
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)

  const seriesCoverUrl = (coverImage?: string) => {
    if (!coverImage) return ''
    if (coverImage.startsWith('http')) return coverImage
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    return `${base}${coverImage}`
  }

  // ── Loaders ──────────────────────────────────────────

  // Load Tab 1: Portfolio
  const loadPortfolio = async () => {
    setLoadingPortfolio(true)
    try {
      const res = await editorAPI.getPortfolio()
      setPortfolio(res.data.portfolio || [])
      setInvites(res.data.invites || [])
      
      // Auto-select first series for milestone view if not set
      const list = res.data.portfolio || []
      if (list.length > 0 && !milestoneSeriesId) {
        setMilestoneSeriesId(list[0].series._id)
      }
    } catch (err) {
      console.error('Failed to load portfolio', err)
    } finally {
      setLoadingPortfolio(false)
    }
  }

  // Handle responding to handshake
  const handleRespondToInvite = async (seriesId: string, action: 'accept' | 'decline') => {
    try {
      await seriesAPI.respondToHandshake(seriesId, action)
      await loadPortfolio()
    } catch (err) {
      console.error('Failed to respond to invite', err)
      alert('Failed to respond to invitation request.')
    }
  }

  // Load Tab 2: Milestones
  const loadMilestones = async (seriesId: string) => {
    if (!seriesId) return
    setLoadingMilestones(true)
    try {
      const res = await editorAPI.getMilestones(seriesId)
      setMilestonesData(res.data || null)
    } catch (err) {
      console.error('Failed to load milestones', err)
      setMilestonesData(null)
    } finally {
      setLoadingMilestones(false)
    }
  }

  // Load Tab 3: Warnings
  const loadWarnings = async () => {
    setLoadingWarnings(true)
    try {
      const res = await editorAPI.getWarnings()
      setWarnings(res.data.warnings || [])
    } catch (err) {
      console.error('Failed to load warnings', err)
    } finally {
      setLoadingWarnings(false)
    }
  }

  // Load Tab 4: Approvals
  const loadApprovals = async () => {
    setLoadingApprovals(true)
    try {
      const targetStatus = isEB ? 'Pending_EB' : 'Pending_Editor'
      const res = await seriesAPI.getAll({ status: targetStatus })
      setPendingSeries(res.data.series || [])
    } catch (err) {
      console.error('Failed to load pending series approvals', err)
    } finally {
      setLoadingApprovals(false)
    }
  }

  // Load Tab 5: Analytics
  const loadAnalytics = async (mangakaId: string) => {
    if (!mangakaId) return
    setLoadingAnalytics(true)
    try {
      const res = await editorAPI.getAnalytics(mangakaId)
      setAnalytics(res.data || null)
    } catch (err) {
      console.error('Failed to load analytics', err)
      setAnalytics(null)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  // ── Expand/Collapse in Approvals Tab ─────────────────
  const handleToggleExpand = async (seriesId: string) => {
    if (expandedSeriesId === seriesId) {
      setExpandedSeriesId('')
      setExpandedChapters([])
      return
    }
    
    setExpandedSeriesId(seriesId)
    setLoadingChaptersForSeries(true)
    try {
      const res = await chaptersAPI.getBySeries(seriesId)
      setExpandedChapters(res.data.chapters || [])
    } catch (err) {
      console.error('Failed to load chapters for inspect', err)
      setExpandedChapters([])
    } finally {
      setLoadingChaptersForSeries(false)
    }
  }

  // ── Actions ──────────────────────────────────────────

  // Set/Edit Series Deadline
  const handleOpenDeadlineModal = (series: SeriesData) => {
    setDeadlineModalSeries(series)
    setDeadlineInput(series.deadline ? new Date(series.deadline).toISOString().split('T')[0] : '')
    setDeadlineModalSeries(series)
  }

  const handleDeadlineSubmit = async () => {
    if (!deadlineModalSeries) return
    setSubmittingDeadline(true)
    try {
      await seriesAPI.update(deadlineModalSeries._id, {
        deadline: deadlineInput ? new Date(deadlineInput).toISOString() : null
      })
      setDeadlineModalSeries(null)
      await loadPortfolio()
    } catch (err) {
      console.error('Failed to update series deadline', err)
      alert('Failed to update series deadline')
    } finally {
      setSubmittingDeadline(false)
    }
  }

  // Handle approvals
  const handleApprove = async (seriesId: string) => {
    setSubmittingAction(true)
    try {
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

  const loadMeetings = async () => {
    try {
      const res = await meetingAPI.getAll()
      setMeetings(res.data.meetings || [])
    } catch (err) {
      console.error('Failed to load meetings', err)
    }
  }

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetingTitle || !meetingDateTime || meetingParticipants.length === 0) return
    setSubmittingMeeting(true)
    try {
      await meetingAPI.create({
        title: meetingTitle,
        description: meetingDesc,
        dateTime: meetingDateTime,
        location: meetingLoc,
        seriesId: meetingSeriesId || undefined,
        participants: meetingParticipants,
      })
      setShowMeetingForm(false)
      // Reset form
      setMeetingTitle('')
      setMeetingDesc('')
      setMeetingDateTime('')
      setMeetingLoc('')
      setMeetingSeriesId('')
      setMeetingParticipants([])
      await loadMeetings()
    } catch (err) {
      console.error('Failed to create meeting:', err)
    } finally {
      setSubmittingMeeting(false)
    }
  }

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm(t('editorialBoard.confirmCancelMeeting'))) return
    try {
      await meetingAPI.delete(id)
      await loadMeetings()
    } catch (err) {
      console.error('Failed to delete meeting:', err)
    }
  }

  const handleOpenMeetingForm = async () => {
    setShowMeetingForm(true)
    try {
      const res = await authAPI.search('', { roles: 'editor,editorial_board' })
      setAvailableReviewers(res.data.users || [])
    } catch (err) {
      console.error('Failed to load reviewers:', err)
    }
  }

  const handleToggleParticipant = (id: string) => {
    setMeetingParticipants((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    )
  }

  // ── Lifecycle Hooks ──────────────────────────────────

  // Initialize reminder thresholds from localStorage
  useEffect(() => {
    const savedBot = localStorage.getItem('mf_threshold_bottleneck')
    const savedDays = localStorage.getItem('mf_threshold_days')
    const savedRej = localStorage.getItem('mf_threshold_rejections')
    Promise.resolve().then(() => {
      if (savedBot) setBottleneckThreshold(Number(savedBot))
      if (savedDays) setDaysThreshold(Number(savedDays))
      if (savedRej) setRejectionsThreshold(Number(savedRej))
    })
  }, [])

  const saveSettings = () => {
    localStorage.setItem('mf_threshold_bottleneck', bottleneckThreshold.toString())
    localStorage.setItem('mf_threshold_days', daysThreshold.toString())
    localStorage.setItem('mf_threshold_rejections', rejectionsThreshold.toString())
    setShowSettings(false)
  }

  // Handle tab routing & data loading
  useEffect(() => {
    Promise.resolve().then(() => {
      if (activeTab === 'portfolio') {
        loadPortfolio()
      } else if (activeTab === 'milestones') {
        loadPortfolio().then(() => {
          if (milestoneSeriesId) loadMilestones(milestoneSeriesId)
        })
      } else if (activeTab === 'warnings') {
        loadWarnings()
      } else if (activeTab === 'approvals') {
        loadApprovals()
      } else if (activeTab === 'analytics') {
        loadPortfolio().then(() => {
          if (selectedMangakaId) loadAnalytics(selectedMangakaId)
        })
      } else if (activeTab === 'meetings') {
        loadMeetings()
        loadPortfolio()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user?._id])

  // Reload milestones when selected series changes
  useEffect(() => {
    if (activeTab === 'milestones' && milestoneSeriesId) {
      Promise.resolve().then(() => {
        loadMilestones(milestoneSeriesId)
      })
    }
  }, [milestoneSeriesId, activeTab])

  // Reload analytics when selected mangaka changes
  useEffect(() => {
    if (activeTab === 'analytics' && selectedMangakaId) {
      Promise.resolve().then(() => {
        loadAnalytics(selectedMangakaId)
      })
    }
  }, [selectedMangakaId, activeTab])

  // Extract unique mangakas from portfolio list for selector
  const uniqueMangakas = Array.from(
    new Map(
      portfolio
        .map(item => item.series.mangakaId)
        .filter((m): m is { _id: string; displayName: string; avatar?: string } => !!m)
        .map(m => [m._id, m])
    ).values()
  )

  // Populate first mangaka automatically if none is selected
  useEffect(() => {
    if (uniqueMangakas.length > 0 && !selectedMangakaId) {
      Promise.resolve().then(() => {
        setSelectedMangakaId(uniqueMangakas[0]._id)
      })
    }
  }, [uniqueMangakas, selectedMangakaId])

  // ── Custom View Filtering for Warnings ───────────────
  const filteredWarnings = warnings.filter(w => {
    if (w.type === 'BOTTLENECK') {
      // Backend triggers bottleneck ratio. Let's show it.
      return true
    }
    if (w.type === 'DEADLINE_APPROACHING') {
      return (w.daysRemaining || 0) <= daysThreshold
    }
    if (w.type === 'EXCESSIVE_REJECTIONS') {
      return (w.rejectionCount || 0) >= rejectionsThreshold
    }
    return true
  })

  // Format genres comfortably
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
              // ignore
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
          // ignore
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
          // ignore
        }
      }
      return trimmed
    }
    return ''
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Premium Elegant Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            <Sparkles className="size-4 animate-pulse text-indigo-500" />
            {isEB ? 'Editorial Board Administration' : 'Tantou Editor Workbench'}
          </div>
          <h1 className="mt-2 text-3xl font-extrabold text-neutral-950 tracking-tight">
            {isEB ? t('editor.ebDashboard', 'Editorial Board Hub') : t('editor.tantouDashboard', 'Tantou Editor Dashboard')}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {isEB 
              ? t('editor.ebSubtitle', 'Manage submissions, publish series, and overview ecosystem status.')
              : t('editor.tantouSubtitle', 'Review manuscript drafts, place coordinate annotations, and track studio completion.')}
          </p>
        </div>

        {/* Dynamic Premium Glassmorphic Tab Switcher */}
        <div className="flex flex-wrap bg-neutral-100/80 backdrop-blur-md p-1.5 rounded-2xl shrink-0 self-start lg:self-center border border-neutral-200/50 shadow-inner gap-1">
          {isEB ? (
            <button
              onClick={() => setActiveTab('approvals')}
              className="px-4 py-2 text-xs font-bold rounded-xl transition-all bg-white text-neutral-950 shadow-sm border border-neutral-200/20"
            >
              {t('editor.approvalsTab', 'Submissions Review')}
            </button>
          ) : (
            <>
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'portfolio'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/30'
                }`}
              >
                {t('editor.portfolioTab', 'Portfolio Dashboard')}
              </button>
              <button
                onClick={() => setActiveTab('milestones')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'milestones'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/30'
                }`}
              >
                {t('editor.milestonesTab', 'Milestone Tracking')}
              </button>
              <button
                onClick={() => setActiveTab('warnings')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'warnings'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/30'
                }`}
              >
                {t('editor.warningsTab', 'Early Warning System')}
                {warnings.length > 0 && (
                  <span className="size-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('approvals')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'approvals'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/30'
                }`}
              >
                {t('editor.approvalsTab', 'Submissions Review')}
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'analytics'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/30'
                }`}
              >
                {t('editor.analyticsTab', 'Insights & Logs')}
              </button>
              <button
                onClick={() => setActiveTab('meetings')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                  activeTab === 'meetings'
                    ? 'bg-white text-neutral-950 shadow-sm border border-neutral-200/20'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/30'
                }`}
              >
                {t('editorialBoard.meetingsTab', 'Meetings')}
              </button>
            </>
          )}
        </div>
      </div>
        {/* ── Tab 1: Portfolio Dashboard ───────────────────────── */}
      {activeTab === 'portfolio' && !isEB && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">
              {t('sidebar.seriesManager', 'Series Portfolio')}
            </h2>
            <Badge variant="secondary" className="bg-neutral-100 text-neutral-700">
              {portfolio.length} Total
            </Badge>
          </div>

          {/* Collaboration Invites Banner */}
          {invites.length > 0 && (
            <div className="space-y-3 bg-gradient-to-r from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-2">
                    <Layers3 className="size-4 animate-bounce text-indigo-600" />
                    Collaboration Requests
                  </h3>
                  <p className="text-xs text-indigo-700/80">
                    Mangakas have designated you as their Tantou Editor. Accept to gain access to their Studio and track progress.
                  </p>
                </div>
                <Badge className="bg-indigo-600 text-white font-bold">{invites.length} Pending</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {invites.map((invite) => (
                  <Card key={invite._id} className="p-3 flex items-start justify-between gap-3 bg-white/80 border border-indigo-100/50 shadow-xs rounded-xl">
                    <div className="flex gap-3 items-center min-w-0">
                      {invite.coverImage ? (
                        <img
                          src={seriesCoverUrl(invite.coverImage)}
                          alt={invite.title}
                          className="w-10 h-14 object-cover rounded-lg shrink-0 border border-neutral-100"
                        />
                      ) : (
                        <div className="w-10 h-14 shrink-0 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-400">
                          <BookOpen className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-neutral-900 truncate">{invite.title}</h4>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Avatar className="size-4 bg-neutral-200">
                            <AvatarFallback className="text-[6px]">{invite.mangakaId?.displayName?.[0] || '?'}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-neutral-500 font-semibold truncate">
                            {invite.mangakaId?.displayName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg h-7 px-3"
                        onClick={() => handleRespondToInvite(invite._id, 'accept')}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-600 hover:bg-rose-50 text-[10px] font-bold rounded-lg h-7 px-3 border border-rose-100"
                        onClick={() => handleRespondToInvite(invite._id, 'decline')}
                      >
                        Decline
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Search, Filter & Sort Controls */}
          <div className="grid gap-3 sm:grid-cols-3 bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Search Series</label>
              <input
                type="text"
                placeholder="Search title or mangaka..."
                className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 font-medium shadow-2xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Filter Health</label>
              <select
                className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 font-bold shadow-2xs cursor-pointer"
                value={healthFilter}
                onChange={(e) => setHealthFilter(e.target.value as 'all' | 'green' | 'yellow' | 'red')}
              >
                <option value="all">All Statuses</option>
                <option value="green">🟢 On Track</option>
                <option value="yellow">🟡 At Risk</option>
                <option value="red">🔴 Critical Delay</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Sort By</label>
              <select
                className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 font-bold shadow-2xs cursor-pointer"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'deadline' | 'progress' | 'chapters')}
              >
                <option value="deadline">📅 EB Deadline</option>
                <option value="progress">📈 Chapter Progress</option>
                <option value="chapters">📚 Total Chapters</option>
              </select>
            </div>
          </div>

          {/* Client-side Filtered and Sorted Portfolio */}
          {(() => {
            const filtered = portfolio
              .filter(item => {
                const matchesSearch = item.series.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (item.series.mangakaId?.displayName?.toLowerCase() || '').includes(searchQuery.toLowerCase())
                const matchesHealth = healthFilter === 'all' || item.healthStatus === healthFilter
                return matchesSearch && matchesHealth
              })
              .sort((a, b) => {
                if (sortBy === 'deadline') {
                  const timeA = a.series.deadline ? new Date(a.series.deadline).getTime() : Infinity
                  const timeB = b.series.deadline ? new Date(b.series.deadline).getTime() : Infinity
                  return timeA - timeB
                }
                if (sortBy === 'progress') {
                  return b.totalProgress - a.totalProgress
                }
                if (sortBy === 'chapters') {
                  return b.totalChaptersCount - a.totalChaptersCount
                }
                return 0
              })

            if (loadingPortfolio) {
              return (
                <div className="flex items-center justify-center py-24">
                  <div className="size-10 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600" />
                </div>
              )
            }

            if (filtered.length === 0) {
              return (
                <Card className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-neutral-300 bg-white">
                  <div className="grid size-14 place-items-center rounded-2xl bg-neutral-50 border border-neutral-100 shadow-xs">
                    <BookOpen className="size-6 text-neutral-400" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-neutral-800">No Matching Series</h3>
                  <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                    No series in your accepted portfolio match the search or filter criteria.
                  </p>
                </Card>
              )
            }

            return (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(({ series, totalProgress, daysRemaining, healthStatus, totalChaptersCount, activeChaptersCount, latestChapter }) => (
                  <Card
                    key={series._id}
                    className="flex flex-col justify-between p-5 shadow-sm border border-neutral-200 hover:border-neutral-300 transition-all hover:shadow-md rounded-2xl bg-white relative overflow-hidden"
                  >
                    {/* Health status horizontal glowing border stripe */}
                    <div
                      className={`absolute top-0 inset-x-0 h-1 transition-all ${
                        healthStatus === 'green'
                          ? 'bg-emerald-500'
                          : healthStatus === 'yellow'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />

                    <div>
                      {/* Cover & Title */}
                      <div className="flex gap-4 items-start">
                        {series.coverImage ? (
                          <img
                            src={seriesCoverUrl(series.coverImage)}
                            alt={series.title}
                            className="w-16 h-24 object-cover rounded-xl shrink-0 bg-neutral-100 border border-neutral-200/60 shadow-xs"
                          />
                        ) : (
                          <div className="w-16 h-24 shrink-0 rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center text-neutral-400">
                            <BookOpen className="size-6" />
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`size-2.5 rounded-full ${
                                healthStatus === 'green'
                                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                                  : healthStatus === 'yellow'
                                  ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                  : 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                              }`}
                            />
                            <span className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-400">
                              {healthStatus === 'green'
                                ? t('editor.healthGreen', 'On Track')
                                : healthStatus === 'yellow'
                                ? t('editor.healthYellow', 'At Risk')
                                : t('editor.healthRed', 'Critical Delay')}
                            </span>
                          </div>

                          <h3 className="font-extrabold text-sm text-neutral-900 leading-snug line-clamp-1">
                            {series.title}
                          </h3>

                          <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {series.description || 'No description provided.'}
                          </p>
                        </div>
                      </div>

                      {/* Progress tracking details */}
                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-neutral-500 font-medium">{t('editor.totalProgress', 'Total Progress')}:</span>
                          <span className="font-bold text-neutral-800">{totalProgress}%</span>
                        </div>
                        <Progress value={totalProgress} className="h-1.5 bg-neutral-100 rounded-full" />
                      </div>

                      {/* Countdown / Deadline info */}
                      <div className="mt-4 p-3 bg-neutral-50 rounded-xl border border-neutral-100/80 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs">
                          <Clock className="size-4 text-neutral-400" />
                          <span className="font-semibold text-neutral-700">
                            {daysRemaining !== null ? (
                              daysRemaining >= 0 ? (
                                t('editor.daysRemaining', { days: daysRemaining })
                              ) : (
                                <span className="text-rose-600 font-extrabold">
                                  {Math.abs(daysRemaining)} {t('editor.days', 'days')} Overdue
                                </span>
                              )
                            ) : (
                              t('editor.noDeadline', 'No deadline set')
                            )}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[10px] font-bold text-indigo-600 hover:text-indigo-700 rounded-lg p-1 hover:bg-indigo-50"
                          onClick={() => handleOpenDeadlineModal(series)}
                        >
                          <Calendar className="size-3.5 mr-1" />
                          {t('editor.setDeadline', 'Set')}
                        </Button>
                      </div>

                      {/* Meta stats */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] font-semibold text-neutral-500 bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100">
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider block mb-0.5">Chapters</span>
                          <span className="text-neutral-800 text-xs font-bold">{totalChaptersCount} Total</span>
                        </div>
                        <div>
                          <span className="text-neutral-400 uppercase tracking-wider block mb-0.5">Active</span>
                          <span className="text-neutral-800 text-xs font-bold">{activeChaptersCount} In Production</span>
                        </div>
                      </div>
                    </div>

                    {/* Footer actions */}
                    <div className="mt-5 pt-3 border-t border-neutral-100 flex gap-2">
                      {latestChapter ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold rounded-xl h-9 gap-1.5"
                          onClick={() => navigate(`/editor/review/${latestChapter._id}`)}
                        >
                          <PenTool className="size-3.5" />
                          {t('editor.reviewManuscript', 'Review Manuscript')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled
                          className="flex-1 bg-neutral-200 text-neutral-400 text-xs font-bold rounded-xl h-9"
                        >
                          No Chapters Available
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-neutral-500 hover:bg-neutral-100 text-xs font-bold rounded-xl h-9 px-3 gap-1.5 shrink-0 border border-neutral-200"
                        onClick={() => handleToggleExpand(series._id)}
                      >
                        {expandedSeriesId === series._id ? 'Hide Chapters' : 'Inspect Chapters'}
                      </Button>
                    </div>

                    {/* Expanded Chapters List */}
                    {expandedSeriesId === series._id && (
                      <div className="border-t border-neutral-100 pt-3 mt-4 space-y-2 w-full text-left">
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
                            {t('editor.noChapters', 'No chapters created for this series yet.')}
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {expandedChapters.map((chapter) => (
                              <div key={chapter._id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-neutral-800 truncate">
                                    Ch. {chapter.chapterNumber}: {chapter.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-neutral-400">
                                      {chapter.totalPages || 0} Pages · {chapter.progress || 0}% Done
                                    </span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                      chapter.status === 'Reviewing'
                                        ? 'bg-amber-100 text-amber-800'
                                        : chapter.status === 'Published'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : chapter.status === 'Approved'
                                            ? 'bg-sky-100 text-sky-800'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                      {chapter.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-semibold rounded-lg gap-1"
                                    onClick={() => navigate(`/editor/review/${chapter._id}`)}
                                  >
                                    {t('editor.auditManuscript', 'Audit')}
                                    <ChevronRight className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {/* ── Tab 2: Milestone Tracking ────────────────────────── */}
      {activeTab === 'milestones' && !isEB && (
        <div className="space-y-6">
          {/* Series Selection Dropdown */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-neutral-50/80 p-4 rounded-2xl border border-neutral-200/60 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('editor.selectMonitored', 'Select Series to Track')}</h3>
              <p className="text-xs text-neutral-400">{t('editor.selectMonitoredSub', 'Overview real-time chapter metrics and place corrections.')}</p>
            </div>
            
            <select
              className="h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-white focus:outline-none min-w-64 font-bold shadow-xs cursor-pointer hover:border-neutral-300"
              value={milestoneSeriesId}
              onChange={(e) => setMilestoneSeriesId(e.target.value)}
              disabled={loadingPortfolio || portfolio.length === 0}
            >
              {portfolio.map(item => (
                <option key={item.series._id} value={item.series._id}>
                  {item.series.title}
                </option>
              ))}
            </select>
          </div>

          {loadingMilestones ? (
            <div className="flex items-center justify-center py-24">
              <div className="size-10 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600" />
            </div>
          ) : !milestonesData ? (
            <div className="text-center py-20 text-xs text-neutral-500 border border-dashed rounded-2xl border-neutral-300">
              Select a series to view milestone stages.
            </div>
          ) : (
            <div className="space-y-8">
              {/* 3-Phase Macro Progress Bar Card */}
              <Card className="p-6 border border-neutral-200 shadow-sm rounded-2xl bg-white space-y-6">
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900">
                    Production Timeline Milestones
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Tracks the workflow phases of chapters currently in active production.
                  </p>
                </div>

                {/* Macro Timeline Indicator */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-neutral-50 rounded-2xl border border-neutral-100">
                  {/* Phase 1: Name */}
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-blue-500">Phase 1</span>
                      <h4 className="font-bold text-xs text-neutral-800 mt-0.5">{t('editor.milestoneName', 'Name/Storyboard')}</h4>
                    </div>
                    <div className="mt-4 flex justify-between items-baseline">
                      <span className="text-xs text-neutral-400 font-semibold">{t('editor.chaptersCountLabel', 'Chapters')}:</span>
                      <span className="text-sm font-extrabold text-neutral-800">{milestonesData.milestones.name.chapters.length}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-neutral-500 flex justify-between">
                      <span>{t('editor.pagesSubmitted', 'Pages')}:</span>
                      <span className="font-bold">{milestonesData.milestones.name.totalPages}</span>
                    </div>
                  </div>

                  {/* Phase 2: Draft/Inking */}
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-500">Phase 2</span>
                      <h4 className="font-bold text-xs text-neutral-800 mt-0.5">{t('editor.milestoneDraft', 'Draft/Inking')}</h4>
                    </div>
                    <div className="mt-4 flex justify-between items-baseline">
                      <span className="text-xs text-neutral-400 font-semibold">{t('editor.chaptersCountLabel', 'Chapters')}:</span>
                      <span className="text-sm font-extrabold text-neutral-800">{milestonesData.milestones.draft.chapters.length}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-neutral-500 flex justify-between">
                      <span>{t('editor.pagesSubmitted', 'Pages')}:</span>
                      <span className="font-bold">{milestonesData.milestones.draft.totalPages}</span>
                    </div>
                  </div>

                  {/* Phase 3: Final */}
                  <div className="p-3 bg-white rounded-xl shadow-xs border border-neutral-100 flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-extrabold uppercase tracking-wide text-amber-500">Phase 3</span>
                      <h4 className="font-bold text-xs text-neutral-800 mt-0.5">{t('editor.milestoneFinal', 'Final Quality')}</h4>
                    </div>
                    <div className="mt-4 flex justify-between items-baseline">
                      <span className="text-xs text-neutral-400 font-semibold">{t('editor.chaptersCountLabel', 'Chapters')}:</span>
                      <span className="text-sm font-extrabold text-neutral-800">{milestonesData.milestones.final.chapters.length}</span>
                    </div>
                    <div className="mt-2 text-[10px] text-neutral-500 flex justify-between">
                      <span>{t('editor.pagesSubmitted', 'Pages')}:</span>
                      <span className="font-bold">{milestonesData.milestones.final.totalPages}</span>
                    </div>
                  </div>
                </div>

                {/* Macro Timeline Bar */}
                <div className="space-y-1">
                  <div className="flex h-3 w-full rounded-full overflow-hidden bg-neutral-100">
                    <div
                      style={{ width: `${milestonesData.milestones.name.percentage}%` }}
                      className="bg-blue-500"
                    />
                    <div
                      style={{ width: `${milestonesData.milestones.draft.percentage}%` }}
                      className="bg-indigo-500"
                    />
                    <div
                      style={{ width: `${milestonesData.milestones.final.percentage}%` }}
                      className="bg-amber-500"
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-neutral-400 font-semibold uppercase tracking-wider">
                    <span>{milestonesData.milestones.name.percentage}% Storyboard</span>
                    <span>{milestonesData.milestones.draft.percentage}% Inking</span>
                    <span>{milestonesData.milestones.final.percentage}% Finalization</span>
                  </div>
                </div>
              </Card>

              {/* Phase Breakdown List */}
              <div className="space-y-6">
                {Object.entries(milestonesData.milestones).map(([key, value]) => {
                  const val = value as MilestonePhase
                  return (
                    <div key={key} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                        <div
                          className={`size-3 rounded-full ${
                            key === 'name' ? 'bg-blue-500' : key === 'draft' ? 'bg-indigo-500' : 'bg-amber-500'
                          }`}
                        />
                        <h4 className="font-extrabold text-sm text-neutral-800 uppercase tracking-wider">
                          {val.title} ({val.range})
                        </h4>
                        <Badge variant="secondary" className="bg-neutral-100 text-neutral-600 text-[10px]">
                          {val.chapters.length} Chapters
                        </Badge>
                      </div>

                      {val.chapters.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic pl-5">
                          No active chapters in this phase currently.
                        </p>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {val.chapters.map((ch: ChapterData) => (
                            <Card
                              key={ch._id}
                              className="p-4 border border-neutral-100 hover:border-neutral-200 shadow-xs bg-white rounded-xl flex flex-col justify-between space-y-4"
                            >
                              <div className="space-y-1">
                                <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">
                                  Chapter {ch.chapterNumber}
                                </span>
                                <h5 className="font-extrabold text-xs text-neutral-900 leading-tight truncate">
                                  {ch.title}
                                </h5>
                              </div>

                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] text-neutral-500 font-semibold">
                                  <span>Progress:</span>
                                  <span>{ch.progress}%</span>
                                </div>
                                <Progress value={ch.progress} className="h-1 bg-neutral-100 rounded-full" />
                              </div>

                              <div className="flex justify-between items-center text-[10px] text-neutral-500 border-t border-neutral-50/80 pt-2">
                                <span>Pages: <strong>{ch.totalPages}</strong></span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[9px] font-bold text-indigo-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700"
                                  onClick={() => navigate(`/editor/review/${ch._id}`)}
                                >
                                  {t('editor.reviewManuscript', 'Review')}
                                  <ChevronRight className="size-3 ml-0.5" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Early Warning System ──────────────────────── */}
      {activeTab === 'warnings' && !isEB && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">
                Production Risk Warnings
              </h2>
              <p className="text-xs text-neutral-400">
                Automated indicators flagging potential bottlenecks, overdue manuscripts, and high revision rates.
              </p>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              className="border-neutral-200 text-neutral-700 rounded-xl flex items-center gap-1.5 h-9 font-semibold text-xs self-start sm:self-center"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="size-4 text-neutral-500" />
              {t('editor.configureThresholds', 'Configure Alerts')}
            </Button>
          </div>

          {/* Config thresholds Panel */}
          {showSettings && (
            <Card className="p-5 border border-indigo-100 bg-indigo-50/30 rounded-2xl space-y-4 max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="size-4 text-indigo-600" />
                Customize Alert Logic
              </h3>
              
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 block">
                    {t('editor.thresholdDays', 'Overdue Threshold (days left)')}
                  </label>
                  <input
                    type="number"
                    className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-3 font-semibold focus:outline-none"
                    value={daysThreshold}
                    onChange={(e) => setDaysThreshold(Number(e.target.value))}
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="font-semibold text-neutral-700 block">
                    {t('editor.thresholdRejections', 'Excessive Rejections (review annotations)')}
                  </label>
                  <input
                    type="number"
                    className="w-full h-9 rounded-xl border border-neutral-200 bg-white px-3 font-semibold focus:outline-none"
                    value={rejectionsThreshold}
                    onChange={(e) => setRejectionsThreshold(Number(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl h-8 text-neutral-500 hover:bg-neutral-100 text-xs font-bold"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-8 px-4 text-xs font-bold"
                  onClick={saveSettings}
                >
                  {t('editor.saveSettings', 'Save Settings')}
                </Button>
              </div>
            </Card>
          )}

          {loadingWarnings ? (
            <div className="flex items-center justify-center py-24">
              <div className="size-10 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600" />
            </div>
          ) : filteredWarnings.length === 0 ? (
            <Card className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-neutral-300 bg-neutral-50/50">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 shadow-xs">
                <Check className="size-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-neutral-800">Ecosystem Safe!</h3>
              <p className="mt-1 text-xs text-neutral-400 max-w-sm">
                No active production lines currently violate your risk parameters. All chapters are proceeding normally.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredWarnings.map((w, index) => (
                <Card
                  key={index}
                  className={`p-4 border shadow-xs rounded-2xl bg-white relative overflow-hidden flex flex-col justify-between space-y-4 ${
                    w.severity === 'red' ? 'border-rose-100 hover:border-rose-200' : 'border-amber-100 hover:border-amber-200'
                  }`}
                >
                  {/* Severity color glowing left stripe */}
                  <div
                    className={`absolute left-0 inset-y-0 w-1 ${
                      w.severity === 'red' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'
                    }`}
                  />

                  <div className="space-y-3 pl-2">
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        {w.severity === 'red' ? (
                          <AlertCircle className="size-4 text-rose-500 shrink-0" />
                        ) : (
                          <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                        )}
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 truncate max-w-48">
                          {w.seriesTitle}
                        </span>
                      </div>
                      
                      <Badge
                        variant="secondary"
                        className={`text-[9px] px-2 py-0 font-extrabold uppercase tracking-wide shrink-0 ${
                          w.type === 'BOTTLENECK'
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : w.type === 'DEADLINE_APPROACHING'
                            ? 'bg-rose-50 text-rose-600 border border-rose-100'
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}
                      >
                        {w.type === 'BOTTLENECK'
                          ? t('editor.warningBottleneck', 'Bottleneck')
                          : w.type === 'DEADLINE_APPROACHING'
                          ? t('editor.warningDeadline', 'Urgent Deadline')
                          : t('editor.warningRejections', 'Excess Rejections')}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-xs text-neutral-800 leading-tight">
                        Chapter {w.chapterNumber}: {w.chapterTitle}
                      </h4>
                      <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
                        {w.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pl-2 pt-2 border-t border-neutral-50">
                    <span className="text-[10px] text-neutral-400 font-semibold">
                      Current: <strong>{w.progress}% Done</strong>
                    </span>
                    <Button
                      size="sm"
                      className={`h-7 px-3 text-[10px] font-bold rounded-lg shrink-0 gap-1 ${
                        w.severity === 'red'
                          ? 'bg-rose-600 hover:bg-rose-700 text-white'
                          : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                      }`}
                      onClick={() => navigate(`/editor/review/${w.chapterId}`)}
                    >
                      {t('editor.auditManuscript', 'Audit')}
                      <ChevronRight className="size-3" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: Submissions Review ────────────────────────── */}
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
            <div className="flex items-center justify-center py-24">
              <div className="size-10 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600" />
            </div>
          ) : pendingSeries.length === 0 ? (
            <Card className="flex flex-col items-center justify-center text-center py-20 border border-dashed border-neutral-300">
              <div className="grid size-12 place-items-center rounded-2xl bg-neutral-50">
                <BookOpen className="size-5 text-neutral-400" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-neutral-800">{t('editor.noApprovals', 'Perfect Inbox!')}</h3>
              <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                {t('editor.approvalsInboxHint', 'No manga series drafts are currently awaiting review in your pipeline.')}
              </p>
            </Card>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {pendingSeries.map((series) => (
                <Card key={series._id} className="flex gap-4 p-5 items-start shadow-sm border border-neutral-200 overflow-hidden relative rounded-2xl bg-white">
                  {/* Submissions amber status bar */}
                  <div className="absolute left-0 inset-y-0 w-1 bg-amber-500" />

                  {series.coverImage ? (
                    <img 
                      src={seriesCoverUrl(series.coverImage)} 
                      alt={series.title} 
                      className="w-20 h-28 object-cover rounded-xl shrink-0 bg-neutral-100 border border-neutral-200" 
                    />
                  ) : (
                    <div className="w-20 h-28 shrink-0 rounded-xl bg-neutral-50 border border-dashed border-neutral-200 flex items-center justify-center text-neutral-400">
                      <BookOpen className="size-6" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1 flex flex-col justify-between h-full space-y-3">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-sm text-neutral-900 truncate leading-tight">{series.title}</h3>
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{series.description}</p>
                      
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 font-semibold bg-neutral-100 text-neutral-600">
                          {toGenreText(series.genre)}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] px-2 py-0 font-semibold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                          <BookOpen className="size-2.5" />
                          {t('editor.chaptersCountBadge', '{{count}} Chapters', { count: series.totalChapters || 0 })}
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

                    {/* Actions */}
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
                        className="flex-1 border-neutral-200 !text-red-600 !bg-red-50 hover:!bg-red-100 hover:!text-red-700 text-xs font-semibold rounded-xl h-8 gap-1.5"
                        disabled={submittingAction}
                        onClick={() => handleOpenReject(series._id)}
                      >
                        <X className="size-3.5" />
                        {t('editor.reject', 'Reject')}
                      </Button>
                    </div>

                    {/* Expandable Panel */}
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
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-neutral-400">
                                      {chapter.totalPages || 0} Pages · {chapter.progress || 0}% Done
                                    </span>
                                    <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                                      chapter.status === 'Reviewing'
                                        ? 'bg-amber-100 text-amber-800'
                                        : chapter.status === 'Published'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : chapter.status === 'Approved'
                                            ? 'bg-sky-100 text-sky-800'
                                            : 'bg-neutral-100 text-neutral-600'
                                    }`}>
                                      {chapter.status}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="sm"
                                    className="h-7 px-2 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-semibold rounded-lg gap-1"
                                    onClick={() => navigate(`/editor/review/${chapter._id}`)}
                                  >
                                    {t('editor.auditManuscript', 'Audit')}
                                    <ChevronRight className="size-3" />
                                  </Button>
                                </div>
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

      {/* ── Tab 5: Performance Analytics ─────────────────────── */}
      {activeTab === 'analytics' && !isEB && (
        <div className="space-y-6">
          {/* Selector */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-neutral-50/80 p-4 rounded-2xl border border-neutral-200/60 shadow-sm">
            <div>
              <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('editor.selectMangaka', 'Select Mangaka to Analyze')}</h3>
              <p className="text-xs text-neutral-400">Review historical speed metrics and submission reliability benchmarks.</p>
            </div>
            
            <select
              className="h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-white focus:outline-none min-w-64 font-bold shadow-xs cursor-pointer"
              value={selectedMangakaId}
              onChange={(e) => setSelectedMangakaId(e.target.value)}
              disabled={loadingPortfolio || uniqueMangakas.length === 0}
            >
              {uniqueMangakas.map(m => (
                <option key={m._id} value={m._id}>
                  {m.displayName}
                </option>
              ))}
            </select>
          </div>

          {loadingAnalytics ? (
            <div className="flex items-center justify-center py-24">
              <div className="size-10 animate-spin rounded-full border-4 border-neutral-200 border-t-indigo-600" />
            </div>
          ) : !analytics ? (
            <div className="text-center py-20 text-xs text-neutral-500 border border-dashed rounded-2xl border-neutral-300 bg-white">
              Select a mangaka to view performance aggregates.
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Stat Card 1: Reliability Indicator with Custom CSS Bar Chart */}
              <Card className="p-5 border border-neutral-200 shadow-sm rounded-2xl bg-white flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                    <TrendingUp className="size-3.5" />
                    Performance
                  </span>
                  <h3 className="text-base font-extrabold text-neutral-800">
                    {t('editor.reliability', 'Reliability Index')}
                  </h3>
                  <p className="text-xs text-neutral-400">Ratio of chapter milestone deadlines satisfied.</p>
                </div>

                <div className="py-6 flex items-center justify-center">
                  <div className="relative size-32 flex items-center justify-center rounded-full bg-neutral-50 border-4 border-neutral-100">
                    <div className="text-center">
                      <span className="text-3xl font-black text-indigo-950">
                        {analytics.reliability.total > 0
                          ? Math.round((analytics.reliability.onTime / analytics.reliability.total) * 100)
                          : 100}
                        %
                      </span>
                      <span className="block text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">On-Time Rate</span>
                    </div>
                  </div>
                </div>

                {/* Custom CSS Bar Chart */}
                <div className="space-y-2">
                  <div className="flex h-5 w-full rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200/40 p-0.5">
                    <div
                      style={{
                        width: `${
                          analytics.reliability.total > 0
                            ? (analytics.reliability.onTime / analytics.reliability.total) * 100
                            : 100
                        }%`,
                      }}
                      className="bg-emerald-500 rounded-l-md transition-all"
                    />
                    <div
                      style={{
                        width: `${
                          analytics.reliability.total > 0
                            ? (analytics.reliability.late / analytics.reliability.total) * 100
                            : 0
                        }%`,
                      }}
                      className="bg-rose-500 rounded-r-md transition-all"
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-bold">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      {analytics.reliability.onTime} {t('editor.onTime', 'On-Time')}
                    </span>
                    <span className="text-rose-600 flex items-center gap-1">
                      <span className="size-2 rounded-full bg-rose-500" />
                      {analytics.reliability.late} {t('editor.late', 'Late')}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Stat Card 2: Velocity Tracker */}
              <Card className="p-5 border border-neutral-200 shadow-sm rounded-2xl bg-white flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                    <Activity className="size-3.5" />
                    Timeline Speed
                  </span>
                  <h3 className="text-base font-extrabold text-neutral-800">
                    {t('editor.avgVelocity', 'Average Milestone Velocity')}
                  </h3>
                  <p className="text-xs text-neutral-400">Mean time between drafting and editorial approval.</p>
                </div>

                <div className="space-y-4 py-4">
                  <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-center space-y-1">
                    <span className="block text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest">Macro Speed</span>
                    <span className="text-3xl font-black text-neutral-900">
                      {analytics.velocity.averageDays} {t('editor.days', 'Days')}
                    </span>
                    <span className="block text-[10px] font-semibold text-neutral-400">{t('editor.daysPerPhase', 'days per phase')}</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-semibold text-neutral-500 px-1">
                    <span>Approved Chapters:</span>
                    <span className="text-neutral-800 font-extrabold">{analytics.velocity.completedChaptersCount} Units</span>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-400 font-medium pl-1">
                  ⚠️ Note: Velocity reflects only approved manuscript chapters completed by the mangaka.
                </div>
              </Card>

              {/* Stat Card 3: Rejections History timeline */}
              <Card className="p-5 border border-neutral-200 shadow-sm rounded-2xl bg-white flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 flex items-center gap-1">
                    <X className="size-3.5" />
                    Quality Cycles
                  </span>
                  <h3 className="text-base font-extrabold text-neutral-800">
                    {t('editor.rejectionHistory', 'Rejection History')}
                  </h3>
                  <p className="text-xs text-neutral-400">Audit trail of revision notices issued.</p>
                </div>

                <div className="flex-1 overflow-y-auto max-h-56 pr-1.5 space-y-3 pt-2">
                  {analytics.rejections.rejectionHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-10 text-center text-xs text-neutral-400">
                      <Check className="size-5 text-emerald-500 mb-2" />
                      {t('editor.noRejectionHistory', 'No rejection records.')}
                    </div>
                  ) : (
                    analytics.rejections.rejectionHistory.map((rej, index) => (
                      <div key={index} className="flex gap-2 text-xs relative pl-4 border-l border-neutral-100 pb-2">
                        {/* Timeline Bullet */}
                        <div className="absolute left-[-4.5px] top-1.5 size-2 rounded-full bg-rose-500" />
                        
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-neutral-800 truncate">{rej.seriesTitle}</span>
                            <span className="text-[9px] font-bold text-neutral-400 shrink-0">
                              {new Date(rej.date).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[10px] text-rose-600 italic bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50 break-words leading-relaxed font-medium">
                            "{rej.rejectionNotes}"
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-2 border-t border-neutral-50 flex justify-between text-[10px] font-bold text-neutral-500">
                  <span>Rejections Issued: <strong>{analytics.rejections.seriesRejections}</strong></span>
                  <span>Review Comments: <strong>{analytics.rejections.totalReviewAnnotations}</strong></span>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ────── MEETINGS TAB ────── */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">
              {t('editorialBoard.upcomingMeetings')}
            </h2>
            <Button
              onClick={handleOpenMeetingForm}
              className="gap-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold py-2 px-3 shadow-md"
            >
              <Calendar className="size-4" />
              {t('editorialBoard.scheduleMeeting')}
            </Button>
          </div>

          {/* Meeting Form */}
          {showMeetingForm && (
            <Card className="border-indigo-100 bg-indigo-50/10 shadow-xs rounded-2xl p-5 animate-in fade-in slide-in-from-top-3 duration-200">
              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div className="flex justify-between items-center border-b border-neutral-100 pb-3">
                  <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                    <Calendar className="size-4.5 text-indigo-600" />
                    {t('editorialBoard.scheduleMeeting')}
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-neutral-500 rounded-lg text-xs"
                    onClick={() => setShowMeetingForm(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.meetingTitle')}</label>
                    <Input
                      type="text"
                      required
                      value={meetingTitle}
                      onChange={(e: any) => setMeetingTitle(e.target.value)}
                      placeholder="e.g. Series Editorial Evaluation Meeting"
                      className="rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.meetingDateTime')}</label>
                    <Input
                      type="datetime-local"
                      required
                      value={meetingDateTime}
                      onChange={(e: any) => setMeetingDateTime(e.target.value)}
                      className="rounded-xl text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.meetingLocation')}</label>
                    <Input
                      type="text"
                      value={meetingLoc}
                      onChange={(e: any) => setMeetingLoc(e.target.value)}
                      placeholder="Google Meet link or Room 302"
                      className="rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.selectRelatedSeries')}</label>
                    <select
                      value={meetingSeriesId}
                      onChange={(e: any) => setMeetingSeriesId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 font-medium shadow-2xs"
                    >
                      <option value="">-- No Series --</option>
                      {[
                        ...portfolio.map((p) => ({ _id: p.series._id, title: `[Portfolio] ${p.series.title}` })),
                        ...pendingSeries.map((s) => ({ _id: s._id, title: `[Draft] ${s.title}` })),
                      ].map((s) => (
                        <option key={s._id} value={s._id}>{s.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.meetingDescription')}</label>
                  <Textarea
                    value={meetingDesc}
                    onChange={(e: any) => setMeetingDesc(e.target.value)}
                    placeholder="Brief agenda details..."
                    className="min-h-[60px] rounded-xl text-xs bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 block">
                    {t('editorialBoard.selectParticipants')} <span className="text-indigo-600">({meetingParticipants.length} selected)</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-white border border-neutral-200 rounded-xl">
                    {availableReviewers.length === 0 ? (
                      <div className="col-span-full py-4 text-center text-xs text-neutral-400">Loading reviewers...</div>
                    ) : (
                      availableReviewers.map((rev) => {
                        const isSelected = meetingParticipants.includes(rev._id)
                        return (
                          <div
                            key={rev._id}
                            onClick={() => handleToggleParticipant(rev._id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all text-xs ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                                : 'border-neutral-100 hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <div className="grid size-5 shrink-0 place-items-center rounded-full bg-neutral-100 text-[9px] font-bold">
                              {rev.displayName?.[0] || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate">{rev.displayName}</p>
                              <p className="text-[8px] text-neutral-400 capitalize">{rev.role.replace('_', ' ')}</p>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl text-xs"
                    onClick={() => setShowMeetingForm(false)}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-750 text-xs font-bold px-4 py-2"
                    disabled={submittingMeeting || !meetingTitle || !meetingDateTime || meetingParticipants.length === 0}
                  >
                    {submittingMeeting ? <Loader2 className="size-4.5 animate-spin" /> : t('common.create')}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Meetings List */}
          {meetings.length === 0 ? (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                <Calendar className="size-7 text-neutral-400" />
              </div>
              <p className="text-sm font-medium text-neutral-700">{t('editorialBoard.noMeetings')}</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {meetings.map((m) => {
                const meetingDate = new Date(m.dateTime)
                const isUpcoming = meetingDate.getTime() > Date.now()
                return (
                  <Card key={m._id} className="p-5 flex flex-col justify-between border border-neutral-200 hover:border-neutral-300 transition-all rounded-2xl bg-white shadow-2xs relative">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <h3 className="font-extrabold text-sm text-neutral-900 tracking-tight">{m.title}</h3>
                          {m.description && <p className="text-xs text-neutral-500 line-clamp-2">{m.description}</p>}
                        </div>
                        <Badge className={`shrink-0 ${isUpcoming ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                          {isUpcoming ? 'Upcoming' : 'Past'}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-xs text-neutral-600 border-t border-neutral-50 pt-2.5">
                        <div className="flex items-center gap-2">
                          <Clock className="size-3.5 text-indigo-500 shrink-0" />
                          <span>{meetingDate.toLocaleString()}</span>
                        </div>
                        {m.location && (
                          <div className="flex items-center gap-2">
                            <Activity className="size-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{m.location}</span>
                          </div>
                        )}
                        {m.seriesId && (
                          <div className="flex items-center gap-2">
                            <BookOpen className="size-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-neutral-800">
                              Series: {m.seriesId?.title || 'Unknown Series'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 border-t border-neutral-50 pt-2.5">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                          Invited Participants ({m.participants?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {m.participants?.map((p: any) => (
                            <div
                              key={p._id}
                              title={`${p.displayName} (${p.role.replace('_', ' ')})`}
                              className="inline-flex items-center gap-1 bg-neutral-50 border border-neutral-100 px-2 py-0.5 rounded-full text-[10px] font-semibold text-neutral-600"
                            >
                              <div className="size-3.5 rounded-full bg-neutral-200 grid place-items-center text-[7px] font-bold">
                                {p.displayName?.[0] || '?'}
                              </div>
                              <span className="max-w-[80px] truncate">{p.displayName}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-neutral-50 text-[10px] text-neutral-400">
                      <span>Scheduled by {m.createdBy?.displayName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteMeeting(m._id)}
                        className="text-rose-600 hover:bg-rose-50 h-7 px-2 rounded-lg font-semibold border border-rose-100"
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Set Deadline Picker Modal (Tab 1 Inline) ──────────── */}
      {deadlineModalSeries && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-neutral-100">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="size-4 text-indigo-500" />
                Configure Series Deadline
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Select the final EB publication deadline for <strong className="text-neutral-700">{deadlineModalSeries.title}</strong>.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
                Deadline Date
              </label>
              <input
                type="date"
                className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-neutral-50 focus:bg-white outline-none focus:border-indigo-500 font-bold transition-all shadow-xs cursor-pointer"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold border-neutral-200"
                onClick={() => setDeadlineModalSeries(null)}
                disabled={submittingDeadline}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleDeadlineSubmit}
                disabled={submittingDeadline}
              >
                {submittingDeadline ? 'Updating...' : 'Save Deadline'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejection Revision Modal (Tab 4 Review) ──────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-neutral-100">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="size-4 text-rose-500" />
                {t('editor.writeRejectionTitle', 'Provide Revision Feedback')}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {t('editor.writeRejectionDesc', 'Explain what edits, cover updates, or manuscript revisions are required before this series is approved.')}
              </p>
            </div>

            <textarea
              className="w-full min-h-28 rounded-xl border border-neutral-200 p-3 text-xs outline-none bg-neutral-50 focus:bg-white focus:border-rose-500 transition-all shadow-xs resize-none"
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
                className="rounded-xl px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white"
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
