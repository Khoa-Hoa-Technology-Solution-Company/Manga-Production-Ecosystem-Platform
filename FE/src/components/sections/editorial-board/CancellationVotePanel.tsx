import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  Ban,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Gavel,
  Loader2,
  MapPin,
  MessageSquareText,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react'
import { Badge, Button, Card, Textarea } from '../../ui'

export interface CancellationParticipant {
  _id: string
  displayName: string
  avatar?: string
  role: string
  decision: 'cancel' | 'continue' | null
  comments?: string
  votedAt?: string
}

export interface CancellationReview {
  meetingId: string
  title: string
  dateTime: string
  location?: string
  participantsCount: number
  votesCount: number
  cancelVotes: number
  continueVotes: number
  isParticipant: boolean
  userVote: 'cancel' | 'continue' | null
  participants: CancellationParticipant[]
}

export interface CancellationSeries {
  _id: string
  title: string
  status: string
  coverImage?: string
  weightedRating?: number
  ratingCount?: number
  reactionCount?: number
  publishedChapterCount?: number
  activeDays?: number
  riskLevel?: 'insufficient_data' | 'healthy' | 'watch' | 'at_risk' | 'closure_review'
  cancellationRisk?: boolean
  cancellationReview?: CancellationReview | null
  mangakaId?: { displayName?: string }
}

interface CancellationVotePanelProps {
  series: CancellationSeries[]
  selectedSeriesId: string | null
  isEbHead: boolean
  onSelectSeries: (seriesId: string) => void
  onScheduleMeeting: (series: CancellationSeries) => void
  onVote: (seriesId: string, decision: 'cancel' | 'continue', comments?: string) => Promise<void>
  onFinalize: (seriesId: string, reason: string) => Promise<void>
}

const riskLabel: Record<string, string> = {
  insufficient_data: 'Need data',
  healthy: 'Healthy',
  watch: 'Watch',
  at_risk: 'At risk',
  closure_review: 'Closure review',
}

const riskTone: Record<string, string> = {
  insufficient_data: 'border-neutral-200 bg-neutral-50 text-neutral-500',
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  watch: 'border-amber-200 bg-amber-50 text-amber-700',
  at_risk: 'border-orange-200 bg-orange-50 text-orange-700',
  closure_review: 'border-rose-200 bg-rose-50 text-rose-700',
}

export function CancellationVotePanel({
  series,
  selectedSeriesId,
  isEbHead,
  onSelectSeries,
  onScheduleMeeting,
  onVote,
  onFinalize,
}: CancellationVotePanelProps) {
  const [queueFilter, setQueueFilter] = useState<'open' | 'risk' | 'all'>('open')
  const [draftDecisions, setDraftDecisions] = useState<Record<string, 'cancel' | 'continue'>>({})
  const [comments, setComments] = useState<Record<string, string>>({})
  const [finalReasons, setFinalReasons] = useState<Record<string, string>>({})
  const [workingAction, setWorkingAction] = useState<string | null>(null)

  const openCases = series.filter((item) => item.cancellationReview)
  const riskCases = series.filter((item) =>
    ['at_risk', 'closure_review'].includes(item.riskLevel || '') || item.cancellationRisk
  )
  const readyToFinalize = openCases.filter((item) => {
    const review = item.cancellationReview
    return review && review.votesCount === review.participantsCount
  })
  const awaitingMyVote = openCases.filter(
    (item) => item.cancellationReview?.isParticipant && !item.cancellationReview.userVote
  )

  const filteredSeries = queueFilter === 'open'
    ? openCases
    : queueFilter === 'risk'
      ? riskCases
      : series
  const selectedSeries = series.find((item) => item._id === selectedSeriesId)
    || openCases[0]
    || riskCases[0]
    || series[0]
  const review = selectedSeries?.cancellationReview
  const draftDecision = selectedSeries
    ? draftDecisions[selectedSeries._id] || review?.userVote || undefined
    : undefined
  const voteProgress = review?.participantsCount
    ? Math.round((review.votesCount / review.participantsCount) * 100)
    : 0
  const majorityDecision = review && review.votesCount === review.participantsCount
    ? review.cancelVotes > review.continueVotes ? 'cancel' : 'continue'
    : null

  const submitVote = async () => {
    if (!selectedSeries || !draftDecision) return
    const actionKey = `vote:${selectedSeries._id}`
    setWorkingAction(actionKey)
    try {
      await onVote(selectedSeries._id, draftDecision, comments[selectedSeries._id]?.trim())
    } finally {
      setWorkingAction(null)
    }
  }

  const finalizeDecision = async () => {
    if (!selectedSeries || !majorityDecision) return
    const reason = finalReasons[selectedSeries._id]?.trim() || ''
    if (majorityDecision === 'cancel' && !reason) return
    const actionKey = `finalize:${selectedSeries._id}`
    setWorkingAction(actionKey)
    try {
      await onFinalize(selectedSeries._id, reason)
    } finally {
      setWorkingAction(null)
    }
  }

  return (
    <div className="space-y-5 text-left">
      <section className="overflow-hidden rounded-3xl border border-slate-800 bg-[#101522] text-white shadow-xl shadow-slate-200/50">
        <div className="relative px-6 py-7 sm:px-8">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-rose-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 size-40 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-rose-200">
                <ShieldAlert className="size-3.5" />
                Formal governance workspace
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Cancellation vote board</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                Review performance evidence, record each member&apos;s position, and finalize only the decision reached by the meeting majority.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'Open cases', value: openCases.length, icon: Gavel, color: 'text-indigo-300' },
                { label: 'My vote due', value: awaitingMyVote.length, icon: Clock, color: 'text-amber-300' },
                { label: 'Ready to close', value: readyToFinalize.length, icon: CheckCircle2, color: 'text-emerald-300' },
              ].map((item) => (
                <div key={item.label} className="min-w-24 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3 backdrop-blur-sm sm:min-w-32">
                  <item.icon className={`mb-2 size-4 ${item.color}`} />
                  <p className="text-xl font-black">{item.value}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <Card className="h-fit overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-neutral-900">Series queue</p>
                <p className="mt-0.5 text-[10px] text-neutral-400">{filteredSeries.length} series</p>
              </div>
              <BookOpen className="size-4 text-neutral-400" />
            </div>
            <div className="mt-3 grid grid-cols-3 rounded-xl bg-neutral-100 p-1">
              {([
                ['open', 'Open'],
                ['risk', 'At risk'],
                ['all', 'All'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setQueueFilter(value)}
                  className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition-all ${
                    queueFilter === value ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[720px] space-y-2 overflow-y-auto p-3">
            {filteredSeries.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <CheckCircle2 className="mx-auto size-8 text-emerald-300" />
                <p className="mt-3 text-xs font-bold text-neutral-700">No series in this queue</p>
                <p className="mt-1 text-[10px] text-neutral-400">Choose another filter to review active series.</p>
              </div>
            ) : filteredSeries.map((item) => {
              const isSelected = item._id === selectedSeries?._id
              const itemReview = item.cancellationReview
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => onSelectSeries(item._id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                      : 'border-neutral-150 bg-white hover:border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                      itemReview ? 'bg-rose-100 text-rose-700' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {itemReview ? <Gavel className="size-4" /> : <BookOpen className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-extrabold text-neutral-900">{item.title}</p>
                      <p className="mt-1 truncate text-[10px] text-neutral-400">
                        {item.mangakaId?.displayName || 'Unknown mangaka'}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <Badge className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${riskTone[item.riskLevel || 'healthy']}`}>
                          {riskLabel[item.riskLevel || 'healthy']}
                        </Badge>
                        <span className={`text-[9px] font-bold ${itemReview ? 'text-rose-600' : 'text-neutral-400'}`}>
                          {itemReview ? `${itemReview.votesCount}/${itemReview.participantsCount} voted` : 'No case'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className={`mt-3 size-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-neutral-300'}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {!selectedSeries ? (
          <Card className="grid min-h-96 place-items-center rounded-3xl border border-dashed border-neutral-300 bg-neutral-50">
            <div className="text-center">
              <ShieldAlert className="mx-auto size-10 text-neutral-300" />
              <p className="mt-3 text-sm font-bold text-neutral-700">No active series available</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-5">
            <Card className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
              <div className="border-b border-neutral-100 px-6 py-5 sm:px-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-700 ring-1 ring-rose-100">
                      <ShieldAlert className="size-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black tracking-tight text-neutral-950">{selectedSeries.title}</h3>
                        <Badge className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${riskTone[selectedSeries.riskLevel || 'healthy']}`}>
                          {riskLabel[selectedSeries.riskLevel || 'healthy']}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-neutral-400">
                        Active series · {selectedSeries.mangakaId?.displayName || 'Unknown mangaka'}
                      </p>
                    </div>
                  </div>
                  {review ? (
                    <Badge className="w-fit rounded-full border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                      Decision pending
                    </Badge>
                  ) : (
                    <Badge className="w-fit rounded-full border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                      No open review
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-neutral-100 sm:grid-cols-4">
                {[
                  { label: 'Weighted rating', value: `${(selectedSeries.weightedRating || 0).toFixed(2)} / 5`, detail: `${selectedSeries.ratingCount || 0} ratings` },
                  { label: 'Published chapters', value: selectedSeries.publishedChapterCount || 0, detail: 'Minimum evidence: 3' },
                  { label: 'Active period', value: `${selectedSeries.activeDays || 0} days`, detail: 'Minimum evidence: 30 days' },
                  { label: 'Reactions', value: selectedSeries.reactionCount || 0, detail: 'Current period' },
                ].map((metric) => (
                  <div key={metric.label} className="bg-white px-5 py-4">
                    <p className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400">{metric.label}</p>
                    <p className="mt-1.5 text-lg font-black text-neutral-900">{metric.value}</p>
                    <p className="mt-0.5 text-[9px] text-neutral-400">{metric.detail}</p>
                  </div>
                ))}
              </div>
            </Card>

            {!review ? (
              <Card className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
                  <div className="p-6 sm:p-7">
                    <div className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
                        <Gavel className="size-4.5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-neutral-900">Open a formal cancellation case</h4>
                        <p className="mt-1 max-w-xl text-xs leading-relaxed text-neutral-500">
                          A series cannot be cancelled from its ranking row. The EB Head must schedule a dedicated meeting with an odd number of voting members.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-3 sm:grid-cols-3">
                      {[
                        ['01', 'Schedule', 'Set the agenda, date and voting participants.'],
                        ['02', 'Vote', 'Every invited EB member chooses Continue or Cancel.'],
                        ['03', 'Finalize', 'The Head records the majority result without overriding it.'],
                      ].map(([number, title, description]) => (
                        <div key={number} className="rounded-2xl border border-neutral-150 bg-neutral-50/70 p-4">
                          <span className="text-[9px] font-black text-indigo-500">{number}</span>
                          <p className="mt-2 text-xs font-extrabold text-neutral-800">{title}</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-neutral-450">{description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col justify-center border-t border-neutral-100 bg-neutral-50/70 p-6 lg:border-l lg:border-t-0">
                    {isEbHead ? (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">EB Head action</p>
                        <Button
                          className="mt-3 h-11 w-full gap-2 rounded-xl bg-neutral-950 text-xs font-bold text-white hover:bg-neutral-800"
                          onClick={() => onScheduleMeeting(selectedSeries)}
                        >
                          <Calendar className="size-4" />
                          Schedule vote meeting
                        </Button>
                      </>
                    ) : (
                      <div className="text-center">
                        <Clock className="mx-auto size-6 text-neutral-300" />
                        <p className="mt-2 text-xs font-bold text-neutral-600">Awaiting EB Head</p>
                        <p className="mt-1 text-[10px] text-neutral-400">Only the Head can open this case.</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <>
                <Card className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-100 px-6 py-5 sm:px-7">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] text-indigo-500">Open meeting</p>
                        <h4 className="mt-1 text-sm font-extrabold text-neutral-900">{review.title}</h4>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-medium text-neutral-500">
                          <span className="inline-flex items-center gap-1.5"><Calendar className="size-3" />{new Date(review.dateTime).toLocaleString()}</span>
                          {review.location && <span className="inline-flex items-center gap-1.5"><MapPin className="size-3" />{review.location}</span>}
                          <span className="inline-flex items-center gap-1.5"><Users className="size-3" />{review.participantsCount} voters</span>
                        </div>
                      </div>
                      <div className="min-w-52">
                        <div className="flex items-center justify-between text-[10px] font-bold text-neutral-500">
                          <span>Vote completion</span>
                          <span>{review.votesCount}/{review.participantsCount}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                          <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${voteProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 sm:p-7">
                    <div className="mb-3 flex items-center justify-between">
                      <h5 className="text-xs font-extrabold text-neutral-800">Participant roll call</h5>
                      <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Individual status</span>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {review.participants.map((participant) => (
                        <div key={participant._id} className="rounded-2xl border border-neutral-150 bg-neutral-50/50 p-3.5">
                          <div className="flex items-center gap-3">
                            <div className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-black ${
                              participant.decision === 'cancel'
                                ? 'bg-rose-100 text-rose-700'
                                : participant.decision === 'continue'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-neutral-200 text-neutral-500'
                            }`}>
                              {participant.displayName?.[0] || '?'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-extrabold text-neutral-800">{participant.displayName}</p>
                                <Badge className={`shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold ${
                                  participant.decision === 'cancel'
                                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                                    : participant.decision === 'continue'
                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                      : 'border-neutral-200 bg-white text-neutral-400'
                                }`}>
                                  {participant.decision === 'cancel' ? 'Cancel' : participant.decision === 'continue' ? 'Continue' : 'Pending'}
                                </Badge>
                              </div>
                              <p className="mt-0.5 text-[9px] capitalize text-neutral-400">{participant.role?.replace('_', ' ')}</p>
                            </div>
                          </div>
                          {participant.comments && (
                            <p className="mt-3 flex gap-1.5 rounded-xl bg-white p-2 text-[9px] leading-relaxed text-neutral-500 ring-1 ring-neutral-100">
                              <MessageSquareText className="mt-0.5 size-3 shrink-0 text-neutral-300" />
                              {participant.comments}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                {review.isParticipant && (
                  <Card className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-sm">
                    <div className="border-b border-indigo-100 bg-indigo-50/40 px-6 py-4 sm:px-7">
                      <div className="flex items-center gap-3">
                        <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white">
                          <Gavel className="size-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-neutral-900">Cast your decision</h4>
                          <p className="mt-0.5 text-[10px] text-neutral-500">Your latest submission replaces your previous vote.</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4 p-6 sm:p-7">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => setDraftDecisions((current) => ({ ...current, [selectedSeries._id]: 'continue' }))}
                          className={`group rounded-2xl border-2 p-5 text-left transition-all ${
                            draftDecision === 'continue'
                              ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                              : 'border-neutral-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                              <ThumbsUp className="size-4.5" />
                            </div>
                            {draftDecision === 'continue' && <CheckCircle2 className="size-5 text-emerald-600" />}
                          </div>
                          <p className="mt-4 text-sm font-extrabold text-neutral-900">Continue publication</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">Keep the series active and continue monitoring its performance.</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftDecisions((current) => ({ ...current, [selectedSeries._id]: 'cancel' }))}
                          className={`group rounded-2xl border-2 p-5 text-left transition-all ${
                            draftDecision === 'cancel'
                              ? 'border-rose-500 bg-rose-50 shadow-sm'
                              : 'border-neutral-200 bg-white hover:border-rose-300 hover:bg-rose-50/40'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="grid size-10 place-items-center rounded-2xl bg-rose-100 text-rose-700">
                              <ThumbsDown className="size-4.5" />
                            </div>
                            {draftDecision === 'cancel' && <CheckCircle2 className="size-5 text-rose-600" />}
                          </div>
                          <p className="mt-4 text-sm font-extrabold text-neutral-900">Cancel publication</p>
                          <p className="mt-1 text-[10px] leading-relaxed text-neutral-500">End publication after the Head formally records the majority outcome.</p>
                        </button>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                          Rationale or evidence
                        </label>
                        <Textarea
                          value={comments[selectedSeries._id] || ''}
                          onChange={(event) => setComments((current) => ({ ...current, [selectedSeries._id]: event.target.value }))}
                          placeholder="Explain the evidence behind your decision for the meeting record..."
                          className="min-h-24 rounded-2xl border-neutral-200 bg-neutral-50/50 text-xs"
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button
                          className="h-10 min-w-40 gap-2 rounded-xl bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                          disabled={!draftDecision || workingAction === `vote:${selectedSeries._id}`}
                          onClick={submitVote}
                        >
                          {workingAction === `vote:${selectedSeries._id}` ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-4" />}
                          {review.userVote ? 'Update my vote' : 'Submit my vote'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className={`overflow-hidden rounded-3xl border shadow-sm ${
                  majorityDecision ? 'border-neutral-300 bg-white' : 'border-dashed border-neutral-250 bg-neutral-50/70'
                }`}>
                  {!majorityDecision ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                      <Clock className="size-8 text-neutral-300" />
                      <h4 className="mt-3 text-sm font-extrabold text-neutral-700">Waiting for all participants</h4>
                      <p className="mt-1 max-w-md text-xs text-neutral-400">
                        The final decision remains locked until every invited member has submitted a vote.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className={`border-b px-6 py-5 sm:px-7 ${
                        majorityDecision === 'cancel' ? 'border-rose-100 bg-rose-50/50' : 'border-emerald-100 bg-emerald-50/50'
                      }`}>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`grid size-11 place-items-center rounded-2xl ${
                              majorityDecision === 'cancel' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
                            }`}>
                              {majorityDecision === 'cancel' ? <Ban className="size-5" /> : <CheckCircle2 className="size-5" />}
                            </div>
                            <div>
                              <p className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-500">Majority result</p>
                              <h4 className="mt-0.5 text-base font-black text-neutral-900">
                                {majorityDecision === 'cancel' ? 'Cancel the series' : 'Continue the series'}
                              </h4>
                            </div>
                          </div>
                          <div className="flex overflow-hidden rounded-xl border border-white bg-white shadow-sm">
                            <div className="px-4 py-2.5 text-center">
                              <p className="text-lg font-black text-rose-700">{review.cancelVotes}</p>
                              <p className="text-[8px] font-bold uppercase text-neutral-400">Cancel</p>
                            </div>
                            <div className="w-px bg-neutral-100" />
                            <div className="px-4 py-2.5 text-center">
                              <p className="text-lg font-black text-emerald-700">{review.continueVotes}</p>
                              <p className="text-[8px] font-bold uppercase text-neutral-400">Continue</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-6 sm:p-7">
                        {isEbHead ? (
                          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div>
                              <label className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wider text-neutral-500">
                                {majorityDecision === 'cancel' ? 'Official cancellation reason (required)' : 'Closing note (optional)'}
                              </label>
                              <Textarea
                                value={finalReasons[selectedSeries._id] || ''}
                                onChange={(event) => setFinalReasons((current) => ({ ...current, [selectedSeries._id]: event.target.value }))}
                                placeholder={majorityDecision === 'cancel'
                                  ? 'Record the official reason communicated to the mangaka and editor...'
                                  : 'Record any monitoring conditions agreed by the board...'}
                                className="min-h-24 rounded-2xl border-neutral-200 bg-neutral-50/50 text-xs"
                              />
                            </div>
                            <Button
                              className={`h-11 min-w-52 gap-2 rounded-xl text-xs font-extrabold text-white ${
                                majorityDecision === 'cancel'
                                  ? 'bg-rose-600 hover:bg-rose-700'
                                  : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                              disabled={
                                workingAction === `finalize:${selectedSeries._id}`
                                || (majorityDecision === 'cancel' && !finalReasons[selectedSeries._id]?.trim())
                              }
                              onClick={finalizeDecision}
                            >
                              {workingAction === `finalize:${selectedSeries._id}`
                                ? <Loader2 className="size-4 animate-spin" />
                                : <Gavel className="size-4" />}
                              Finalize majority decision
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-4">
                            <Activity className="size-5 text-neutral-400" />
                            <div>
                              <p className="text-xs font-bold text-neutral-700">Awaiting formal closure</p>
                              <p className="mt-0.5 text-[10px] text-neutral-400">The majority is complete. The EB Head must now record the result.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
