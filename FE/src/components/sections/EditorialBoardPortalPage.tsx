/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Gavel, Clock, Trophy, BarChart3, ThumbsUp, ThumbsDown,
  BookOpen, ChevronDown, ChevronUp, AlertTriangle, Send,
  Calendar, Ban, Loader2, TrendingUp, TrendingDown,
  LayoutDashboard, Activity, ChevronRight, User, Tag,
  Palette, Medal, Star, CheckCircle2, X
} from 'lucide-react'
import { ProposalDetailView } from './series-manager/ProposalDetailView'
import { Badge, Button, Card, CardContent, Input, Tabs, Textarea } from '../ui'
import { ebAPI, dashboardAPI, chaptersAPI, meetingAPI, authAPI, rubricTemplateAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'

const DEFAULT_CRITERIA = [
  { key: 'artStyle', label: 'Art Style' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'characterDesign', label: 'Character Design' },
  { key: 'pacing', label: 'Pacing & Layout' },
  { key: 'commercialPotential', label: 'Commercial Potential' }
]

/* ────────────────────────────────────── types ── */
type SeriesItem = {
  _id: string
  title: string
  description: string
  genre: string[]
  coverImage?: string
  status: string
  mangakaId: { _id: string; displayName: string; avatar?: string }
  totalChapters: number
  totalVotes: number
  weeklyVotes: number
  readerCount: number
  publicationSchedule?: string
  cancellationRisk?: boolean
  rank?: number
  createdAt: string
  updatedAt?: string
  rejectionNotes?: string
  script?: string
  scriptFile?: string
  characterDesigns?: {
    name: string
    role: string
    description?: string
    image?: string
  }[]
  // Vote aggregation
  votesFor?: number
  votesAgainst?: number
  userVote?: string | null
  userVoteRubric?: {
    artStyle: number
    storytelling: number
    characterDesign: number
    pacing: number
    commercialPotential: number
  } | null
  averageRubric?: {
    artStyle: number
    storytelling: number
    characterDesign: number
    pacing: number
    commercialPotential: number
    totalAverage: number
  } | null
  memberVotes?: Array<{
    _id: string
    member: { _id: string; displayName: string; avatar?: string; role: string }
    decision: string
    comments?: string
    rubric?: {
      artStyle: number
      storytelling: number
      characterDesign: number
      pacing: number
      commercialPotential: number
    }
    createdAt: string
  }>
  meeting?: {
    _id: string
    title: string
    dateTime: string
    participants: Array<{ _id: string; displayName: string; avatar?: string; role: string }>
    participantsCount: number
    votesCount: number
    isParticipant: boolean
  } | null
}

type ChapterItem = {
  _id: string
  chapterNumber: number
  title: string
  status: string
  totalPages: number
  progress: number
}

type RankingItem = SeriesItem & {
  rank: number
}

type DashboardStats = {
  pendingCount: number
  activeCount: number
  cancellationRiskCount: number
  totalDecisions: number
  overdueCount: number
}

interface MeetingParticipant {
  _id: string
  displayName: string
  email: string
  avatar?: string
  role: string
}

interface MeetingSeries {
  _id: string
  title: string
  coverImage?: string
}

interface MeetingItem {
  _id: string
  title: string
  description?: string
  dateTime: string
  location: string
  seriesId?: MeetingSeries
  seriesIds?: MeetingSeries[]
  participants: MeetingParticipant[]
  createdBy: {
    _id: string
    displayName: string
    avatar?: string
    role: string
  }
  isUpcoming?: boolean
}

interface ReviewerItem {
  _id: string
  displayName: string
  email: string
  avatar?: string
  role: string
}

/* ──────────────────────────────────── component ── */
export function EditorialBoardPortalPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'

  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    setSearchParams(params)
  }
  const [pendingSeries, setPendingSeries] = useState<SeriesItem[]>([])
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  // Details inspection state
  const [inspectSeriesId, setInspectSeriesId] = useState<string | null>(null)
  const [inspectChapters, setInspectChapters] = useState<ChapterItem[]>([])
  const [loadingChapters, setLoadingChapters] = useState(false)

  const handleToggleInspect = async (seriesId: string) => {
    if (inspectSeriesId === seriesId) {
      setInspectSeriesId(null)
      setInspectChapters([])
      return
    }

    setInspectSeriesId(seriesId)
    setLoadingChapters(true)
    try {
      const res = await chaptersAPI.getBySeries(seriesId)
      setInspectChapters(res.data.chapters || [])
    } catch (err) {
      console.error('Failed to load chapters for inspect:', err)
      setInspectChapters([])
    } finally {
      setLoadingChapters(false)
    }
  }

  // Dashboard state
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({ pendingCount: 0, activeCount: 0, cancellationRiskCount: 0, totalDecisions: 0, overdueCount: 0 })
  const [atRiskSeries, setAtRiskSeries] = useState<SeriesItem[]>([])
  const [recentDecisions, setRecentDecisions] = useState<SeriesItem[]>([])
  const [lowRatingChapters, setLowRatingChapters] = useState<Array<{
    chapterId: string
    chapterNumber: number
    chapterTitle: string
    avgRating: number
    ratingCount: number
    series: { _id: string; title: string; coverImage?: string; mangakaId?: { displayName: string } }
  }>>([])

  // Voting state (with rubric criteria 1-10)
  const [votingSeriesId, setVotingSeriesId] = useState<string | null>(null)
  const [voteComments, setVoteComments] = useState('')
  const [activeTemplate, setActiveTemplate] = useState<any>(null)
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({})
  const [submittingVote, setSubmittingVote] = useState(false)

  // Overdue chapters state
  const [overdueChapters, setOverdueChapters] = useState<any[]>([])

  // Final Decision state
  const [decisionSeriesId, setDecisionSeriesId] = useState<string | null>(null)
  const [decisionSchedule, setDecisionSchedule] = useState<'weekly' | 'monthly'>('weekly')
  const [submittingDecision, setSubmittingDecision] = useState(false)

  // Schedule decision state
  const [scheduleSeriesId, setScheduleSeriesId] = useState<string | null>(null)
  const [selectedSchedule, setSelectedSchedule] = useState<'weekly' | 'monthly'>('weekly')

  // Cancel state
  const [cancelSeriesId, setCancelSeriesId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')

  // Input reader votes state
  const [inputVotesSeriesId, setInputVotesSeriesId] = useState<string | null>(null)
  const [inputVotesCount, setInputVotesCount] = useState('')

  // Expanded series for details
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Meetings schedule state
  const [meetings, setMeetings] = useState<MeetingItem[]>([])
  const [showMeetingForm, setShowMeetingForm] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDesc, setMeetingDesc] = useState('')
  const [meetingDateTime, setMeetingDateTime] = useState('')
  const [meetingLoc, setMeetingLoc] = useState('')
  const [meetingSeriesIds, setMeetingSeriesIds] = useState<string[]>([])
  const [meetingParticipants, setMeetingParticipants] = useState<string[]>([])
  const [meetingRubricTemplateId, setMeetingRubricTemplateId] = useState('')
  const [availableReviewers, setAvailableReviewers] = useState<ReviewerItem[]>([])
  const [submittingMeeting, setSubmittingMeeting] = useState(false)

  // Rubrics template management states
  const [rubricTemplates, setRubricTemplates] = useState<any[]>([])
  const [showCreateRubricModal, setShowCreateRubricModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateCriteria, setNewTemplateCriteria] = useState<Array<{ key: string; label: string }>>([
    { key: 'artStyle', label: 'Art Style' },
    { key: 'storytelling', label: 'Storytelling' }
  ])
  const [submittingTemplate, setSubmittingTemplate] = useState(false)

  const tabs = [
    { key: 'dashboard', label: t('editorialBoard.dashboard'), icon: <LayoutDashboard className="size-3.5" /> },
    { key: 'votes', label: t('editorialBoard.pendingVotes'), icon: <Gavel className="size-3.5" />, count: pendingSeries.length },
    { key: 'meetings', label: t('editorialBoard.meetingsTab', 'Meetings'), icon: <Calendar className="size-3.5" /> },
    { key: 'rankings', label: t('editorialBoard.seriesRankings'), icon: <Trophy className="size-3.5" /> },
    { key: 'input', label: t('editorialBoard.inputVotes'), icon: <BarChart3 className="size-3.5" /> },
    ...(user?.isEbHead ? [{ key: 'rubrics', label: 'Rubric Criteria', icon: <Palette className="size-3.5" /> }] : []),
  ]

  /* ── data fetching ── */
  const fetchData = useCallback(async () => {
    try {
      const [pendingRes, rankingsRes, dashboardRes, meetingsRes, rubricsRes] = await Promise.all([
        ebAPI.getPending().catch(() => ({ data: { series: [], activeTemplate: null } })),
        dashboardAPI.getRankings().catch(() => ({ data: { rankings: [] } })),
        ebAPI.getDashboard().catch(() => ({ data: { stats: { pendingCount: 0, activeCount: 0, cancellationRiskCount: 0, totalDecisions: 0, overdueCount: 0 }, atRiskSeries: [], recentDecisions: [], overdueChapters: [] } })),
        meetingAPI.getAll().catch(() => ({ data: { meetings: [] } })),
        rubricTemplateAPI.getAll().catch(() => ({ data: { rubrics: [] } })),
      ])

      setPendingSeries(pendingRes.data.series || [])
      setActiveTemplate(pendingRes.data.activeTemplate || null)
      setRubricTemplates(rubricsRes.data?.rubrics || [])

      const rankedSeries = (rankingsRes.data.rankings || []).map((s: SeriesItem, idx: number) => ({
        ...s,
        rank: idx + 1,
      }))
      setRankings(rankedSeries)

      setDashboardStats(dashboardRes.data.stats || { pendingCount: 0, activeCount: 0, cancellationRiskCount: 0, totalDecisions: 0, overdueCount: 0 })
      setAtRiskSeries(dashboardRes.data.atRiskSeries || [])
      setRecentDecisions(dashboardRes.data.recentDecisions || [])
      setLowRatingChapters(dashboardRes.data.lowRatingChapters || [])
      setOverdueChapters(dashboardRes.data.overdueChapters || [])
      
      const formattedMeetings: MeetingItem[] = (meetingsRes.data.meetings || []).map((m: MeetingItem) => ({
        ...m,
        isUpcoming: new Date(m.dateTime).getTime() > Date.now(),
      }))
      setMeetings(formattedMeetings)
    } catch (err) {
      console.error('Failed to fetch EB data:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  /* ── actions ── */
  const handleVote = async (seriesId: string, decision: 'approved' | 'rejected') => {
    setSubmittingVote(true)
    try {
      await ebAPI.castVote(seriesId, {
        decision,
        comments: voteComments,
        rubric: rubricScores,
      })
      setVotingSeriesId(null)
      setVoteComments('')
      setRubricScores({})
      fetchData()
    } catch (err) {
      console.error('Failed to cast vote:', err)
    } finally {
      setSubmittingVote(false)
    }
  }

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!meetingTitle || !meetingDateTime || meetingParticipants.length === 0) return

    const uniqueCount = new Set([...meetingParticipants, user?._id]).size
    if (uniqueCount % 2 === 0) {
      alert(t('editorialBoard.evenParticipantsError', 'The total number of participants (including yourself as the organizer) must be an odd number to avoid voting ties. Current count: ' + uniqueCount + '.'))
      return
    }

    setSubmittingMeeting(true)
    try {
      await meetingAPI.create({
        title: meetingTitle,
        description: meetingDesc,
        dateTime: meetingDateTime,
        location: meetingLoc,
        seriesIds: meetingSeriesIds,
        participants: meetingParticipants,
        rubricTemplateId: meetingRubricTemplateId || undefined,
      })
      setShowMeetingForm(false)
      // Reset form
      setMeetingTitle('')
      setMeetingDesc('')
      setMeetingDateTime('')
      setMeetingLoc('')
      setMeetingSeriesIds([])
      setMeetingParticipants([])
      setMeetingRubricTemplateId('')
      fetchData()
    } catch (err: any) {
      console.error('Failed to create meeting:', err)
      alert(err.response?.data?.error || 'Failed to create meeting.')
    } finally {
      setSubmittingMeeting(false)
    }
  }

  const handleDeleteMeeting = async (id: string) => {
    if (!window.confirm(t('editorialBoard.confirmCancelMeeting'))) return
    try {
      await meetingAPI.delete(id)
      fetchData()
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

  const handleOpenVote = (series: SeriesItem) => {
    setVotingSeriesId(series._id)
    setDecisionSeriesId(null)
    setVoteComments('')
    
    const initialScores: Record<string, number> = {}
    const seriesTemplate = (series as any).rubricTemplate || activeTemplate
    const criteria = seriesTemplate ? seriesTemplate.criteria : DEFAULT_CRITERIA
    criteria.forEach((c: any) => {
      initialScores[c.key] = (series.userVoteRubric as any)?.[c.key] || 5
    })
    setRubricScores(initialScores)
  }

  const handleFinalDecision = async (seriesId: string, decision: 'approved' | 'rejected') => {
    setSubmittingDecision(true)
    try {
      await ebAPI.makeFinalDecision(seriesId, {
        decision,
        publicationSchedule: decision === 'approved' ? decisionSchedule : undefined,
      })
      setDecisionSeriesId(null)
      fetchData()
    } catch (err) {
      console.error('Failed to make final decision:', err)
    } finally {
      setSubmittingDecision(false)
    }
  }

  const handleSetSchedule = async (seriesId: string) => {
    try {
      await ebAPI.makeFinalDecision(seriesId, {
        decision: 'approved',
        publicationSchedule: selectedSchedule,
      })
      setScheduleSeriesId(null)
      fetchData()
    } catch (err) {
      console.error('Failed to set schedule:', err)
    }
  }

  const handleCancelSeries = async (seriesId: string) => {
    try {
      await ebAPI.cancelSeries(seriesId, { reason: cancelReason })
      setCancelSeriesId(null)
      setCancelReason('')
      fetchData()
    } catch (err) {
      console.error('Failed to cancel series:', err)
    }
  }

  const handleInputVotes = async (seriesId: string) => {
    const count = parseInt(inputVotesCount)
    if (isNaN(count) || count < 0) return
    try {
      await ebAPI.inputReaderVotes(seriesId, { weeklyVotes: count })
      setInputVotesSeriesId(null)
      setInputVotesCount('')
      fetchData()
    } catch (err) {
      console.error('Failed to input votes:', err)
    }
  }

  const loadRubricTemplates = async () => {
    try {
      const res = await rubricTemplateAPI.getAll()
      setRubricTemplates(res.data.templates || [])
    } catch (err) {
      console.error('Failed to load rubric templates:', err)
    }
  }

  const handleActivateTemplate = async (id: string) => {
    try {
      await rubricTemplateAPI.activate(id)
      alert('Rubric template activated successfully!')
      await loadRubricTemplates()
      await fetchData()
    } catch (err) {
      console.error('Failed to activate template:', err)
      alert('Failed to activate template.')
    }
  }

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTemplateName.trim() || newTemplateCriteria.length === 0) return
    setSubmittingTemplate(true)
    try {
      await rubricTemplateAPI.create({
        name: newTemplateName,
        criteria: newTemplateCriteria
      })
      setNewTemplateName('')
      setNewTemplateCriteria([
        { key: 'artStyle', label: 'Art Style' },
        { key: 'storytelling', label: 'Storytelling' }
      ])
      setShowCreateRubricModal(false)
      await loadRubricTemplates()
    } catch (err) {
      console.error('Failed to create template:', err)
      alert('Failed to create template.')
    } finally {
      setSubmittingTemplate(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'rubrics') {
      Promise.resolve().then(() => {
        loadRubricTemplates()
      })
    }
  }, [activeTab])

  /* ── helpers ── */
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 shadow-3xs"><Medal className="size-3.5 text-amber-500 shrink-0 fill-amber-100" /> Top 1</span>
    if (rank === 2) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 shadow-3xs"><Medal className="size-3.5 text-slate-500 shrink-0 fill-slate-100" /> Top 2</span>
    if (rank === 3) return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-amber-800 bg-amber-100/50 border border-amber-200 shadow-3xs"><Medal className="size-3.5 text-amber-700 shrink-0 fill-amber-50" /> Top 3</span>
    return <span className="inline-flex items-center justify-center size-6 rounded-full text-xs font-bold text-neutral-500 bg-neutral-100 border border-neutral-200/50">#{rank}</span>
  }

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      Cancelled: 'bg-red-50 text-red-600 border-red-200',
      Draft: 'bg-neutral-100 text-neutral-600 border-neutral-200',
      Pending_EB: 'bg-amber-50 text-amber-700 border-amber-200',
    }
    return map[status] || 'bg-neutral-100 text-neutral-600 border-neutral-200'
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
          <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-200">
            <Gavel className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-950">{t('editorialBoard.title')}</h1>
            <p className="text-sm text-neutral-500">{t('editorialBoard.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: t('editorialBoard.pendingVotes'), value: dashboardStats.pendingCount, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
          { label: t('editorialBoard.activeSeries'), value: dashboardStats.activeCount, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
          { label: t('editorialBoard.cancellationRisk'), value: dashboardStats.cancellationRiskCount, icon: AlertTriangle, gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-200' },
          { label: 'Overdue Publishing', value: dashboardStats.overdueCount || 0, icon: Clock, gradient: 'from-rose-600 to-red-650', shadow: 'shadow-rose-200' },
          { label: t('editorialBoard.myDecisions'), value: dashboardStats.totalDecisions, icon: Trophy, gradient: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-200' },
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

      {/* ────── DASHBOARD TAB ────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* At-risk series section */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b border-neutral-100 bg-gradient-to-r from-red-50/50 to-orange-50/30 px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-red-500" />
                  <h3 className="text-sm font-semibold text-neutral-950">{t('editorialBoard.lowVotedAlert')}</h3>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">{t('editorialBoard.lowVotedAlertHint')}</p>
              </div>

              {atRiskSeries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 grid size-14 place-items-center rounded-full bg-emerald-50">
                    <TrendingUp className="size-6 text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700">{t('editorialBoard.noAtRisk')}</p>
                  <p className="mt-1 text-xs text-neutral-400">{t('editorialBoard.noAtRiskHint')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50/80">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.series')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.weeklyVotes')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.publicationSchedule')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.status')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskSeries.map((series) => (
                        <tr key={series._id} className="border-b border-neutral-50 bg-red-50/20 transition-colors hover:bg-red-50/40">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-red-100">
                                <BookOpen className="size-4 text-red-400" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-neutral-900">{series.title}</p>
                                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                    <AlertTriangle className="size-2.5" />
                                    {t('editorialBoard.atRisk')}
                                  </span>
                                </div>
                                <p className="text-xs text-neutral-400">{series.mangakaId?.displayName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 font-medium text-red-600">
                                <TrendingDown className="size-3.5" />
                                {series.weeklyVotes}
                              </span>
                              <div className="h-1 w-16 overflow-hidden rounded-full bg-red-100">
                                <div className="h-full w-[20%] animate-pulse bg-red-500" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-xs font-medium text-neutral-600">
                              {series.publicationSchedule ? t(`editorialBoard.${series.publicationSchedule}`) : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge className="bg-red-50 text-red-600 border-red-200">
                              {t('editorialBoard.cancellationRisk')}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {cancelSeriesId === series._id ? (
                                <div className="flex items-center gap-2">
                                  <Textarea
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder={t('editorialBoard.cancelReason')}
                                    className="min-h-[40px] w-48 rounded-lg text-xs"
                                  />
                                  <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={() => setCancelSeriesId(null)}>
                                    {t('common.cancel')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="gap-1 rounded-lg bg-red-600 text-xs text-white hover:bg-red-700"
                                    onClick={() => handleCancelSeries(series._id)}
                                    disabled={!cancelReason.trim()}
                                  >
                                    <Ban className="size-3" />
                                    {t('editorialBoard.confirmCancel')}
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 rounded-lg text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                    onClick={() => {
                                      setInputVotesSeriesId(series._id)
                                      setInputVotesCount(String(series.weeklyVotes || 0))
                                    }}
                                  >
                                    <BarChart3 className="size-3" />
                                    {t('editorialBoard.maintain')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 rounded-lg border border-red-200 !bg-red-50 text-xs !text-red-600 hover:!bg-red-100"
                                    onClick={() => setCancelSeriesId(series._id)}
                                  >
                                    <Ban className="size-3" />
                                    {t('editorialBoard.cancelSeries')}
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Input votes modal for at-risk series */}
          {inputVotesSeriesId && atRiskSeries.some(s => s._id === inputVotesSeriesId) && (
            <Card className="border-emerald-100">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-neutral-950">{t('editorialBoard.inputWeeklyVotes')}</h4>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    value={inputVotesCount}
                    onChange={(e) => setInputVotesCount(e.target.value)}
                    className="w-32 rounded-lg text-sm"
                    placeholder="0"
                  />
                  <Button size="sm" variant="ghost" className="rounded-lg text-xs" onClick={() => setInputVotesSeriesId(null)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                    onClick={() => handleInputVotes(inputVotesSeriesId)}
                  >
                    <Send className="size-3" />
                    {t('editorialBoard.submitVotes')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent decisions */}
          {recentDecisions.length > 0 && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b border-neutral-100 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Activity className="size-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-neutral-950">{t('editorialBoard.recentDecisions')}</h3>
                  </div>
                </div>
                <div className="divide-y divide-neutral-50">
                  {recentDecisions.map((series) => (
                    <div key={series._id} className="flex items-center justify-between px-5 py-3 transition-colors hover:bg-neutral-50/60">
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-100">
                          <BookOpen className="size-4 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{series.title}</p>
                          <p className="text-xs text-neutral-400">{series.mangakaId?.displayName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusBadge(series.status)}>
                          {series.publicationSchedule ? `${series.status} (${series.publicationSchedule})` : series.status}
                        </Badge>
                        {series.updatedAt && (
                          <span className="text-xs text-neutral-400">
                            {new Date(series.updatedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overdue Publication Deadlines Alerts */}
          {overdueChapters && overdueChapters.length > 0 && (
            <Card className="overflow-hidden border border-rose-200">
              <CardContent className="p-0">
                <div className="border-b border-neutral-100 bg-gradient-to-r from-rose-50/60 to-red-50/30 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-rose-500" />
                    <h3 className="text-sm font-semibold text-neutral-950">Overdue Publication Deadlines</h3>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                      {overdueChapters.length} chapters
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">Chapters that have missed their scheduled publication deadline. Review with Mangaka and Tantou Editor.</p>
                </div>
                <div className="divide-y divide-neutral-50">
                  {overdueChapters.map((item: any) => (
                    <div key={item._id} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-rose-50/10 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-50 border border-rose-100 text-rose-500">
                          <Clock className="size-4.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-neutral-900 truncate">
                            Ch.{item.chapterNumber}: {item.title}
                          </p>
                          <p className="text-xs text-neutral-550 truncate">{item.seriesId?.title || 'Unknown series'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-rose-650 bg-rose-50 border border-rose-150 px-2.5 py-1 rounded-lg">
                          Deadline: {new Date(item.publicationDeadline).toLocaleDateString()}
                        </span>
                        <Badge variant="default" className="text-[10px] uppercase text-neutral-450 border-neutral-200">
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Low Rating Alerts */}
          {lowRatingChapters.length > 0 && (
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="border-b border-neutral-100 bg-gradient-to-r from-amber-50/60 to-orange-50/30 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-neutral-950">Low Reader Rating Alerts</h3>
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                      {lowRatingChapters.length} chapters
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-500">Published chapters with average reader rating below 3 stars. Consider reviewing with the responsible Tantou editor.</p>
                </div>
                <div className="divide-y divide-neutral-50">
                  {lowRatingChapters.map((item) => (
                    <div key={item.chapterId} className="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/30 transition-colors">
                      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100">
                        <BookOpen className="size-4 text-amber-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          Ch.{item.chapterNumber}: {item.chapterTitle}
                        </p>
                        <p className="text-xs text-neutral-500 truncate">{item.series?.title || 'Unknown series'}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`size-3.5 ${s <= Math.round(item.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-neutral-200'}`} />
                          ))}
                          <span className="ml-1 text-xs font-bold text-amber-600">{item.avgRating}/5</span>
                        </div>
                        <span className="text-[10px] text-neutral-400">{item.ratingCount} ratings</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ────── PENDING VOTES TAB ────── */}
      {activeTab === 'votes' && (
        <div className="space-y-4">
          {pendingSeries.length === 0 ? (
            <Card className="rounded-2xl border border-neutral-100 bg-white">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-neutral-50 border border-neutral-100 text-neutral-400">
                  <Gavel className="size-8" />
                </div>
                <p className="text-sm font-bold text-neutral-800">{t('editorialBoard.noPending')}</p>
                <p className="mt-1 text-xs text-neutral-400 max-w-sm">{t('editorialBoard.noPendingHint')}</p>
              </CardContent>
            </Card>
          ) : (
            pendingSeries.map((series) => (
              <Card key={series._id} className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col lg:flex-row">
                    {/* Cover & General Metadata */}
                    <div className="flex flex-col sm:flex-row flex-1 p-6 gap-6">
                      {/* Cover Card */}
                      <div className="relative h-60 w-full sm:w-44 shrink-0 overflow-hidden rounded-2xl border border-neutral-150 bg-neutral-50 shadow-sm transition-transform duration-300 hover:scale-[1.02]">
                        {series.coverImage ? (
                          <img src={series.coverImage} alt={series.title} className="size-full object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center">
                            <BookOpen className="size-12 text-neutral-300" />
                          </div>
                        )}
                      </div>

                      {/* Info & Details */}
                      <div className="flex flex-1 flex-col justify-between text-left">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-neutral-900 leading-tight">{series.title}</h3>
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold px-2 py-0.5 rounded-full text-[10px]">
                              {t('editorialBoard.awaitingVote', 'Awaiting Vote')}
                            </Badge>
                            {series.userVote && (
                              <Badge className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                                series.userVote === 'approved' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                                  : 'bg-rose-50 text-rose-600 border-rose-200'
                              }`}>
                                  {series.userVote === 'approved' ? (
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="size-3" />
                                      <span>Voted Approve</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <X className="size-3" />
                                      <span>Voted Reject</span>
                                    </span>
                                  )}
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-neutral-505 leading-relaxed max-w-2xl">{series.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-500 font-semibold">
                            <span className="flex items-center gap-1.5"><User className="size-3.5 text-neutral-400 shrink-0" /> by {series.mangakaId?.displayName}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="flex items-center gap-1.5"><Tag className="size-3.5 text-neutral-400 shrink-0" /> {series.genre?.join(', ')}</span>
                            <span className="text-neutral-300">•</span>
                            <span className="flex items-center gap-1.5"><BookOpen className="size-3.5 text-neutral-400 shrink-0" /> {series.totalChapters} chapters</span>
                          </div>
                        </div>

                        {/* Inspect details button */}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full text-neutral-600 hover:text-neutral-900 text-xs font-semibold rounded-xl h-8 gap-1 border border-neutral-100 hover:bg-neutral-50 mt-2"
                          onClick={() => handleToggleInspect(series._id)}
                        >
                          {inspectSeriesId === series._id ? (
                            <>
                              <ChevronUp className="size-3.5" />
                              Hide Draft Details
                            </>
                          ) : (
                            <>
                              <ChevronDown className="size-3.5" />
                              Inspect Chapters & Storyboard
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Action Block & Interactive Evaluation (Right Side or Collapsed) */}
                    <div className="w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l border-neutral-100 bg-neutral-50/40 p-6 flex flex-col justify-between">
                      {votingSeriesId === series._id ? (() => {
                        const seriesTemplate = (series as any).rubricTemplate || activeTemplate
                        const criteria = seriesTemplate?.criteria || DEFAULT_CRITERIA
                        let sum = 0
                        criteria.forEach((c: any) => {
                          sum += rubricScores[c.key] ?? 5
                        })
                        const currentAverage = criteria.length > 0 ? sum / criteria.length : 5
                        const autoDecision = currentAverage >= 5 ? 'approved' : 'rejected'

                        return (
                          <div className="space-y-4 text-left animate-in fade-in duration-200">
                            {/* Rubric sliders */}
                            <div className="space-y-3.5 bg-white p-4 rounded-2xl border border-neutral-150 shadow-2xs">
                              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center justify-between">
                                <span>{t('editorialBoard.rubricScores', 'Rubric Scores')}</span>
                                <span className="text-[10px] text-neutral-400 font-semibold bg-neutral-50 px-2 py-0.5 rounded border border-neutral-200">Max 10</span>
                              </h4>
                              
                              <div className="space-y-3">
                                {criteria.map((c: any) => {
                                  const score = rubricScores[c.key] ?? 5
                                  return (
                                    <div key={c.key} className="space-y-1">
                                      <div className="flex justify-between text-xs font-bold">
                                        <span className="text-neutral-700">{c.label}</span>
                                        <span className="text-indigo-600">{score}/10</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={score}
                                        onChange={(e) => {
                                          const val = parseInt(e.target.value)
                                          setRubricScores((prev) => ({ ...prev, [c.key]: val }))
                                        }}
                                        className="w-full cursor-pointer h-2 bg-neutral-250 rounded-lg appearance-none accent-indigo-600 focus:outline-none"
                                        style={{
                                          background: `linear-gradient(to right, var(--color-indigo-500) 0%, var(--color-indigo-500) ${score * 10}%, var(--color-neutral-200) ${score * 10}%, var(--color-neutral-200) 100%)`
                                        }}
                                      />
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            <Textarea
                              value={voteComments}
                              onChange={(e) => setVoteComments(e.target.value)}
                              placeholder={t('editorialBoard.commentPlaceholder', 'Write a review/feedback comment (optional)...')}
                              className="min-h-[70px] rounded-xl text-xs bg-white border-neutral-200 focus:border-indigo-500"
                            />

                            {/* Average & Auto Decision Indicator */}
                            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-neutral-150 shadow-2xs">
                              <div className="text-xs font-bold text-neutral-800">
                                {t('editorialBoard.averageScore', 'Average')}: <span className="text-indigo-600 text-sm font-extrabold">{currentAverage.toFixed(1)}/10</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Decision:</span>
                                {autoDecision === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-250">
                                    <ThumbsUp className="size-3" /> {t('editorialBoard.voteApprove', 'Approve')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                                    <ThumbsDown className="size-3" /> {t('editorialBoard.voteReject', 'Reject')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-xs px-3"
                                onClick={() => setVotingSeriesId(null)}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                className={`flex-1 gap-1.5 rounded-xl text-white font-bold transition-all duration-300 text-xs ${autoDecision === 'approved'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-200'
                                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-rose-700 shadow-md shadow-rose-200'
                                  }`}
                                onClick={() => handleVote(series._id, autoDecision)}
                                disabled={submittingVote}
                              >
                                {submittingVote ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : autoDecision === 'approved' ? (
                                  <ThumbsUp className="size-3.5" />
                                ) : (
                                  <ThumbsDown className="size-3.5" />
                                )}
                                {autoDecision === 'approved'
                                  ? t('editorialBoard.submitApproveVote', 'Submit Approve Vote')
                                  : t('editorialBoard.submitRejectVote', 'Submit Reject Vote')
                                }
                              </Button>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="space-y-3.5">
                          {/* Invitation or Warnings */}
                          {!series.meeting ? (
                            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-center font-semibold leading-relaxed flex items-center justify-center gap-1.5">
                              <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
                              <span>{t('editorialBoard.awaitingMeetingAlert', 'Awaiting scheduled review meeting before voting can start.')}</span>
                            </div>
                          ) : (
                            <div className="space-y-2 bg-indigo-50/30 border border-indigo-100 p-3.5 rounded-2xl text-xs text-left shadow-2xs">
                              <div className="flex justify-between text-indigo-955 font-bold items-center">
                                <span className="truncate max-w-[200px] flex items-center gap-1.5">
                                  <Calendar className="size-3.5 text-indigo-600 shrink-0" />
                                  Meeting: {series.meeting.title}
                                </span>
                                <span className="shrink-0">{new Date(series.meeting.dateTime).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between items-center text-neutral-500 font-semibold mt-1">
                                <span className="flex items-center gap-1.5">
                                  <Gavel className="size-3.5 text-indigo-500 shrink-0" />
                                  Cast: {series.meeting.votesCount} / {series.meeting.participantsCount} ({Math.round((series.meeting.votesCount / series.meeting.participantsCount) * 100)}%)
                                </span>
                                {series.meeting.isParticipant ? (
                                  <span className="text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 text-[10px] font-bold flex items-center gap-1">
                                    <CheckCircle2 className="size-2.5" />
                                    <span>Invited</span>
                                  </span>
                                ) : (
                                  <span className="text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100 text-[10px] font-bold flex items-center gap-1">
                                    <X className="size-2.5" />
                                    <span>Not invited</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-1 disabled:opacity-40 font-bold h-10 text-xs shadow-2xs"
                              onClick={() => handleOpenVote(series)}
                              disabled={!series.meeting || !series.meeting.isParticipant}
                            >
                              <Gavel className="size-4" />
                              {t('editorialBoard.castVote')}
                            </Button>

                            {user?.isEbHead && (
                              <Button
                                size="sm"
                                className="gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-750 flex-1 disabled:opacity-45 font-bold h-10 text-xs shadow-md shadow-indigo-100"
                                onClick={() => {
                                  setDecisionSeriesId(series._id)
                                  setVotingSeriesId(null)
                                }}
                                disabled={!series.meeting || series.meeting.votesCount < series.meeting.participantsCount}
                              >
                                <Trophy className="size-4" />
                                {t('editorialBoard.endVote')}
                              </Button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Vote Aggregation Display & Rubric Scorecard */}
                      <div className="mt-4 rounded-2xl bg-white border border-neutral-150 p-4 space-y-4 shadow-2xs">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs font-bold">
                            <span className="text-emerald-700 flex items-center gap-1.5"><ThumbsUp className="size-3.5" /> {series.votesFor || 0} {t('editorialBoard.votesFor')}</span>
                            <span className="text-rose-700 flex items-center gap-1.5">{series.votesAgainst || 0} {t('editorialBoard.votesAgainst')} <ThumbsDown className="size-3.5" /></span>
                          </div>
                          <div className="h-2 flex overflow-hidden rounded-full bg-neutral-100 border border-neutral-200/40">
                            <div
                              className="bg-emerald-500 transition-all duration-500"
                              style={{ width: `${((series.votesFor || 0) / Math.max((series.votesFor || 0) + (series.votesAgainst || 0), 1)) * 100}%` }}
                            />
                            <div
                              className="bg-rose-500 transition-all duration-500"
                              style={{ width: `${((series.votesAgainst || 0) / Math.max((series.votesFor || 0) + (series.votesAgainst || 0), 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        {series.averageRubric && (
                          <div className="mt-3 border-t border-neutral-100 pt-3 space-y-3.5">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                                {t('editorialBoard.rubricScorecard')}
                              </h4>
                              <div className="bg-indigo-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-sm">
                                {t('editorialBoard.averageScore')}: {series.averageRubric.totalAverage}/10
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2.5 text-[11px]">
                              {(activeTemplate?.criteria || DEFAULT_CRITERIA).map((c: any) => {
                                const val = (series.averageRubric as any)?.[c.key] || 0
                                return (
                                  <div key={c.key} className="space-y-1">
                                    <div className="flex justify-between font-bold text-neutral-600">
                                      <span>{c.label}</span>
                                      <span className="text-indigo-600">{val.toFixed(1)}/10</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden border border-neutral-200/30">
                                      <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${val * 10}%` }} />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {series.memberVotes && series.memberVotes.length > 0 && (
                              <div className="mt-2 border-t border-neutral-100 pt-3">
                                <details className="group">
                                  <summary className="flex items-center justify-between cursor-pointer text-xs font-bold text-indigo-600 select-none hover:text-indigo-800">
                                    <span>{t('editorialBoard.memberScoresBreakdown')} ({series.memberVotes.length})</span>
                                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                                  </summary>
                                  <div className="mt-3 space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                    {series.memberVotes.map((mv) => (
                                      <div key={mv._id} className="flex gap-3 p-3 bg-neutral-50 border border-neutral-150 rounded-xl text-left shadow-3xs">
                                        <div className="size-8 shrink-0 rounded-full bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                          {mv.member?.displayName?.[0] || '?'}
                                        </div>
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-xs text-neutral-800 truncate">{mv.member?.displayName}</span>
                                            <Badge className={`font-bold px-2 py-0.5 rounded-full text-[9px] shrink-0 ${
                                              mv.decision === 'approved' 
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                                : 'bg-rose-50 text-rose-600 border-rose-200'
                                            }`}>
                                              {mv.decision === 'approved' ? 'Approve' : 'Reject'}
                                            </Badge>
                                          </div>
                                          {mv.rubric && (
                                            <div className="text-[9px] text-neutral-500 font-semibold flex flex-wrap gap-x-2.5 gap-y-0.5 py-1 border-t border-dashed border-neutral-200 items-center">
                                              {(activeTemplate?.criteria || DEFAULT_CRITERIA).map((c: any) => (
                                                <span key={c.key} className="flex items-center gap-0.5">
                                                  <Palette className="size-2.5 text-neutral-400 shrink-0" />
                                                  {c.label}: {(mv.rubric as any)?.[c.key] ?? 5}
                                                </span>
                                              ))}
                                            </div>
                                          )}
                                          {mv.comments && (
                                            <p className="text-[10px] text-neutral-600 font-medium italic bg-white p-2 rounded-lg border border-neutral-150 leading-normal">
                                              "{mv.comments}"
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Inspection Section */}
                  {inspectSeriesId === series._id && (
                    <div className="border-t border-neutral-150 p-6 bg-neutral-50/20 text-left space-y-5 animate-in fade-in duration-200">
                      {/* Interactive Script & Character Designs Inspection */}
                      <div className="p-4 bg-white border border-neutral-200 rounded-2xl shadow-3xs">
                        <ProposalDetailView
                          script={series.script}
                          scriptFile={series.scriptFile}
                          characterDesigns={series.characterDesigns}
                        />
                      </div>

                      {/* Submitted Chapters */}
                      <div className="space-y-3 pt-2">
                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-widest block">
                          {t('editorialBoard.submittedChapters', 'Submitted Chapters & Storyboard')}
                        </span>

                        {loadingChapters ? (
                          <div className="flex items-center gap-2 text-xs text-neutral-500 py-4 justify-center">
                            <Loader2 className="size-4 animate-spin text-neutral-800" />
                            <span>Loading chapters...</span>
                          </div>
                        ) : inspectChapters.length === 0 ? (
                          <p className="text-xs text-neutral-500 py-4 text-center bg-white border border-neutral-200 rounded-2xl">
                            No chapters uploaded for this series draft yet.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                            {inspectChapters.map((chapter) => (
                              <div key={chapter._id} className="flex items-center justify-between gap-4 p-3 rounded-2xl bg-white border border-neutral-150 text-xs shadow-3xs hover:border-neutral-300 transition-colors">
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-neutral-850 truncate">
                                    Ch. {chapter.chapterNumber}: {chapter.title}
                                  </p>
                                  <p className="text-[10px] font-medium text-neutral-505 mt-0.5">
                                    {chapter.totalPages || 0} Pages · {chapter.progress || 0}% Done · Status: <span className="font-bold text-indigo-600">{chapter.status}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    size="sm"
                                    className="h-8 px-3 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-bold rounded-xl gap-1"
                                    onClick={() => navigate(`/editor/review/${chapter._id}`)}
                                  >
                                    Audit
                                    <ChevronRight className="size-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Final Decision Form (End Vote / Kết thúc vote) */}
                  {decisionSeriesId === series._id && (() => {
                    const votesFor = series.votesFor || 0
                    const votesAgainst = series.votesAgainst || 0
                    const isApprovedByVotes = votesFor >= votesAgainst

                    return (
                      <div className="border-t border-indigo-100 bg-indigo-50/20 p-6 animate-in fade-in duration-305 text-left">
                        <div className="max-w-xl space-y-4">
                          <div>
                            <h4 className="text-sm font-bold text-indigo-955 flex items-center gap-1.5">
                              <Trophy className="size-4 text-indigo-600" />
                              {t('editorialBoard.endVoteAndDecision')}
                            </h4>
                            <p className="text-xs text-indigo-850 font-semibold leading-normal mt-1">
                              {t('editorialBoard.currentVoteResult')}{" "}
                              <strong className={isApprovedByVotes ? "text-emerald-700" : "text-rose-700"}>
                                {isApprovedByVotes ? t('editorialBoard.passedApproved') : t('editorialBoard.failedRejected')}
                              </strong>
                              {` (${votesFor} / ${votesAgainst} ${t('editorialBoard.votesLabel')})`}
                            </p>
                          </div>

                          {isApprovedByVotes ? (
                            <div className="space-y-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-indigo-955">
                                  {t('editorialBoard.publicationSchedule')}
                                </label>
                                <div className="flex gap-2 max-w-sm">
                                  {(['weekly', 'monthly'] as const).map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => setDecisionSchedule(s)}
                                      className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${decisionSchedule === s
                                        ? 'bg-indigo-600 text-white shadow-sm border border-indigo-650'
                                        : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-neutral-200 hover:border-indigo-200'
                                        }`}
                                    >
                                      {t(`editorialBoard.${s}`)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl border border-neutral-200 hover:bg-neutral-100 px-4"
                                  onClick={() => setDecisionSeriesId(null)}
                                >
                                  {t('common.cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  className="gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-200 font-bold px-4 h-9"
                                  onClick={() => handleFinalDecision(series._id, 'approved')}
                                  disabled={submittingDecision}
                                >
                                  {submittingDecision ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                  {t('editorialBoard.approveAndPublishMajority')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div>
                                <label className="mb-1.5 block text-xs font-bold text-indigo-955">
                                  {t('editorialBoard.rejectionReasonFeedback')}
                                </label>
                                <Textarea
                                  value={voteComments}
                                  onChange={(e) => setVoteComments(e.target.value)}
                                  placeholder={t('editorialBoard.stateRejectionReasonPlaceholder')}
                                  className="min-h-[75px] rounded-xl text-xs bg-white border-neutral-200 focus:border-rose-500"
                                />
                              </div>
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="rounded-xl border border-neutral-200 hover:bg-neutral-100 px-4"
                                  onClick={() => setDecisionSeriesId(null)}
                                >
                                  {t('common.cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-105 font-bold px-4 h-9"
                                  onClick={() => handleFinalDecision(series._id, 'rejected')}
                                  disabled={submittingDecision}
                                >
                                  {submittingDecision ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                                  {t('editorialBoard.rejectManuscriptMajority')}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ────── MEETINGS TAB ────── */}
      {activeTab === 'meetings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
              {t('editorialBoard.upcomingMeetings')}
            </h2>
            {user?.isEbHead ? (
              <Button
                onClick={handleOpenMeetingForm}
                className="gap-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-semibold py-2 px-3 shadow-md"
              >
                <Calendar className="size-4" />
                {t('editorialBoard.scheduleMeeting')}
              </Button>
            ) : (
              <span className="text-xs text-neutral-400 italic font-medium">
                View-only (Only the EB Head can schedule meetings)
              </span>
            )}
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
                      onChange={(e) => setMeetingTitle(e.target.value)}
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
                      onChange={(e) => setMeetingDateTime(e.target.value)}
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
                      onChange={(e) => setMeetingLoc(e.target.value)}
                      placeholder="Google Meet link or Room 302"
                      className="rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1 text-left">
                    <label className="text-xs font-bold text-neutral-700">Evaluation Rubric Template</label>
                    <select
                      className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-white focus:border-indigo-500 font-medium cursor-pointer shadow-3xs"
                      value={meetingRubricTemplateId}
                      onChange={(e) => setMeetingRubricTemplateId(e.target.value)}
                    >
                      <option value="">Default Active Rubric</option>
                      {rubricTemplates.map((tpl: any) => (
                        <option key={tpl._id} value={tpl._id}>
                          {tpl.name} ({tpl.criteria?.length} categories)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700 block">
                      {t('editorialBoard.selectRelatedSeries')} <span className="text-indigo-600">({meetingSeriesIds.length} selected)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-32 overflow-y-auto p-2 bg-white border border-neutral-200 rounded-xl">
                      {[
                        ...pendingSeries.map((s) => ({ _id: s._id, title: `[Draft] ${s.title}` })),
                        ...rankings.map((s) => ({ _id: s._id, title: `[Active] ${s.title}` })),
                      ].map((s) => {
                        const isSelected = meetingSeriesIds.includes(s._id)
                        return (
                          <div
                            key={s._id}
                            onClick={() => {
                              setMeetingSeriesIds((prev) =>
                                prev.includes(s._id) ? prev.filter((id) => id !== s._id) : [...prev, s._id]
                              )
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all text-xs ${
                              isSelected
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold'
                                : 'border-neutral-100 hover:bg-neutral-50 text-neutral-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              readOnly
                              className="accent-indigo-650"
                            />
                            <span className="truncate">{s.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.meetingDescription')}</label>
                  <Textarea
                    value={meetingDesc}
                    onChange={(e) => setMeetingDesc(e.target.value)}
                    placeholder="Brief agenda details..."
                    className="min-h-[60px] rounded-xl text-xs bg-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-700 block">
                    {t('editorialBoard.selectParticipants')} <span className="text-indigo-600">({meetingParticipants.length} selected)</span>
                  </label>
                  {/* Odd number participant validation feedback */}
                  {new Set([...meetingParticipants, user?._id]).size % 2 === 0 && (
                    <p className="text-[10px] font-semibold text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100 mb-1">
                      ⚠️ Current total participants (including you): {new Set([...meetingParticipants, user?._id]).size} (Even). Please select an odd number of total participants to prevent voting ties.
                    </p>
                  )}
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
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all text-xs ${isSelected
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
            <Card className="rounded-2xl border border-neutral-100 bg-white">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-neutral-50 border border-neutral-100 text-neutral-400">
                  <Calendar className="size-8" />
                </div>
                <p className="text-sm font-bold text-neutral-800">{t('editorialBoard.noMeetings')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {meetings.map((m) => {
                const isUpcoming = !!m.isUpcoming
                const meetingDate = new Date(m.dateTime)
                const monthName = meetingDate.toLocaleString('default', { month: 'short' })
                const dayNum = meetingDate.getDate()
                return (
                  <Card key={m._id} className="p-6 flex flex-col justify-between border border-neutral-200/80 hover:border-neutral-300 transition-all rounded-2xl bg-white shadow-xs relative">
                    <div className="space-y-4">
                      <div className="flex gap-4 text-left">
                        {/* Calendar date card */}
                        <div className="flex flex-col items-center justify-center size-16 shrink-0 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold select-none">
                          <span className="text-[10px] uppercase tracking-wider">{monthName}</span>
                          <span className="text-2xl font-black leading-none mt-0.5">{dayNum}</span>
                        </div>

                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-extrabold text-sm text-neutral-900 tracking-tight leading-snug truncate">{m.title}</h3>
                            <Badge className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isUpcoming ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                            }`}>
                              {isUpcoming ? 'Upcoming' : 'Past'}
                            </Badge>
                          </div>
                          {m.description && <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{m.description}</p>}
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-neutral-600 border-t border-neutral-100 pt-3 text-left font-semibold">
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
                        {m.seriesIds && m.seriesIds.length > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <BookOpen className="size-3.5 text-indigo-500 shrink-0 mt-0.5" />
                              <div className="flex flex-col">
                                <span className="font-bold text-neutral-400 text-[10px] uppercase tracking-wider">Related Series:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {m.seriesIds.map((sObj: any) => (
                                    <span key={sObj._id} className="bg-indigo-50/50 border border-indigo-150 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-[10px]">
                                      {sObj.title}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : m.seriesId ? (
                          <div className="flex items-center gap-2">
                            <BookOpen className="size-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-neutral-800">
                              Series: {m.seriesId?.title || 'Unknown Series'}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-2 border-t border-neutral-100 pt-3 text-left">
                        <span className="text-[10px] font-extrabold text-neutral-400 uppercase tracking-wider block">
                          Invited Participants ({m.participants?.length || 0})
                        </span>
                        <div className="flex items-center gap-3">
                          {/* Avatar stack */}
                          <div className="flex -space-x-2 overflow-hidden">
                            {m.participants?.slice(0, 5).map((p: MeetingParticipant) => (
                              <div
                                key={p._id}
                                title={`${p.displayName} (${p.role.replace('_', ' ')})`}
                                className="size-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center shadow-sm select-none"
                              >
                                {p.displayName?.[0] || '?'}
                              </div>
                            ))}
                            {m.participants && m.participants.length > 5 && (
                              <div className="size-8 rounded-full bg-neutral-105 border-2 border-white text-neutral-600 text-[10px] font-bold flex items-center justify-center shadow-sm select-none">
                                +{m.participants.length - 5}
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-500 font-semibold truncate max-w-[200px]">
                            {m.participants?.map(p => p.displayName).join(', ')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-5 pt-3 border-t border-neutral-100 text-[10px] text-neutral-400 font-medium">
                      <span>Scheduled by {m.createdBy?.displayName}</span>
                      {user?.isEbHead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMeeting(m._id)}
                          className="text-rose-600 hover:bg-rose-50 h-8 px-3 rounded-xl font-bold border border-rose-100 hover:border-rose-250"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ────── RANKINGS TAB ────── */}
      {activeTab === 'rankings' && (
        <div className="space-y-4">
          {rankings.length === 0 ? (
            <Card className="rounded-2xl border border-neutral-100 bg-white">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-neutral-50 border border-neutral-100 text-neutral-400">
                  <Trophy className="size-8 text-neutral-450" />
                </div>
                <p className="text-sm font-bold text-neutral-800">{t('editorialBoard.noRankings')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rankings Table */}
              <Card className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50/80 text-left">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">{t('editorialBoard.rank')}</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-neutral-400">{t('editorialBoard.series')}</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">{t('editorialBoard.weeklyVotes')}</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">{t('editorialBoard.totalVotes')}</th>
                        <th className="px-6 py-4 text-center text-xs font-bold uppercase tracking-wider text-neutral-400">{t('editorialBoard.status')}</th>
                        <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-neutral-400">{t('editorialBoard.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((series) => {
                        const isExpanded = expandedId === series._id
                        return (
                          <tr
                            key={series._id}
                            className={`border-b border-neutral-50 transition-colors hover:bg-neutral-50/60 ${series.cancellationRisk ? 'bg-rose-50/20' : ''}`}
                          >
                            <td className="px-6 py-4 font-semibold text-left">{getRankBadge(series.rank)}</td>
                            <td className="px-6 py-4 text-left">
                              <div className="flex items-center gap-3">
                                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-505">
                                  <BookOpen className="size-4.5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold text-neutral-900 leading-none">{series.title}</p>
                                    {series.cancellationRisk && (
                                      <span className="flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[9px] font-bold text-rose-600">
                                        <AlertTriangle className="size-2.5" />
                                        {t('editorialBoard.cancellationRisk')}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-neutral-400 mt-1 font-medium">{series.mangakaId?.displayName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1 font-bold text-xs ${series.weeklyVotes > 0 ? 'text-emerald-700' : 'text-neutral-500'}`}>
                                  {series.weeklyVotes > 0 ? (
                                    <TrendingUp className="size-3.5" />
                                  ) : (
                                    <TrendingDown className="size-3.5" />
                                  )}
                                  {series.weeklyVotes}
                                </span>
                                {series.cancellationRisk && (
                                  <div className="w-16 h-1 rounded-full bg-rose-105 overflow-hidden mt-1">
                                    <div className="h-full bg-rose-500 w-[20%] animate-pulse" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-bold text-neutral-600">{series.totalVotes}</td>
                            <td className="px-6 py-4 text-center">
                              <Badge className={getStatusBadge(series.status)}>
                                {series.publicationSchedule ? `${series.status} (${series.publicationSchedule})` : series.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-9 rounded-xl p-0 hover:bg-neutral-100 border border-neutral-200"
                                onClick={() => setExpandedId(isExpanded ? null : series._id)}
                              >
                                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Expanded Series Actions Drawer */}
              {expandedId && (() => {
                const series = rankings.find(s => s._id === expandedId)
                if (!series) return null

                return (
                  <Card className="overflow-hidden border-indigo-100 bg-indigo-50/10 rounded-2xl shadow-xs animate-in fade-in slide-in-from-top-3 duration-250">
                    <CardContent className="space-y-5 p-6">
                      <div className="flex items-center justify-between border-b border-indigo-100/50 pb-3">
                        <h4 className="text-sm font-bold text-indigo-955 flex items-center gap-1.5">
                          <Activity className="size-4 text-indigo-600" />
                          {t('editorialBoard.seriesActions', 'Actions for')}{" "}
                          <span className="text-indigo-600 font-extrabold">"{series.title}"</span>
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {/* Change Schedule */}
                        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-3xs flex flex-col justify-between text-left">
                          <div>
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-neutral-700">
                              <Calendar className="size-4 text-indigo-500" />
                              {t('editorialBoard.changeSchedule')}
                            </div>
                            <p className="text-[11px] text-neutral-450 leading-relaxed mb-4">Update the manuscript upload publication cadence for this series.</p>
                          </div>
                          
                          {scheduleSeriesId === series._id ? (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <div className="flex gap-2">
                                {(['weekly', 'monthly'] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setSelectedSchedule(s)}
                                    className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition-all ${selectedSchedule === s
                                      ? 'bg-indigo-600 text-white shadow-sm border border-indigo-650'
                                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                                      }`}
                                  >
                                    {t(`editorialBoard.${s}`)}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-xs border border-neutral-200 hover:bg-neutral-100 h-8" onClick={() => setScheduleSeriesId(null)}>
                                  {t('common.cancel')}
                                </Button>
                                <Button size="sm" className="flex-1 rounded-xl bg-indigo-600 text-xs text-white hover:bg-indigo-700 h-8 font-bold" onClick={() => handleSetSchedule(series._id)}>
                                  {t('common.save')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1.5 rounded-xl text-xs font-bold h-9 border border-neutral-200 hover:bg-neutral-50 shadow-3xs"
                              onClick={() => setScheduleSeriesId(series._id)}
                            >
                              <Calendar className="size-3.5" />
                              {series.publicationSchedule
                                ? `CADENCE: ${series.publicationSchedule.toUpperCase()}`
                                : t('editorialBoard.setSchedule')
                              }
                            </Button>
                          )}
                        </div>

                        {/* Input Reader Votes */}
                        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-3xs flex flex-col justify-between text-left">
                          <div>
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-neutral-700">
                              <BarChart3 className="size-4 text-emerald-600" />
                              {t('editorialBoard.inputWeeklyVotes')}
                            </div>
                            <p className="text-[11px] text-neutral-450 leading-relaxed mb-4">Directly input the manual reader performance votes for this period.</p>
                          </div>
                          
                          {inputVotesSeriesId === series._id ? (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <Input
                                type="number"
                                min="0"
                                value={inputVotesCount}
                                onChange={(e) => setInputVotesCount(e.target.value)}
                                placeholder="Enter votes..."
                                className="rounded-xl text-xs bg-white border-neutral-200 focus:border-indigo-500 h-8"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-xs border border-neutral-200 hover:bg-neutral-100 h-8" onClick={() => setInputVotesSeriesId(null)}>
                                  {t('common.cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1 rounded-xl bg-emerald-600 text-xs text-white hover:bg-emerald-700 h-8 font-bold"
                                  onClick={() => handleInputVotes(series._id)}
                                >
                                  <Send className="size-3" />
                                  {t('editorialBoard.submitVotes')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1.5 rounded-xl text-xs font-bold h-9 border border-neutral-200 hover:bg-neutral-50 shadow-3xs"
                              onClick={() => {
                                setInputVotesSeriesId(series._id)
                                setInputVotesCount(String(series.weeklyVotes || 0))
                              }}
                            >
                              <BarChart3 className="size-3.5" />
                              {t('editorialBoard.inputVotes')} ({series.weeklyVotes})
                            </Button>
                          )}
                        </div>

                        {/* Cancel Series */}
                        <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-5 shadow-3xs flex flex-col justify-between text-left">
                          <div>
                            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-rose-700">
                              <Ban className="size-4 text-rose-500" />
                              {t('editorialBoard.cancelSeries')}
                            </div>
                            <p className="text-[11px] text-rose-750 leading-relaxed mb-4">Halt all development and cancel publication of this series manuscript.</p>
                          </div>
                          
                          {cancelSeriesId === series._id ? (
                            <div className="space-y-3 animate-in fade-in duration-200">
                              <Textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder={t('editorialBoard.cancelReason')}
                                className="min-h-[50px] rounded-xl text-xs bg-white border-neutral-200 focus:border-rose-500"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 rounded-xl text-xs border border-neutral-200 hover:bg-neutral-100 h-8" onClick={() => setCancelSeriesId(null)}>
                                  {t('common.cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1 rounded-xl bg-red-600 text-xs text-white hover:bg-red-700 h-8 font-bold"
                                  onClick={() => handleCancelSeries(series._id)}
                                  disabled={!cancelReason.trim()}
                                >
                                  <Ban className="size-3" />
                                  {t('editorialBoard.confirmCancel')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full gap-1.5 rounded-xl border border-rose-200 text-xs text-rose-600 hover:bg-rose-105 font-bold h-9 shadow-3xs bg-white"
                              onClick={() => setCancelSeriesId(series._id)}
                            >
                              <Ban className="size-3.5" />
                              {t('editorialBoard.cancelSeries')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}
            </>
          )}
        </div>
      )}

      {/* ────── INPUT VOTES TAB ────── */}
      {activeTab === 'input' && (
        <div className="space-y-4 max-w-4xl mx-auto">
          <Card className="rounded-2xl border border-neutral-250/70 bg-white shadow-xs overflow-hidden border-t-4 border-t-indigo-650">
            {/* Header section */}
            <div className="border-b border-neutral-100 bg-neutral-50/50 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="grid size-11 place-items-center rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 shadow-3xs">
                  <BarChart3 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-neutral-900 tracking-tight leading-snug">
                    {t('editorialBoard.inputWeeklyVotes')}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Input reader vote data for each active series after each publication period
                  </p>
                </div>
              </div>

              {/* Active count badge */}
              <div className="self-start sm:self-center shrink-0">
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold px-3 py-1 rounded-full shadow-3xs">
                  {rankings.filter(s => s.status === 'Active').length} Active Series
                </Badge>
              </div>
            </div>

            {/* List content */}
            <div className="p-6">
              <div className="space-y-3">
                {rankings.filter(s => s.status === 'Active').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-4 grid size-16 place-items-center rounded-2xl bg-neutral-50 border border-neutral-100 text-neutral-400">
                      <BarChart3 className="size-8 text-neutral-400" />
                    </div>
                    <p className="text-sm font-bold text-neutral-800">No active series found</p>
                    <p className="text-xs text-neutral-400 mt-1">There are currently no active series requiring vote input.</p>
                  </div>
                ) : (
                  rankings.filter(s => s.status === 'Active').map((series) => (
                    <div
                      key={series._id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-neutral-150 bg-white p-5 hover:border-indigo-150 hover:shadow-xs transition-all duration-200 gap-4"
                    >
                      <div className="flex items-center gap-4 text-left">
                        {/* Rank Badge */}
                        <div className="shrink-0 select-none">
                          {getRankBadge(series.rank || 0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-extrabold text-neutral-900 leading-snug">{series.title}</p>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-250 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <TrendingUp className="size-2.5 shrink-0" />
                              {series.weeklyVotes} {t('editorialBoard.weeklyVotes', 'Votes')}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 font-medium">
                            {series.mangakaId?.displayName} · Total: <span className="font-semibold text-neutral-600">{series.totalVotes}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 shrink-0">
                        {inputVotesSeriesId === series._id ? (
                          <div className="flex items-center gap-2 bg-indigo-50/20 border border-indigo-100/50 p-2 rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                            <div className="relative">
                              <Input
                                type="number"
                                min="0"
                                value={inputVotesCount}
                                onChange={(e) => setInputVotesCount(e.target.value)}
                                className="w-28 rounded-xl text-xs bg-white border-neutral-200 focus:border-indigo-500 font-extrabold text-center h-9 pr-6"
                                placeholder="0"
                                autoFocus
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-extrabold text-neutral-400 uppercase select-none">Votes</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-xl text-xs border border-neutral-200 hover:bg-neutral-100 font-bold h-9 px-3"
                              onClick={() => setInputVotesSeriesId(null)}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 h-9 px-4 shadow-sm shadow-emerald-200 hover:shadow-md transition-all duration-200"
                              onClick={() => handleInputVotes(series._id)}
                            >
                              <Send className="size-3" />
                              {t('editorialBoard.submitVotes')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-xl text-xs font-bold border border-neutral-200 hover:border-indigo-150 hover:bg-indigo-50/10 hover:text-indigo-650 h-10 px-4 transition-all duration-200 shadow-3xs"
                            onClick={() => {
                              setInputVotesSeriesId(series._id)
                              setInputVotesCount(String(series.weeklyVotes || 0))
                            }}
                          >
                            <BarChart3 className="size-3.5" />
                            {t('editorialBoard.inputVotes')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* ────── RUBRICS TEMPLATES TAB ────── */}
      {activeTab === 'rubrics' && user?.isEbHead && (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Rubric Templates Configurator</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Create, preview and activate dynamic review rubric criteria across the workspace</p>
            </div>
            <Button
              onClick={() => setShowCreateRubricModal(true)}
              className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold px-4 py-2 shadow-sm"
            >
              + Create Template
            </Button>
          </div>

          {/* Active Template Callout */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50/50 border border-indigo-150 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-3xs">
            <div className="space-y-1">
              <span className="text-[9px] font-bold text-indigo-650 uppercase tracking-widest bg-indigo-100/60 px-2 py-0.5 rounded-md">Currently Active Rubric</span>
              <h3 className="text-base font-extrabold text-neutral-900 mt-1">{activeTemplate ? activeTemplate.name : 'Default Fallback Rubric'}</h3>
              <p className="text-xs text-neutral-500 font-medium">This template is utilized system-wide for reviews, average calculations and scorecard outputs.</p>
            </div>
            <div className="flex flex-wrap gap-1.5 max-w-lg md:justify-end">
              {(activeTemplate?.criteria || DEFAULT_CRITERIA).map((c: any) => (
                <span key={c.key} className="bg-white border border-indigo-100 text-indigo-750 font-bold px-3 py-1 rounded-xl text-xs shadow-3xs">
                  {c.label}
                </span>
              ))}
            </div>
          </div>

          {/* Templates Grid List */}
          <div className="grid gap-4 sm:grid-cols-2">
            {rubricTemplates.map((tpl) => {
              const isActive = tpl.isActive
              return (
                <Card key={tpl._id} className={`p-5 flex flex-col justify-between border transition-all rounded-2xl bg-white shadow-2xs relative ${
                  isActive ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-neutral-200 hover:border-neutral-350'
                }`}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-extrabold text-sm text-neutral-900 tracking-tight">{tpl.name}</h3>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
                          Created {new Date(tpl.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                          Active
                        </Badge>
                      ) : (
                        <Badge className="bg-neutral-50 text-neutral-450 border-neutral-200 text-[10px] font-semibold px-2.5 py-0.5 rounded-full">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1 border-t border-neutral-100 pt-3">
                      {tpl.criteria.map((c: any) => (
                        <span key={c.key} className="bg-neutral-50 border border-neutral-200/60 text-neutral-650 font-bold px-2 py-0.5 rounded-lg text-[10px]">
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  {!isActive && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
                      <Button
                        size="sm"
                        className="rounded-xl px-4 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-150 hover:bg-indigo-100 h-8"
                        onClick={() => handleActivateTemplate(tpl._id)}
                      >
                        Activate Template
                      </Button>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Create Rubric Modal */}
          {showCreateRubricModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-neutral-100">
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Palette className="size-4 text-indigo-500" />
                    New Rubric Template
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">Define review scoring categories. Criteria keys must be camelCase alphanumeric, labels can be any display string.</p>
                </div>

                <form onSubmit={handleCreateTemplate} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">Template Name</label>
                    <Input
                      type="text"
                      required
                      className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-neutral-50 focus:bg-white outline-none focus:border-indigo-500 font-bold transition-all shadow-xs"
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g. FY27 Standard Performance Rubric"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 flex justify-between items-center">
                      <span>Criteria List ({newTemplateCriteria.length})</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewTemplateCriteria(prev => [...prev, { key: `customField${Date.now()}`, label: 'New Metric' }])
                        }}
                        className="text-[9px] font-extrabold text-indigo-650 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded hover:bg-indigo-100"
                      >
                        + Add Metric
                      </button>
                    </label>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {newTemplateCriteria.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <Input
                            type="text"
                            required
                            placeholder="camelCaseKey"
                            className="flex-1 rounded-xl text-xs bg-neutral-50"
                            value={item.key}
                            onChange={(e) => {
                              const updated = [...newTemplateCriteria]
                              updated[idx].key = e.target.value.replace(/[^a-zA-Z0-9]/g, '')
                              setNewTemplateCriteria(updated)
                            }}
                          />
                          <Input
                            type="text"
                            required
                            placeholder="Display Label"
                            className="flex-1 rounded-xl text-xs bg-neutral-50"
                            value={item.label}
                            onChange={(e) => {
                              const updated = [...newTemplateCriteria]
                              updated[idx].label = e.target.value
                              setNewTemplateCriteria(updated)
                            }}
                          />
                          {newTemplateCriteria.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setNewTemplateCriteria(prev => prev.filter((_, i) => i !== idx))
                              }}
                              className="text-rose-650 hover:text-rose-800 p-1 text-xs font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl px-4 text-xs font-semibold border-neutral-200"
                      onClick={() => setShowCreateRubricModal(false)}
                      disabled={submittingTemplate}
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      className="rounded-xl px-4 text-xs font-semibold bg-indigo-600 hover:bg-indigo-755 text-white"
                      disabled={submittingTemplate || !newTemplateName.trim() || newTemplateCriteria.length === 0}
                    >
                      {submittingTemplate ? 'Saving...' : 'Save Template'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
