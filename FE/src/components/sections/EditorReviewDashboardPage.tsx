import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, FileWarning, Send, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '../ui'
import { seriesAPI } from '../../lib/api'

type SeriesItem = {
  _id: string
  title: string
  description: string
  genre: string[]
  coverImage?: string
  status: string
  submissionNotes?: string
  reviewNotes?: string
  mangakaId?: { displayName?: string; avatar?: string }
  editorId?: { displayName?: string; avatar?: string }
  updatedAt?: string
}

const reviewActions = [
  { status: 'Needs Revision', label: 'Request Revision', description: 'Ask mangaka to fix and resubmit', icon: XCircle, tone: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50' },
  { status: 'Approved by Editor', label: 'Approve Editor', description: 'Pass to the next review stage', icon: CheckCircle2, tone: 'text-emerald-600', border: 'border-emerald-200', bg: 'bg-emerald-50' },
  { status: 'Board Review', label: 'Send to Board', description: 'Escalate for board decision', icon: Send, tone: 'text-blue-600', border: 'border-blue-200', bg: 'bg-blue-50' },
  { status: 'Rejected', label: 'Reject', description: 'Stop the current submission', icon: FileWarning, tone: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50' },
]

export function EditorReviewDashboardPage() {
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [reviewNotes, setReviewNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')

  const selectedSeries = useMemo(() => seriesList.find((item) => item._id === selectedSeriesId), [seriesList, selectedSeriesId])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await seriesAPI.getAll({ status: ['Submitted', 'Needs Revision', 'Approved by Editor', 'Board Review'] })
      const items = res.data.series || []
      setSeriesList(items)
      const firstSeries = items[0]
      setSelectedSeriesId((prev) => prev || firstSeries?._id || '')
      setReviewNotes(firstSeries?.reviewNotes || '')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch(console.error)
  }, [])

  useEffect(() => {
    setReviewNotes(selectedSeries?.reviewNotes || '')
  }, [selectedSeries])

  const handleAction = async (status: string) => {
    if (!selectedSeriesId) return
    setActionLoading(status)
    try {
      await seriesAPI.review(selectedSeriesId, {
        status,
        reviewNotes,
      })
      await loadData()
    } finally {
      setActionLoading('')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="rounded-lg">
                <Link to="/dashboard"><ArrowLeft className="size-4" /></Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Editor review dashboard</h1>
                <p className="text-sm text-neutral-500">Review submitted series and decide the next production step.</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px]">{seriesList.length} submitted</Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Submitted</p>
              <p className="mt-1 text-lg font-semibold text-neutral-950">{seriesList.length}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Selected</p>
              <p className="mt-1 text-lg font-semibold text-neutral-950">{selectedSeries ? selectedSeries.title : 'None'}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Current status</p>
              <p className="mt-1 text-lg font-semibold text-neutral-950">{selectedSeries?.status || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Submitted series</h2>
              <Clock3 className="size-4 text-neutral-500" />
            </div>
            <div className={`space-y-2 ${loading ? 'opacity-60' : ''}`}>
              {seriesList.map((item) => {
                const isSelected = selectedSeriesId === item._id
                return (
                  <button key={item._id} type="button" onClick={() => setSelectedSeriesId(item._id)} className={`w-full rounded-2xl border p-3 text-left transition ${isSelected ? 'border-neutral-900 bg-neutral-50 shadow-sm' : 'border-neutral-200 hover:border-neutral-400'}`}>
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-lg bg-neutral-100">
                        {item.coverImage ? <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[10px] text-neutral-400">No cover</div>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <Badge variant={isSelected ? 'default' : 'secondary'} className="text-[10px]">{item.status}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.description}</p>
                        <p className="mt-2 text-[10px] text-neutral-400">{item.genre.join(', ')}</p>
                      </div>
                    </div>
                  </button>
                )
              })}
              {seriesList.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-500">No submitted series yet.</div>}
            </div>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Review details</h2>
                <p className="text-sm text-neutral-500">Read submission notes and apply your decision.</p>
              </div>
              {selectedSeries?.coverImage ? (
                <img src={selectedSeries.coverImage} alt={selectedSeries.title} className="h-24 w-24 rounded-xl object-cover" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-xl bg-neutral-100 text-xs text-neutral-400">No cover</div>
              )}
            </div>

            {selectedSeries ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Series info</h3>
                      <Badge variant="secondary" className="text-[10px]">{selectedSeries.status}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-medium">{selectedSeries.title}</p>
                    <p className="mt-2 text-sm text-neutral-600">{selectedSeries.description}</p>
                    <p className="mt-3 text-xs text-neutral-400">Genres: {selectedSeries.genre.join(', ')}</p>
                    <p className="mt-3 text-xs text-neutral-400">Mangaka: {selectedSeries.mangakaId?.displayName || 'Unknown'}</p>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 p-4">
                    <h3 className="text-sm font-semibold">Submission note</h3>
                    <div className="mt-3 min-h-32 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 whitespace-pre-wrap">
                      {selectedSeries.submissionNotes?.trim() || 'No submission note.'}
                    </div>
                    <p className="mt-2 text-xs text-neutral-400">This note is written by the submitter and cannot be edited by reviewers.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Review note</h3>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Editable</span>
                  </div>
                  <textarea
                    className="mt-3 min-h-56 w-full rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add your review notes here..."
                  />
                  <div className="mt-3 flex items-center justify-between text-xs text-neutral-400">
                    <span>Visible to mangaka after your decision</span>
                    <span>{reviewNotes.trim().length} characters</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">Select a submitted series to start reviewing.</div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Actions</h2>
              <Badge variant="secondary" className="text-[10px]">Workflow control</Badge>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {reviewActions.map(({ status, label, description, icon: Icon, tone, border, bg }) => (
                <Button
                  key={status}
                  variant="outline"
                  className={`h-auto justify-start gap-3 rounded-2xl border px-4 py-4 text-left transition hover:shadow-sm ${tone} ${border} ${bg}`}
                  onClick={() => handleAction(status)}
                  disabled={!selectedSeriesId || actionLoading === status}
                >
                  <div className="flex items-start gap-3">
                    <Icon className="size-4 shrink-0 mt-0.5" />
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{actionLoading === status ? 'Processing...' : label}</span>
                      <span className="mt-1 text-[11px] text-neutral-500">{description}</span>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
