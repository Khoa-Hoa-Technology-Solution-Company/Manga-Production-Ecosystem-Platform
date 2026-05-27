import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Gavel, Clock, Trophy, BarChart3, ThumbsUp, ThumbsDown,
  BookOpen, ChevronDown, ChevronUp, AlertTriangle, Send,
  Calendar, Ban, Loader2, TrendingUp, TrendingDown
} from 'lucide-react'
import { Badge, Button, Card, CardContent, Input, Tabs, Textarea } from '../ui'
import { seriesAPI, approvalAPI, dashboardAPI } from '../../lib/api'

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
  // Vote aggregation
  votesFor?: number
  votesAgainst?: number
}

type RankingItem = SeriesItem & {
  rank: number
}

/* ──────────────────────────────────── component ── */
export function EditorialBoardPortalPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('votes')
  const [pendingSeries, setPendingSeries] = useState<SeriesItem[]>([])
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)

  // Voting state
  const [votingSeriesId, setVotingSeriesId] = useState<string | null>(null)
  const [voteComments, setVoteComments] = useState('')
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

  const tabs = [
    { key: 'votes', label: t('editorialBoard.pendingVotes'), icon: <Gavel className="size-3.5" />, count: pendingSeries.length },
    { key: 'rankings', label: t('editorialBoard.seriesRankings'), icon: <Trophy className="size-3.5" /> },
    { key: 'input', label: t('editorialBoard.inputVotes'), icon: <BarChart3 className="size-3.5" /> },
  ]

  /* ── data fetching ── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [pendingRes, rankingsRes] = await Promise.all([
        seriesAPI.getPendingReview({ role: 'editorial_board' }).catch(() => ({ data: { series: [] } })),
        dashboardAPI.getRankings().catch(() => ({ data: { rankings: [] } })),
      ])

      // If pending review API doesn't return results, filter from all series
      let pending = pendingRes.data.series || []
      if (!pending.length) {
        const allRes = await seriesAPI.getAll({ limit: '100' }).catch(() => ({ data: { series: [] } }))
        pending = (allRes.data.series || []).filter((s: SeriesItem) => s.status === 'EBReview')
      }
      setPendingSeries(pending)

      const rankedSeries = (rankingsRes.data.rankings || []).map((s: SeriesItem, idx: number) => ({
        ...s,
        rank: idx + 1,
      }))
      setRankings(rankedSeries)
    } catch (err) {
      console.error('Failed to fetch EB data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── actions ── */
  const handleVote = async (seriesId: string, decision: 'approved' | 'rejected') => {
    setSubmittingVote(true)
    try {
      await approvalAPI.ebVote(seriesId, { decision, comments: voteComments })
      setVotingSeriesId(null)
      setVoteComments('')
      fetchData()
    } catch (err) {
      console.error('Failed to cast vote:', err)
    } finally {
      setSubmittingVote(false)
    }
  }

  const handleFinalDecision = async (seriesId: string, decision: 'approved' | 'rejected') => {
    setSubmittingDecision(true)
    try {
      await approvalAPI.ebDecision(seriesId, {
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
      await approvalAPI.ebDecision(seriesId, {
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
      await approvalAPI.cancelSeries(seriesId, { reason: cancelReason })
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
      await approvalAPI.inputReaderVotes(seriesId, { weeklyVotes: count })
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
          { label: t('editorialBoard.pendingVotes'), value: pendingSeries.length, icon: Clock, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
          { label: t('editorialBoard.seriesRankings'), value: rankings.length, icon: Trophy, gradient: 'from-indigo-500 to-blue-500', shadow: 'shadow-indigo-200' },
          { label: t('editorialBoard.cancellationRisk'), value: rankings.filter(r => r.cancellationRisk).length, icon: AlertTriangle, gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-200' },
          { label: 'Active Series', value: rankings.filter(r => r.status === 'Active').length, icon: TrendingUp, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
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
                        </div>
                        <p className="mb-3 line-clamp-2 text-sm text-neutral-500">{series.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                          <span>by {series.mangakaId?.displayName}</span>
                          <span>{series.genre?.join(', ')}</span>
                          <span>{series.totalChapters} chapters</span>
                        </div>
                      </div>

                      {/* Vote actions */}
                      {votingSeriesId === series._id ? (
                        <div className="mt-4 space-y-3 rounded-xl bg-neutral-50 p-4">
                          <Textarea
                            value={voteComments}
                            onChange={(e) => setVoteComments(e.target.value)}
                            placeholder="Optional comments..."
                            className="min-h-[60px] rounded-xl text-sm"
                          />
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
                              className="gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              onClick={() => handleVote(series._id, 'rejected')}
                              disabled={submittingVote}
                            >
                              {submittingVote ? <Loader2 className="size-3.5 animate-spin" /> : <ThumbsDown className="size-3.5" />}
                              {t('editorialBoard.voteReject')}
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                              onClick={() => handleVote(series._id, 'approved')}
                              disabled={submittingVote}
                            >
                              {submittingVote ? <Loader2 className="size-3.5 animate-spin" /> : <ThumbsUp className="size-3.5" />}
                              {t('editorialBoard.voteApprove')}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 flex-1"
                            onClick={() => {
                              setVotingSeriesId(series._id)
                              setDecisionSeriesId(null)
                            }}
                          >
                            <Gavel className="size-3.5" />
                            {t('editorialBoard.castVote')}
                          </Button>
                          <Button
                            size="sm"
                            className="gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700 flex-1"
                            onClick={() => {
                              setDecisionSeriesId(series._id)
                              setVotingSeriesId(null)
                            }}
                          >
                            <Trophy className="size-3.5" />
                            Final Decision
                          </Button>
                        </div>
                      )}

                      {/* Vote Aggregation Display */}
                      <div className="mt-4 rounded-xl bg-neutral-50 p-3">
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

                      {/* Final Decision Form */}
                      {decisionSeriesId === series._id && (
                        <div className="mt-4 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
                          <div>
                            <h4 className="mb-2 text-sm font-semibold text-indigo-900">Make Final Decision</h4>
                            <p className="text-xs text-indigo-700/70 mb-3">
                              This will conclude the voting process and officially publish or reject the series.
                            </p>
                          </div>
                          
                          <div>
                            <label className="mb-1.5 block text-xs font-medium text-indigo-900">
                              {t('editorialBoard.publicationSchedule')} (if approved)
                            </label>
                            <div className="flex gap-2">
                              {(['weekly', 'monthly'] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setDecisionSchedule(s)}
                                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                    decisionSchedule === s
                                      ? 'bg-indigo-600 text-white shadow-sm'
                                      : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
                                  }`}
                                >
                                  {t(`editorialBoard.${s}`)}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
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
                              className="flex-1 gap-1.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                              onClick={() => handleFinalDecision(series._id, 'rejected')}
                              disabled={submittingDecision}
                            >
                              {submittingDecision ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
                              Reject Series
                            </Button>
                            <Button
                              size="sm"
                              className="flex-1 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-200"
                              onClick={() => handleFinalDecision(series._id, 'approved')}
                              disabled={submittingDecision}
                            >
                              {submittingDecision ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                              Publish Series
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
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
                              <Badge className={
                                series.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                series.status === 'Cancelled' ? 'bg-red-50 text-red-600 border-red-200' :
                                'bg-neutral-100 text-neutral-600 border-neutral-200'
                              }>
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
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                      selectedSchedule === s
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
