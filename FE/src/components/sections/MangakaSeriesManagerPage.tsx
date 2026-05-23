import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookPlus, ImagePlus, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, Input } from '../ui'
import { seriesAPI, chaptersAPI, pagesAPI } from '../../lib/api'

type SeriesItem = {
  _id: string
  title: string
  description: string
  genre: string[]
  coverImage?: string
  status: string
  totalChapters: number
  mangakaId?: { displayName?: string; avatar?: string }
}

type ChapterItem = {
  _id: string
  chapterNumber: number
  title: string
  totalPages: number
}

export function MangakaSeriesManagerPage() {
  const [seriesList, setSeriesList] = useState<SeriesItem[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [chapters, setChapters] = useState<ChapterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingSeries, setCreatingSeries] = useState(false)
  const [deletingSeriesId, setDeletingSeriesId] = useState('')

  const [seriesTitle, setSeriesTitle] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')
  const [seriesGenres, setSeriesGenres] = useState('')
  const [seriesCoverFile, setSeriesCoverFile] = useState<File | null>(null)
  const [seriesCoverPreview, setSeriesCoverPreview] = useState('')

  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterNumber, setChapterNumber] = useState('')
  const [creatingChapter, setCreatingChapter] = useState(false)
  const [chapterDeletingId, setChapterDeletingId] = useState('')
  const [seriesMenuOpenId, setSeriesMenuOpenId] = useState('')

  const selectedSeries = useMemo(() => seriesList.find((item) => item._id === selectedSeriesId), [seriesList, selectedSeriesId])

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await seriesAPI.getAll()
      const items = res.data.series || []
      setSeriesList(items)
      const firstId = items[0]?._id || ''
      setSelectedSeriesId((prev) => prev || firstId)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData().catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedSeriesId) return
    chaptersAPI.getBySeries(selectedSeriesId).then((res) => setChapters(res.data.chapters || [])).catch(console.error)
  }, [selectedSeriesId])

  useEffect(() => {
    if (!seriesCoverFile) {
      setSeriesCoverPreview('')
      return
    }
    const preview = URL.createObjectURL(seriesCoverFile)
    setSeriesCoverPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [seriesCoverFile])

  const handleCreateSeries = async () => {
    if (creatingSeries) return
    const fd = new FormData()
    fd.append('title', seriesTitle.trim())
    fd.append('description', seriesDescription.trim())
    fd.append('genre', seriesGenres.trim())
    fd.append('status', 'Draft')
    if (seriesCoverFile) fd.append('coverImage', seriesCoverFile)

    setCreatingSeries(true)
    try {
      await seriesAPI.create(fd)
      setSeriesTitle('')
      setSeriesDescription('')
      setSeriesGenres('')
      setSeriesCoverFile(null)
      await loadData()
    } finally {
      setCreatingSeries(false)
    }
  }

  const handleCreateChapter = async () => {
    if (!selectedSeriesId || creatingChapter) return
    setCreatingChapter(true)
    try {
      await chaptersAPI.create(selectedSeriesId, {
        title: chapterTitle.trim(),
        ...(chapterNumber ? { chapterNumber: Number(chapterNumber) } : {}),
      })
      setChapterTitle('')
      setChapterNumber('')
      const res = await chaptersAPI.getBySeries(selectedSeriesId)
      setChapters(res.data.chapters || [])
    } finally {
      setCreatingChapter(false)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm('Delete this chapter? This action cannot be undone.')) return
    setChapterDeletingId(chapterId)
    try {
      await chaptersAPI.delete(chapterId)
      const res = await chaptersAPI.getBySeries(selectedSeriesId)
      setChapters(res.data.chapters || [])
    } finally {
      setChapterDeletingId('')
    }
  }

  const handleDeleteSeries = async (seriesId: string) => {
    if (!window.confirm('Delete this series? This action cannot be undone.')) return
    setDeletingSeriesId(seriesId)
    try {
      await seriesAPI.delete(seriesId)
      if (selectedSeriesId === seriesId) {
        setSelectedSeriesId('')
        setChapters([])
      }
      await loadData()
    } finally {
      setDeletingSeriesId('')
    }
  }

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedSeriesId || !e.target.files?.[0]) return
    const fd = new FormData()
    fd.append('coverImage', e.target.files[0])
    await seriesAPI.update(selectedSeriesId, fd)
    await loadData()
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="rounded-lg">
              <Link to="/studio"><ArrowLeft className="size-4" /></Link>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Mangaka series manager</h1>
              <p className="text-sm text-neutral-500">Create series, add chapters, and upload cover art.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Create series</h2>
              <BookPlus className="size-4 text-neutral-500" />
            </div>
            <Input value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} placeholder="Title" />
            <textarea className="min-h-24 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-900" value={seriesDescription} onChange={(e) => setSeriesDescription(e.target.value)} placeholder="Description" />
            <Input value={seriesGenres} onChange={(e) => setSeriesGenres(e.target.value)} placeholder="Genres: Action, Drama" />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-neutral-500">
              <ImagePlus className="size-4" />
              <span>{seriesCoverFile ? seriesCoverFile.name : 'Upload cover image'}</span>
              <input className="hidden" type="file" accept="image/*" onChange={(e) => setSeriesCoverFile(e.target.files?.[0] || null)} />
            </label>
            {seriesCoverPreview && <img src={seriesCoverPreview} alt="Cover preview" className="h-40 w-full rounded-xl object-cover" />}
            <Button
              className="w-full transition-opacity"
              onClick={handleCreateSeries}
              disabled={creatingSeries || !seriesTitle.trim() || !seriesDescription.trim() || !seriesGenres.trim()}
            >
              {creatingSeries ? 'Creating...' : 'Create series'}
            </Button>
          </Card>

          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Your series</h2>
              <span className="text-xs text-neutral-500">{seriesList.length}</span>
            </div>
            <div className={`space-y-2 max-h-[28rem] overflow-y-auto pr-1 transition-opacity ${creatingSeries ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              {seriesList.map((item) => {
                const menuOpen = seriesMenuOpenId === item._id
                return (
                  <div key={item._id} className="relative">
                    <button type="button" onClick={() => setSelectedSeriesId(item._id)} className={`w-full rounded-xl border p-3 text-left transition ${selectedSeriesId === item._id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-400'}`}>
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-neutral-100">
                          {item.coverImage ? <img src={item.coverImage} alt={item.title} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xs text-neutral-400">No cover</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-medium">{item.title}</p>
                            <Badge variant="secondary" className="text-[10px]">{item.status}</Badge>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.description}</p>
                          <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400">
                            <span>{item.totalChapters} chapters</span>
                            <span>•</span>
                            <span>{item.genre.join(', ')}</span>
                          </div>
                        </div>
                      </div>
                    </button>

                    <div className="absolute right-2 top-2">
                      <button
                        type="button"
                        onClick={() => setSeriesMenuOpenId(menuOpen ? '' : item._id)}
                        className="grid size-8 place-items-center rounded-lg bg-white/90 text-neutral-600 shadow-sm ring-1 ring-neutral-200 transition hover:bg-neutral-50"
                        title="More actions"
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {menuOpen && (
                        <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setSeriesMenuOpenId('')
                              handleDeleteSeries(item._id)
                            }}
                          >
                            <Trash2 className="size-4" />
                            Delete series
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold">Selected series</h2>
                <p className="text-sm text-neutral-500">Manage chapters and update the cover image for the selected series.</p>
              </div>
              {selectedSeries?.coverImage ? (
                <img src={selectedSeries.coverImage} alt={selectedSeries.title} className="h-24 w-24 rounded-xl object-cover" />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-xl bg-neutral-100 text-xs text-neutral-400">No cover</div>
              )}
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Upload cover</h3>
                  <ImagePlus className="size-4 text-neutral-500" />
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-600 hover:border-neutral-500">
                  <span>Choose new image</span>
                  <input className="hidden" type="file" accept="image/*" onChange={handleCoverUpload} />
                </label>
              </div>

              <div className="rounded-2xl border border-neutral-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Create chapter</h3>
                  <Plus className="size-4 text-neutral-500" />
                </div>
                <div className="space-y-3">
                  <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Chapter title" />
                  <Input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder="Chapter number (optional)" type="number" min="1" />
                  <Button onClick={handleCreateChapter} disabled={creatingChapter || !selectedSeriesId || !chapterTitle.trim()}>
                    {creatingChapter ? 'Adding...' : 'Add chapter'}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Chapters</h2>
                <p className="text-sm text-neutral-500">Browse and manage chapters in the current series.</p>
              </div>
              <span className="text-xs text-neutral-500">{chapters.length} items</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {chapters.map((chapter) => (
                <Card key={chapter._id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">Ch. {chapter.chapterNumber}</p>
                      <p className="mt-1 text-sm text-neutral-500">{chapter.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{chapter.totalPages || 0} pages</Badge>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="rounded-lg">Edit</Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-red-600 hover:bg-red-50"
                      onClick={() => handleDeleteChapter(chapter._id)}
                      disabled={chapterDeletingId === chapter._id}
                    >
                      {chapterDeletingId === chapter._id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  )
}
