import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Gavel, Clock, Trophy, BarChart3, ThumbsUp, ThumbsDown,
  BookOpen, ChevronDown, ChevronUp, AlertTriangle, Send,
  Calendar, Ban, Loader2, TrendingUp, TrendingDown,
  LayoutDashboard, Activity, ChevronRight
} from 'lucide-react'
import { ProposalDetailView } from './series-manager/ProposalDetailView'
import { Badge, Button, Card, CardContent, Input, Tabs, Textarea } from '../ui'
import { ebAPI, dashboardAPI, chaptersAPI, meetingAPI, authAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'

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
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({ pendingCount: 0, activeCount: 0, cancellationRiskCount: 0, totalDecisions: 0 })
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
  const [rubricArtStyle, setRubricArtStyle] = useState(5)
  const [rubricStorytelling, setRubricStorytelling] = useState(5)
  const [rubricCharacterDesign, setRubricCharacterDesign] = useState(5)
  const [rubricPacing, setRubricPacing] = useState(5)
  const [rubricCommercialPotential, setRubricCommercialPotential] = useState(5)
  const [submittingVote, setSubmittingVote] = useState(false)

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
  const [meetingSeriesId, setMeetingSeriesId] = useState('')
  const [meetingParticipants, setMeetingParticipants] = useState<string[]>([])
  const [availableReviewers, setAvailableReviewers] = useState<ReviewerItem[]>([])
  const [submittingMeeting, setSubmittingMeeting] = useState(false)

  const tabs = [
    { key: 'dashboard', label: t('editorialBoard.dashboard'), icon: <LayoutDashboard className="size-3.5" /> },
    { key: 'votes', label: t('editorialBoard.pendingVotes'), icon: <Gavel className="size-3.5" />, count: pendingSeries.length },
    { key: 'meetings', label: t('editorialBoard.meetingsTab', 'Meetings'), icon: <Calendar className="size-3.5" /> },
    { key: 'rankings', label: t('editorialBoard.seriesRankings'), icon: <Trophy className="size-3.5" /> },
    { key: 'input', label: t('editorialBoard.inputVotes'), icon: <BarChart3 className="size-3.5" /> },
  ]

  /* ── data fetching ── */
  const fetchData = useCallback(async () => {
    try {
      const [pendingRes, rankingsRes, dashboardRes, meetingsRes] = await Promise.all([
        ebAPI.getPending().catch(() => ({ data: { series: [] } })),
        dashboardAPI.getRankings().catch(() => ({ data: { rankings: [] } })),
        ebAPI.getDashboard().catch(() => ({ data: { stats: { pendingCount: 0, activeCount: 0, cancellationRiskCount: 0, totalDecisions: 0 }, atRiskSeries: [], recentDecisions: [] } })),
        meetingAPI.getAll().catch(() => ({ data: { meetings: [] } })),
      ])

      setPendingSeries(pendingRes.data.series || [])

      const rankedSeries = (rankingsRes.data.rankings || []).map((s: SeriesItem, idx: number) => ({
        ...s,
        rank: idx + 1,
      }))
      setRankings(rankedSeries)

      setDashboardStats(dashboardRes.data.stats || { pendingCount: 0, activeCount: 0, cancellationRiskCount: 0, totalDecisions: 0 })
      setAtRiskSeries(dashboardRes.data.atRiskSeries || [])
      setRecentDecisions(dashboardRes.data.recentDecisions || [])
      setLowRatingChapters(dashboardRes.data.lowRatingChapters || [])
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
  }, [])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  /* ── actions ── */
  const handleVote = async (seriesId: string, decision: 'approved' | 'rejected') => {
    setSubmittingVote(true)
    try {
      await ebAPI.castVote(seriesId, {
        decision,
        comments: voteComments,
        rubric: {
          artStyle: rubricArtStyle,
          storytelling: rubricStorytelling,
          characterDesign: rubricCharacterDesign,
          pacing: rubricPacing,
          commercialPotential: rubricCommercialPotential,
        },
      })
      setVotingSeriesId(null)
      setVoteComments('')
      setRubricArtStyle(5)
      setRubricStorytelling(5)
      setRubricCharacterDesign(5)
      setRubricPacing(5)
      setRubricCommercialPotential(5)
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
      fetchData()
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
    if (series.userVoteRubric) {
      setRubricArtStyle(series.userVoteRubric.artStyle || 5)
      setRubricStorytelling(series.userVoteRubric.storytelling || 5)
      setRubricCharacterDesign(series.userVoteRubric.characterDesign || 5)
      setRubricPacing(series.userVoteRubric.pacing || 5)
      setRubricCommercialPotential(series.userVoteRubric.commercialPotential || 5)
    } else {
      setRubricArtStyle(5)
      setRubricStorytelling(5)
      setRubricCharacterDesign(5)
      setRubricPacing(5)
      setRubricCommercialPotential(5)
    }
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

  /* ── helpers ── */
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-500">🥇 #1</span>
    if (rank === 2) return <span className="inline-flex items-center gap-1 text-sm font-bold text-neutral-400">🥈 #2</span>
    if (rank === 3) return <span className="inline-flex items-center gap-1 text-sm font-bold text-amber-700">🥉 #3</span>
    return <span className="text-sm font-bold text-neutral-500">#{rank}</span>
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          { label: t('editorialBoard.pendingVotes'), value: dashboardStats.pendingCount, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
          { label: t('editorialBoard.activeSeries'), value: dashboardStats.activeCount, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
          { label: t('editorialBoard.cancellationRisk'), value: dashboardStats.cancellationRiskCount, icon: AlertTriangle, gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-200' },
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
                            <span key={s} className={`text-sm ${s <= Math.round(item.avgRating) ? 'text-amber-400' : 'text-neutral-200'}`}>★</span>
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
        <div className="space-y-3">
          {pendingSeries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                  <Gavel className="size-7 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700">{t('editorialBoard.noPending')}</p>
                <p className="mt-1 text-xs text-neutral-400">{t('editorialBoard.noPendingHint')}</p>
              </CardContent>
            </Card>
          ) : (
            pendingSeries.map((series) => (
              <Card key={series._id} className="overflow-hidden transition-all hover:shadow-md">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Cover */}
                    <div className="relative h-40 w-full shrink-0 overflow-hidden bg-gradient-to-br from-indigo-50 to-blue-50 sm:h-auto sm:w-44">
                      {series.coverImage ? (
                        <img src={series.coverImage} alt={series.title} className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <BookOpen className="size-10 text-indigo-200" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex flex-1 flex-col justify-between p-5">
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-base font-semibold text-neutral-950">{series.title}</h3>
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200">Awaiting Vote</Badge>
                          {series.userVote && (
                            <Badge className={series.userVote === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}>
                              {series.userVote === 'approved' ? '✓ Voted Approve' : '✗ Voted Reject'}
                            </Badge>
                          )}
                        </div>
                        <p className="mb-3 line-clamp-2 text-sm text-neutral-500">{series.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                          <span>by {series.mangakaId?.displayName}</span>
                          <span>{series.genre?.join(', ')}</span>
                          <span>{series.totalChapters} chapters</span>
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

                        {inspectSeriesId === series._id && (
                          <div className="border-t border-neutral-100 pt-3 mt-2 space-y-4 w-full text-left">
                            {/* Interactive Script & Character Designs Inspection */}
                            <div className="p-1.5 bg-neutral-50/20 border border-neutral-100 rounded-2xl">
                              <ProposalDetailView
                                script={series.script}
                                scriptFile={series.scriptFile}
                                characterDesigns={series.characterDesigns}
                              />
                            </div>

                            {/* Submitted Chapters */}
                            <div className="space-y-2 border-t border-neutral-100 pt-3">
                              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block mb-1">
                                Submitted Chapters & Storyboard
                              </span>

                            {loadingChapters ? (
                              <div className="flex items-center gap-2 text-xs text-neutral-500 py-2 justify-center">
                                <Loader2 className="size-4 animate-spin text-neutral-800" />
                                <span>Loading details...</span>
                              </div>
                            ) : inspectChapters.length === 0 ? (
                              <p className="text-xs text-neutral-500 py-2 text-center">
                                No chapters uploaded for this series draft yet.
                              </p>
                            ) : (
                              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {inspectChapters.map((chapter) => (
                                  <div key={chapter._id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-neutral-800 truncate">
                                        Ch. {chapter.chapterNumber}: {chapter.title}
                                      </p>
                                      <p className="text-[10px] text-neutral-400">
                                        {chapter.totalPages || 0} Pages · {chapter.progress || 0}% Done · Status: <span className="font-bold">{chapter.status}</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        size="sm"
                                        className="h-7 px-2 bg-neutral-900 text-white hover:bg-neutral-800 text-[10px] font-semibold rounded-lg gap-1"
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
                    </div>

                      {votingSeriesId === series._id ? (() => {
                        const currentAverage = (rubricArtStyle + rubricStorytelling + rubricCharacterDesign + rubricPacing + rubricCommercialPotential) / 5;
                        const autoDecision = currentAverage >= 5 ? 'approved' : 'rejected';

                        return (
                          <div className="mt-4 space-y-3 rounded-xl bg-neutral-50 p-4 text-left">
                            {/* Rubric sliders */}
                            <div className="space-y-3 bg-white p-3 rounded-xl border border-neutral-100 my-2">
                              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                                {t('editorialBoard.rubricScores', 'Rubric Scores')}
                              </h4>
                              <div className="space-y-3">
                                {[
                                  { key: 'artStyle', label: t('editorialBoard.artStyle', 'Art Style'), val: rubricArtStyle, setVal: setRubricArtStyle },
                                  { key: 'storytelling', label: t('editorialBoard.storytelling', 'Storytelling'), val: rubricStorytelling, setVal: setRubricStorytelling },
                                  { key: 'characterDesign', label: t('editorialBoard.characterDesign', 'Character Design'), val: rubricCharacterDesign, setVal: setRubricCharacterDesign },
                                  { key: 'pacing', label: t('editorialBoard.pacing', 'Pacing & Layout'), val: rubricPacing, setVal: setRubricPacing },
                                  { key: 'commercialPotential', label: t('editorialBoard.commercialPotential', 'Commercial Potential'), val: rubricCommercialPotential, setVal: setRubricCommercialPotential },
                                ].map(({ key, label, val, setVal }) => (
                                  <div key={key} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-medium text-neutral-700">{label}</span>
                                      <span className="font-bold text-indigo-600">{val}/10</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="1"
                                      max="10"
                                      value={val}
                                      onChange={(e) => setVal(parseInt(e.target.value))}
                                      className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-neutral-200 rounded-lg appearance-none"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            <Textarea
                              value={voteComments}
                              onChange={(e) => setVoteComments(e.target.value)}
                              placeholder="Optional comments..."
                              className="min-h-[60px] rounded-xl text-sm bg-white"
                            />

                            {/* Average & Auto Decision Indicator */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-100">
                              <div className="text-xs font-semibold text-neutral-700">
                                {t('editorialBoard.averageScore', 'Average Score')}: <span className="text-indigo-600 text-sm font-bold">{currentAverage.toFixed(1)}/10</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">Decision:</span>
                                {autoDecision === 'approved' ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                                    <ThumbsUp className="size-3" /> {t('editorialBoard.voteApprove', 'Approve')}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full border border-red-100">
                                    <ThumbsDown className="size-3" /> {t('editorialBoard.voteReject', 'Reject')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="gap-1.5 rounded-xl"
                                onClick={() => setVotingSeriesId(null)}
                              >
                                {t('common.cancel')}
                              </Button>
                              <Button
                                size="sm"
                                className={`flex-1 gap-1.5 rounded-xl text-white font-semibold transition-all duration-300 ${autoDecision === 'approved'
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-100'
                                    : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-100'
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
                        <div className="mt-4 space-y-2">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-1 disabled:opacity-40"
                              onClick={() => handleOpenVote(series)}
                              disabled={!series.meeting || !series.meeting.isParticipant}
                            >
                              <Gavel className="size-3.5" />
                              {t('editorialBoard.castVote')}
                            </Button>

                            {user?.isEbHead && (
                              <Button
                                size="sm"
                                className="gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 flex-1 disabled:opacity-45"
                                onClick={() => {
                                  setDecisionSeriesId(series._id)
                                  setVotingSeriesId(null)
                                }}
                                disabled={!series.meeting || series.meeting.votesCount < series.meeting.participantsCount}
                              >
                                <Trophy className="size-3.5" />
                                {t('editorialBoard.endVote')}
                              </Button>
                            )}
                          </div>

                          {!series.meeting ? (
                            <div className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 p-2 rounded-xl text-center font-medium">
                              ⚠️ {t('editorialBoard.awaitingMeetingAlert', 'Awaiting scheduled review meeting before voting can start.')}
                            </div>
                          ) : (
                            <div className="space-y-1 bg-indigo-50/50 border border-indigo-100/50 p-2 rounded-xl text-[10px] text-left">
                              <div className="flex justify-between text-indigo-900 font-semibold">
                                <span>Meeting: {series.meeting.title}</span>
                                <span>{new Date(series.meeting.dateTime).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between text-neutral-500">
                                <span>Votes Cast: {series.meeting.votesCount} / {series.meeting.participantsCount} ({Math.round((series.meeting.votesCount / series.meeting.participantsCount) * 100)}%)</span>
                                {series.meeting.isParticipant ? (
                                  <span className="text-emerald-600 font-bold">✓ Invited participant</span>
                                ) : (
                                  <span className="text-red-500 font-bold">✗ Not invited</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Vote Aggregation Display & Rubric Scorecard */}
                      <div className="mt-4 rounded-xl bg-neutral-50 p-3 space-y-3">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-xs font-medium">
                            <span className="text-emerald-600 flex items-center gap-1"><ThumbsUp className="size-3" /> {series.votesFor || 0} {t('editorialBoard.votesFor')}</span>
                            <span className="text-red-600 flex items-center gap-1">{series.votesAgainst || 0} {t('editorialBoard.votesAgainst')} <ThumbsDown className="size-3" /></span>
                          </div>
                          <div className="h-1.5 flex overflow-hidden rounded-full bg-neutral-200">
                            <div
                              className="bg-emerald-500 transition-all"
                              style={{ width: `${((series.votesFor || 0) / Math.max((series.votesFor || 0) + (series.votesAgainst || 0), 1)) * 100}%` }}
                            />
                            <div
                              className="bg-red-500 transition-all"
                              style={{ width: `${((series.votesAgainst || 0) / Math.max((series.votesFor || 0) + (series.votesAgainst || 0), 1)) * 100}%` }}
                            />
                          </div>
                        </div>

                        {series.averageRubric && (
                          <div className="mt-3 border-t border-neutral-200/60 pt-3 space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                                {t('editorialBoard.rubricScorecard')}
                              </h4>
                              <div className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                                {t('editorialBoard.averageScore')}: {series.averageRubric.totalAverage}/10
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                              {[
                                { label: t('editorialBoard.artStyle'), val: series.averageRubric.artStyle },
                                { label: t('editorialBoard.storytelling'), val: series.averageRubric.storytelling },
                                { label: t('editorialBoard.characterDesign'), val: series.averageRubric.characterDesign },
                                { label: t('editorialBoard.pacing'), val: series.averageRubric.pacing },
                                { label: t('editorialBoard.commercialPotential'), val: series.averageRubric.commercialPotential },
                              ].map(({ label, val }) => (
                                <div key={label} className="space-y-0.5">
                                  <div className="flex justify-between font-semibold text-neutral-600">
                                    <span>{label}</span>
                                    <span>{val}/10</span>
                                  </div>
                                  <div className="h-1 w-full bg-neutral-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${val * 10}%` }} />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {series.memberVotes && series.memberVotes.length > 0 && (
                              <div className="mt-2 border-t border-neutral-200/60 pt-2">
                                <details className="group">
                                  <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-indigo-600 select-none hover:text-indigo-800">
                                    <span>{t('editorialBoard.memberScoresBreakdown')} ({series.memberVotes.length})</span>
                                    <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                                  </summary>
                                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {series.memberVotes.map((mv) => (
                                      <div key={mv._id} className="p-2 bg-white border border-neutral-100 rounded-lg space-y-1 text-[11px] shadow-2xs">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-neutral-800">{mv.member?.displayName}</span>
                                          <Badge className={mv.decision === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-600 border-red-200'}>
                                            {mv.decision === 'approved' ? 'Approve' : 'Reject'}
                                          </Badge>
                                        </div>
                                        {mv.rubric && (
                                          <div className="text-[9px] text-neutral-500 flex flex-wrap gap-x-2 gap-y-0.5 py-0.5 border-t border-dashed border-neutral-100">
                                            <span>🎨 Art: {mv.rubric.artStyle}</span>
                                            <span>📖 Story: {mv.rubric.storytelling}</span>
                                            <span>👤 Char: {mv.rubric.characterDesign}</span>
                                            <span>⏱️ Pace: {mv.rubric.pacing}</span>
                                            <span>💰 Comm: {mv.rubric.commercialPotential}</span>
                                          </div>
                                        )}
                                        {mv.comments && (
                                          <p className="text-[10px] text-neutral-600 italic bg-neutral-50 p-1.5 rounded-lg border border-neutral-100/50">
                                            "{mv.comments}"
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Final Decision Form (End Vote / Kết thúc vote) */}
                      {decisionSeriesId === series._id && (() => {
                        const votesFor = series.votesFor || 0
                        const votesAgainst = series.votesAgainst || 0
                        const isApprovedByVotes = votesFor >= votesAgainst

                        return (
                          <div className="mt-4 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div>
                              <h4 className="mb-1 text-sm font-semibold text-indigo-900">{t('editorialBoard.endVoteAndDecision')}</h4>
                              <p className="text-xs text-indigo-700/70">
                                {t('editorialBoard.currentVoteResult')}{" "}
                                <strong className={isApprovedByVotes ? "text-emerald-700" : "text-red-700"}>
                                  {isApprovedByVotes ? t('editorialBoard.passedApproved') : t('editorialBoard.failedRejected')}
                                </strong>
                                {` (${votesFor} / ${votesAgainst} ${t('editorialBoard.votesLabel')})`}
                              </p>
                            </div>

                            {isApprovedByVotes ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="mb-1.5 block text-xs font-semibold text-indigo-900">
                                    {t('editorialBoard.publicationSchedule')}
                                  </label>
                                  <div className="flex gap-2">
                                    {(['weekly', 'monthly'] as const).map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => setDecisionSchedule(s)}
                                        className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${decisionSchedule === s
                                          ? 'bg-indigo-600 text-white shadow-sm'
                                          : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
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
                                    className="rounded-xl"
                                    onClick={() => setDecisionSeriesId(null)}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200"
                                    onClick={() => handleFinalDecision(series._id, 'approved')}
                                    disabled={submittingDecision}
                                  >
                                    {submittingDecision ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                                    {t('editorialBoard.approveAndPublishMajority')}
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className="mb-1.5 block text-xs font-semibold text-indigo-900">
                                    {t('editorialBoard.rejectionReasonFeedback')}
                                  </label>
                                  <Textarea
                                    value={voteComments}
                                    onChange={(e) => setVoteComments(e.target.value)}
                                    placeholder={t('editorialBoard.stateRejectionReasonPlaceholder')}
                                    className="min-h-[60px] rounded-xl text-sm"
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="rounded-xl"
                                    onClick={() => setDecisionSeriesId(null)}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 gap-1.5 rounded-xl border border-red-200 !bg-red-50 !text-red-600 hover:!bg-red-100 hover:!text-red-700"
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
                        )
                      })()}
                    </div>
                  </div>
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
            <h2 className="text-sm font-semibold text-neutral-800 uppercase tracking-wider">
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

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-neutral-700">{t('editorialBoard.selectRelatedSeries')}</label>
                    <select
                      value={meetingSeriesId}
                      onChange={(e) => setMeetingSeriesId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-neutral-200 bg-white px-3 text-xs outline-none focus:border-indigo-500 font-medium shadow-2xs"
                    >
                      <option value="">-- No Series --</option>
                      {[
                        ...pendingSeries.map((s) => ({ _id: s._id, title: `[Draft] ${s.title}` })),
                        ...rankings.map((s) => ({ _id: s._id, title: `[Active] ${s.title}` })),
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
                    onChange={(e) => setMeetingDesc(e.target.value)}
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
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                <Calendar className="size-7 text-neutral-400" />
              </div>
              <p className="text-sm font-medium text-neutral-700">{t('editorialBoard.noMeetings')}</p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {meetings.map((m) => {
                const isUpcoming = !!m.isUpcoming
                const meetingDate = new Date(m.dateTime)
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
                          {m.participants?.map((p: MeetingParticipant) => (
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
                      {user?.isEbHead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteMeeting(m._id)}
                          className="text-rose-600 hover:bg-rose-50 h-7 px-2 rounded-lg font-semibold border border-rose-100"
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
        <div className="space-y-3">
          {rankings.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 grid size-16 place-items-center rounded-full bg-neutral-100">
                  <Trophy className="size-7 text-neutral-400" />
                </div>
                <p className="text-sm font-medium text-neutral-700">{t('editorialBoard.noRankings')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rankings Table */}
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 bg-neutral-50/80">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.rank')}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.series')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.weeklyVotes')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.totalVotes')}</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.status')}</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-neutral-400">{t('editorialBoard.action')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankings.map((series) => {
                        const isExpanded = expandedId === series._id
                        return (
                          <tr
                            key={series._id}
                            className={`border-b border-neutral-50 transition-colors hover:bg-neutral-50/60 ${series.cancellationRisk ? 'bg-red-50/30' : ''}`}
                          >
                            <td className="px-4 py-3">{getRankBadge(series.rank)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-100">
                                  <BookOpen className="size-4 text-neutral-400" />
                                </div>
                                <div>
                                  <p className="font-medium text-neutral-900">{series.title}</p>
                                  <p className="text-xs text-neutral-400">{series.mangakaId?.displayName}</p>
                                </div>
                                {series.cancellationRisk && (
                                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                                    <AlertTriangle className="size-3" />
                                    Risk
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 font-medium">
                                  {series.weeklyVotes > 0 ? (
                                    <TrendingUp className="size-3.5 text-emerald-500" />
                                  ) : (
                                    <TrendingDown className="size-3.5 text-red-400" />
                                  )}
                                  {series.weeklyVotes}
                                </span>
                                {series.cancellationRisk && (
                                  <div className="w-16 h-1 rounded-full bg-red-100 overflow-hidden mt-1">
                                    <div className="h-full bg-red-500 w-[20%] animate-pulse" />
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-medium text-neutral-600">{series.totalVotes}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={getStatusBadge(series.status)}>
                                {series.publicationSchedule ? `${series.status} (${series.publicationSchedule})` : series.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="size-8 rounded-lg p-0"
                                  onClick={() => setExpandedId(isExpanded ? null : series._id)}
                                >
                                  {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Expanded Series Actions */}
              {expandedId && (() => {
                const series = rankings.find(s => s._id === expandedId)
                if (!series) return null

                return (
                  <Card className="overflow-hidden border-indigo-100">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-neutral-950">
                          Actions for "{series.title}"
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {/* Change Schedule */}
                        <div className="rounded-xl border border-neutral-200 p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-700">
                            <Calendar className="size-3.5" />
                            {t('editorialBoard.changeSchedule')}
                          </div>
                          {scheduleSeriesId === series._id ? (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                {(['weekly', 'monthly'] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => setSelectedSchedule(s)}
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${selectedSchedule === s
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                                      }`}
                                  >
                                    {t(`editorialBoard.${s}`)}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 rounded-lg text-xs" onClick={() => setScheduleSeriesId(null)}>
                                  {t('common.cancel')}
                                </Button>
                                <Button size="sm" className="flex-1 rounded-lg bg-indigo-600 text-xs text-white hover:bg-indigo-700" onClick={() => handleSetSchedule(series._id)}>
                                  {t('common.save')}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full gap-1.5 rounded-lg text-xs"
                              onClick={() => setScheduleSeriesId(series._id)}
                            >
                              <Calendar className="size-3.5" />
                              {series.publicationSchedule
                                ? `Currently: ${series.publicationSchedule}`
                                : t('editorialBoard.setSchedule')
                              }
                            </Button>
                          )}
                        </div>

                        {/* Input Reader Votes */}
                        <div className="rounded-xl border border-neutral-200 p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-700">
                            <BarChart3 className="size-3.5" />
                            {t('editorialBoard.inputWeeklyVotes')}
                          </div>
                          {inputVotesSeriesId === series._id ? (
                            <div className="space-y-2">
                              <Input
                                type="number"
                                min="0"
                                value={inputVotesCount}
                                onChange={(e) => setInputVotesCount(e.target.value)}
                                placeholder="Enter vote count..."
                                className="rounded-lg text-sm"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 rounded-lg text-xs" onClick={() => setInputVotesSeriesId(null)}>
                                  {t('common.cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
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
                              className="w-full gap-1.5 rounded-lg text-xs"
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
                        <div className="rounded-xl border border-red-100 bg-red-50/30 p-4">
                          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-red-700">
                            <Ban className="size-3.5" />
                            {t('editorialBoard.cancelSeries')}
                          </div>
                          {cancelSeriesId === series._id ? (
                            <div className="space-y-2">
                              <Textarea
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder={t('editorialBoard.cancelReason')}
                                className="min-h-[60px] rounded-lg text-xs"
                              />
                              <div className="flex gap-2">
                                <Button size="sm" variant="ghost" className="flex-1 rounded-lg text-xs" onClick={() => setCancelSeriesId(null)}>
                                  {t('common.cancel')}
                                </Button>
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1 rounded-lg bg-red-600 text-xs text-white hover:bg-red-700"
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
                              className="w-full gap-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-100"
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
        <div className="space-y-3">
          <Card>
            <CardContent className="p-5">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-neutral-950">{t('editorialBoard.inputWeeklyVotes')}</h3>
                <p className="text-xs text-neutral-400">Input reader vote data for each active series after each publication period</p>
              </div>

              <div className="space-y-2">
                {rankings.filter(s => s.status === 'Active').length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-400">No active series found</div>
                ) : (
                  rankings.filter(s => s.status === 'Active').map((series) => (
                    <div
                      key={series._id}
                      className="flex items-center justify-between rounded-xl bg-neutral-50 p-4 transition-colors hover:bg-neutral-100/80"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white shadow-sm">
                          {getRankBadge(series.rank)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900">{series.title}</p>
                          <p className="text-xs text-neutral-400">
                            {series.mangakaId?.displayName} · Current: {series.weeklyVotes} votes
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {inputVotesSeriesId === series._id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={inputVotesCount}
                              onChange={(e) => setInputVotesCount(e.target.value)}
                              className="w-24 rounded-lg text-sm"
                              placeholder="0"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="rounded-lg text-xs"
                              onClick={() => setInputVotesSeriesId(null)}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1 rounded-lg bg-emerald-600 text-xs text-white hover:bg-emerald-700"
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
                            className="gap-1.5 rounded-lg text-xs"
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
