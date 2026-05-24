import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Clock3, Filter, FileText, RefreshCw, TriangleAlert } from 'lucide-react'
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
  workflowStage?: string
  updatedAt?: string
}

const statusFilters = [
  { id: 'all', label: 'All drafts' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'revision', label: 'Needs revision' },
  { id: 'review', label: 'Under review' },
  { id: 'published', label: 'Published' },
]

export function MangakaSubmissionStatusPage() {
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const loadSeries = async () => {
    setLoading(true)
    try {
      const res = await seriesAPI.getAll()
      setSeriesList(res.data.series || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSeries().catch(console.error)
  }, [])

  const filtered = useMemo(() => {
    return seriesList.filter((item) => {
      if (filter === 'submitted') return item.status === 'Submitted'
      if (filter === 'revision') return item.status === 'Needs Revision'
      if (filter === 'review') return ['Submitted', 'Needs Revision', 'Approved by Editor', 'Board Review'].includes(item.status)
      if (filter === 'published') return item.status === 'Published'
      return true
    })
  }, [seriesList, filter])

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link to="/studio/series"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Submission status</h1>
              <p className="text-sm text-neutral-500">Monitor the review progress of all submitted drafts and manuscripts.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="rounded-lg" onClick={() => loadSeries()}>
            <RefreshCw className="mr-2 size-4" /> Refresh
          </Button>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Filter className="size-4 text-neutral-500" /> Filters
            </div>
            <div className="space-y-2">
              {statusFilters.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${filter === option.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <main className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center text-sm text-neutral-500">Loading submissions...</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="mx-auto size-10 text-neutral-300" />
              <p className="mt-3 text-sm font-medium">No series found</p>
              <p className="mt-1 text-sm text-neutral-500">Submitted works and review updates will appear here.</p>
            </Card>
          ) : (
            filtered.map((item) => (
              <Card key={item._id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl bg-neutral-100">
                      {item.coverImage ? <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-neutral-400">No cover</div>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-sm font-semibold">{item.title}</h2>
                        <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-neutral-600">{item.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Recently updated'}</span>
                        <span>•</span>
                        <span>{item.genre.join(', ')}</span>
                      </div>
                      {item.submissionNotes && <p className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-sm text-neutral-600">Submission notes: {item.submissionNotes}</p>}
                      {item.reviewNotes && <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">Review notes: {item.reviewNotes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="rounded-full text-[10px]">{item.workflowStage || 'mangaka'}</Badge>
                    {item.status === 'Needs Revision' && (
                      <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700">
                        <TriangleAlert className="size-3.5" /> Action needed
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </main>
      </div>
    </div>
  )
}
