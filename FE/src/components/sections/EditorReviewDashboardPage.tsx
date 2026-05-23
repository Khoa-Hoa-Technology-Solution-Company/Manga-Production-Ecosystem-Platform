import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, Clock3, FileWarning, Send, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Input } from '../ui'
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
  { status: 'Needs Revision', label: 'Request Revision', icon: XCircle, tone: 'text-red-600' },
  { status: 'Approved by Editor', label: 'Approve Editor', icon: CheckCircle2, tone: 'text-emerald-600' },
  { status: 'Board Review', label: 'Send to Board', icon: Send, tone: 'text-blue-600' },
  { status: 'Rejected', label: 'Reject', icon: FileWarning, tone: 'text-amber-600' },
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
      const res = await seriesAPI.getAll({ status: 'Submitted' })
      const items = res.data.series || []
      setSeriesList(items)
      setSelectedSeriesId((prev) => prev || items[0]?._id || '')
      setReviewNotes(items[0]?.reviewNotes || '')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch(console.error)
  }, [])

  useEffect(() => {
    setReviewNotes(selectedSeries?.reviewNotes || selectedSeries?.submissionNotes || '')
  }, [selectedSeriesId])

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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
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
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_1fr]">
        <aside className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Submitted series</h2>
              <Clock3 className="size-4 text-neutral-500" />
            </div>
            <div className={`space-y-2 ${loading ? 'opacity-60' : ''}`}>
              {seriesList.map((item) => (
                <button key={item._id} type="button" onClick={() => setSelectedSeriesId(item._id)} className={`w-full rounded-2xl border p-3 text-left transition ${selectedSeriesId === item._id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}>
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-lg bg-neutral-100">
                      {item.coverImage ? <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[10px] text-neutral-400">No cover</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.description}</p>
                      <p className="mt-2 text-[10px] text-neutral-400">{item.genre.join(', ')}</p>
                    </div>
                  </div>
                </button>
              ))}
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
              <div className="mt-5 grid gap-4 md:grid-cols-2">
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
                  <h3 className="text-sm font-semibold">Submission / review notes</h3>
                  <textarea
                    className="mt-3 min-h-40 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add review notes here..."
                  />
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
              {reviewActions.map(({ status, label, icon: Icon, tone }) => (
                <Button
                  key={status}
                  variant="outline"
                  className={`h-auto justify-start gap-3 rounded-2xl border-neutral-200 px-4 py-4 text-left ${tone}`}
                  onClick={() => handleAction(status)}
                  disabled={!selectedSeriesId || actionLoading === status}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{actionLoading === status ? 'Processing...' : label}</span>
                </Button>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
