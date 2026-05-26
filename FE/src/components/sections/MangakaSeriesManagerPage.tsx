import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookOpen, Layers3, Pencil, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { Badge, Button, Card, Input, Tabs } from '../ui'
import { seriesAPI, chaptersAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'

function toGenreText(value: unknown): string {
  if (Array.isArray(value)) {
    const mapped = value.map(item => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) return parsed.join(', ')
          } catch {}
        }
      }
      return String(item)
    })
    const joined = mapped.join(', ')
    if (joined.startsWith('[') && joined.endsWith(']')) {
      try {
        const parsed = JSON.parse(joined)
        if (Array.isArray(parsed)) return parsed.join(', ')
      } catch {}
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

function seriesCoverUrl(coverImage?: string) {
  if (!coverImage) return ''
  if (coverImage.startsWith('http')) return coverImage
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  return `${base}${coverImage}`
}

interface SeriesData {
  _id: string
  title: string
  description?: string
  genre?: string
  coverImage?: string
  mangakaId?: string | { _id: string }
  status?: string
  totalChapters?: number
  rejectionNotes?: string
}

interface ChapterData {
  _id: string
  seriesId?: string | { _id: string }
  chapterNumber: number
  title: string
  status: string
  totalPages?: number
  progress?: number
  collaborators?: { userId: { _id: string; displayName: string; avatar?: string } }[]
}

interface EditorUserData {
  _id: string
  displayName?: string
  username: string
  email: string
}

export function MangakaSeriesManagerPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [seriesList, setSeriesList] = useState<SeriesData[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('series')
  
  const [editorsList, setEditorsList] = useState<EditorUserData[]>([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitSeriesId, setSubmitSeriesId] = useState('')
  const [selectedEditorId, setSelectedEditorId] = useState('')
  
  const [showSeriesForm, setShowSeriesForm] = useState(false)
  const [showEditSeriesForm, setShowEditSeriesForm] = useState(false)
  const [seriesTitle, setSeriesTitle] = useState('')
  const [seriesDescription, setSeriesDescription] = useState('')
  const [seriesGenre, setSeriesGenre] = useState('action, fantasy')
  const [seriesCoverUrlInput, setSeriesCoverUrlInput] = useState('')
  const [seriesCoverFile, setSeriesCoverFile] = useState<File | null>(null)
  const [seriesCoverPreview, setSeriesCoverPreview] = useState('')
  
  const [showChapterForm, setShowChapterForm] = useState(false)
  const [showEditChapterForm, setShowEditChapterForm] = useState(false)
  const [editingChapterId, setEditingChapterId] = useState('')
  const [chapterNumber, setChapterNumber] = useState('1')
  const [chapterTitle, setChapterTitle] = useState('Chapter 1')
  
  const selectedSeries = useMemo(() => seriesList.find((s) => s._id === selectedSeriesId), [seriesList, selectedSeriesId])
  const selectedChapters = useMemo(
    () => chapters.filter((chapter) => {
      const sId = chapter.seriesId && typeof chapter.seriesId === 'object'
        ? (chapter.seriesId as { _id: string })._id
        : chapter.seriesId
      return String(sId) === String(selectedSeriesId)
    }),
    [chapters, selectedSeriesId]
  )

  const ui = {
    title: t('seriesManager.title', 'Series Manager'),
    subtitle: t('seriesManager.subtitle', 'Create series, add chapters, and manage your production structure.'),
    refresh: t('common.refresh', 'Refresh'),
    newSeries: t('seriesManager.newSeries', 'New Series'),
    newChapter: t('seriesManager.newChapter', 'New Chapter'),
    edit: t('common.edit', 'Edit'),
    delete: t('common.delete', 'Delete'),
    save: t('common.save', 'Save'),
    seriesTab: t('seriesManager.seriesTab', 'Series'),
    chaptersTab: t('seriesManager.chaptersTab', 'Chapters'),
    yourSeries: t('seriesManager.yourSeries', 'Your Series'),
    seriesOwnerHint: t('seriesManager.seriesOwnerHint', 'Only series you own are shown here.'),
    createSeriesTitle: t('seriesManager.createSeriesTitle', 'Create Series'),
    editSeriesTitle: t('seriesManager.editSeriesTitle', 'Edit Series'),
    seriesTitle: t('seriesManager.seriesTitle', 'Series title'),
    seriesDescription: t('seriesManager.seriesDescription', 'Series description'),
    seriesGenres: t('seriesManager.seriesGenres', 'Genres, comma separated'),
    uploadCover: t('seriesManager.uploadCover', 'Upload cover image from device'),
    seriesCoverUrl: t('seriesManager.seriesCoverUrl', 'Cover image URL (optional)'),
    cancel: t('common.cancel', 'Cancel'),
    create: t('common.create', 'Create'),
    noSeries: t('seriesManager.noSeries', 'No series yet.'),
    detailsTitle: t('seriesManager.detailsTitle', 'Series details'),
    selectSeriesHint: t('seriesManager.selectSeriesHint', 'Select a series to view chapters'),
    chapterNumber: t('seriesManager.chapterNumber', 'Chapter number'),
    chapterTitle: t('seriesManager.chapterTitle', 'Chapter title'),
    noChapters: t('seriesManager.noChapters', 'No chapters yet.'),
    chapterListHint: t('seriesManager.chapterListHint', 'Quickly manage chapters of the selected series.'),
    noData: t('seriesManager.noData', 'No data.'),
    loading: t('common.loading', 'Loading...'),
    chaptersCount: t('seriesManager.chaptersCount', '{{count}} items'),
    pages: t('seriesManager.pages', 'Pages'),
    progress: t('seriesManager.progress', 'Progress'),
    collaborators: t('seriesManager.collaborators', 'Collaborators'),
    workspaceLabel: t('seriesManager.workspaceLabel', 'Mangaka workspace'),
    seriesCount: t('seriesManager.seriesCount', '{{count}} series'),
    editCover: t('seriesManager.editCover', 'Change cover'),
    editSeriesHint: t('seriesManager.editSeriesHint', 'Update title, description, genres, or cover.'),
    deleteSeriesConfirm: t('seriesManager.deleteSeriesConfirm', 'Delete this series? All chapters will also be removed from this manager view.'),
    deleteChapterConfirm: t('seriesManager.deleteChapterConfirm', 'Delete this chapter?'),
    chapterListTitle: t('seriesManager.chapterListTitle', 'Chapter list'),
    chapterCount: t('seriesManager.chapterCount', '{{count}} chapters'),
    chapterStats: t('seriesManager.chapterStats', 'Chapter stats'),
    totalPages: t('seriesManager.totalPages', 'Total pages'),
    avgProgress: t('seriesManager.avgProgress', 'Avg. progress'),
    totalCollaborators: t('seriesManager.totalCollaborators', 'Total collaborators'),
  }

  const loadData = async (preferredSeriesId?: string) => {
    setLoading(true)
    try {
      const res = await seriesAPI.getAll()
      const list = (res.data.series || []).filter((s: SeriesData) => {
        const mId = s.mangakaId && typeof s.mangakaId === 'object' ? s.mangakaId._id : s.mangakaId
        return String(mId) === String(user?._id)
      })
      setSeriesList(list)

      const nextSeriesId = preferredSeriesId && list.some((s: SeriesData) => s._id === preferredSeriesId)
        ? preferredSeriesId
        : (selectedSeriesId && list.some((s: SeriesData) => s._id === selectedSeriesId) ? selectedSeriesId : list[0]?._id || '')

      setSelectedSeriesId(nextSeriesId)
      if (nextSeriesId) {
        const chapterRes = await chaptersAPI.getBySeries(nextSeriesId)
        setChapters(chapterRes.data.chapters || [])
      } else {
        setChapters([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?._id) {
      Promise.resolve().then(() => {
        loadData().catch(() => {})
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id])

  useEffect(() => {
    seriesAPI.getEditors()
      .then((res) => {
        const list = res.data.editors || []
        setEditorsList(list)
        if (list.length > 0) {
          setSelectedEditorId(list[0]._id)
        }
      })
      .catch(console.error)
  }, [])

  const handleSubmitForApproval = async () => {
    if (!submitSeriesId || !selectedEditorId) return
    setSaving(true)
    try {
      await seriesAPI.update(submitSeriesId, {
        status: 'Pending_Editor',
        editorId: selectedEditorId
      })
      setShowSubmitModal(false)
      await loadData(selectedSeriesId)
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to submit series')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!selectedSeriesId) return
    chaptersAPI.getBySeries(selectedSeriesId)
      .then((res) => setChapters(res.data.chapters || []))
      .catch(() => setChapters([]))
  }, [selectedSeriesId])

  const handleCoverFileChange = (file?: File) => {
    if (!file) return
    setSeriesCoverFile(file)
    setSeriesCoverPreview(URL.createObjectURL(file))
  }

  const resetSeriesForm = () => {
    setSeriesTitle('')
    setSeriesDescription('')
    setSeriesGenre('action, fantasy')
    setSeriesCoverFile(null)
    setSeriesCoverPreview('')
    setSeriesCoverUrlInput('')
  }

  const openEditSeries = () => {
    if (!selectedSeries) return
    setSeriesTitle(selectedSeries.title || '')
    setSeriesDescription(selectedSeries.description || '')
    setSeriesGenre(toGenreText(selectedSeries.genre))
    setSeriesCoverUrlInput(selectedSeries.coverImage || '')
    setSeriesCoverPreview(seriesCoverUrl(selectedSeries.coverImage))
    setSeriesCoverFile(null)
    setShowEditSeriesForm(true)
  }

  const handleCreateSeries = async () => {
    if (!seriesTitle.trim() || !seriesDescription.trim()) return
    setSaving(true)
    try {
      const genre = seriesGenre.split(',').map((g) => g.trim()).filter(Boolean)
      const formData = new FormData()
      formData.append('title', seriesTitle.trim())
      formData.append('description', seriesDescription.trim())
      formData.append('genre', genre.join(', '))
      if (seriesCoverFile) formData.append('coverImageFile', seriesCoverFile)
      if (seriesCoverUrlInput.trim()) formData.append('coverImage', seriesCoverUrlInput.trim())

      const res = await seriesAPI.create(formData)
      resetSeriesForm()
      setShowSeriesForm(false)
      await loadData(res.data.series?._id)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateSeries = async () => {
    if (!selectedSeriesId || !seriesTitle.trim() || !seriesDescription.trim()) return
    setSaving(true)
    try {
      const genre = seriesGenre.split(',').map((g) => g.trim()).filter(Boolean)
      const formData = new FormData()
      formData.append('title', seriesTitle.trim())
      formData.append('description', seriesDescription.trim())
      formData.append('genre', genre.join(', '))
      if (seriesCoverFile) formData.append('coverImageFile', seriesCoverFile)
      if (seriesCoverUrlInput.trim()) formData.append('coverImage', seriesCoverUrlInput.trim())

      await seriesAPI.update(selectedSeriesId, formData)
      setShowEditSeriesForm(false)
      setSeriesCoverFile(null)
      await loadData(selectedSeriesId)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSeries = async () => {
    if (!selectedSeriesId) return
    if (!window.confirm(ui.deleteSeriesConfirm)) return
    setSaving(true)
    try {
      await seriesAPI.delete(selectedSeriesId)
      setSelectedSeriesId('')
      await loadData()
    } finally {
      setSaving(false)
    }
  }

  const handleCreateChapter = async () => {
    if (!selectedSeriesId || !chapterNumber.trim() || !chapterTitle.trim()) return
    setSaving(true)
    try {
      await chaptersAPI.create(selectedSeriesId, {
        chapterNumber: Number(chapterNumber),
        title: chapterTitle.trim(),
      })
      setChapterNumber(String((chapters.length || 0) + 1))
      setChapterTitle(`Chapter ${(chapters.length || 0) + 1}`)
      setShowChapterForm(false)
      await loadData(selectedSeriesId)
    } finally {
      setSaving(false)
    }
  }

  const openEditChapter = (chapter: ChapterData) => {
    setEditingChapterId(chapter._id)
    setShowChapterForm(false)
    setChapterNumber(String(chapter.chapterNumber || 1))
    setChapterTitle(chapter.title || '')
    setShowEditChapterForm(true)
  }

  const handleUpdateChapter = async () => {
    if (!editingChapterId || !chapterNumber.trim() || !chapterTitle.trim()) return
    setSaving(true)
    try {
      await chaptersAPI.update(editingChapterId, {
        chapterNumber: Number(chapterNumber),
        title: chapterTitle.trim(),
      })
      setShowEditChapterForm(false)
      setEditingChapterId('')
      await loadData(selectedSeriesId)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    if (!window.confirm(ui.deleteChapterConfirm)) return
    setSaving(true)
    try {
      await chaptersAPI.delete(chapterId)
      await loadData(selectedSeriesId)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-neutral-500">{ui.loading}</div>
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <div className="rounded-[28px] border border-neutral-200 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-6 text-white shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">{ui.workspaceLabel}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{ui.title}</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">{ui.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/15" onClick={() => loadData().catch(() => {})}>
              <RefreshCw className="mr-2 size-4" /> {ui.refresh}
            </Button>
            <Button variant="secondary" className="bg-white hover:bg-neutral-100" onClick={() => setShowSeriesForm((v) => !v)}>
              <Plus className="mr-2 size-4" /> {ui.newSeries}
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50">{t('seriesManager.seriesCount', '{{count}} Series', { count: seriesList.length })}</div>
            <div className="mt-2 text-2xl font-semibold">{seriesList.length}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50">{t('seriesManager.chaptersCount', '{{count}} Items', { count: chapters.length })}</div>
            <div className="mt-2 text-2xl font-semibold">{chapters.length}</div>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.18em] text-white/50">{ui.chapterStats}</div>
            <div className="mt-2 text-2xl font-semibold">{selectedSeries ? selectedChapters.length : 0}</div>
          </div>
        </div>
      </div>

      <Tabs
        tabs={[
          { key: 'series', label: ui.seriesTab, count: seriesList.length },
          { key: 'chapters', label: ui.chaptersTab, count: chapters.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'series' && (
        <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">{ui.yourSeries}</h2>
                <p className="text-xs text-neutral-500">{ui.seriesOwnerHint}</p>
              </div>
            </div>

            {showSeriesForm && (
              <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 p-4">
                <div className="text-sm font-semibold text-neutral-900">{ui.createSeriesTitle}</div>
                <Input value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} placeholder={ui.seriesTitle} />
                <textarea value={seriesDescription} onChange={(e) => setSeriesDescription(e.target.value)} placeholder={ui.seriesDescription} className="min-h-24 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none" />
                <Input value={seriesGenre} onChange={(e) => setSeriesGenre(e.target.value)} placeholder={ui.seriesGenres} />
                <Input value={seriesCoverUrlInput} onChange={(e) => setSeriesCoverUrlInput(e.target.value)} placeholder={ui.seriesCoverUrl} />
                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-600 hover:bg-neutral-50">
                  <Upload className="size-4" />
                  <span>{seriesCoverFile ? seriesCoverFile.name : ui.uploadCover}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFileChange(e.target.files?.[0])} />
                </label>
                {seriesCoverPreview && <img src={seriesCoverPreview} alt="Series cover preview" className="h-40 w-full rounded-xl object-cover" />}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowSeriesForm(false)}>{ui.cancel}</Button>
                  <Button onClick={handleCreateSeries} disabled={saving}>{ui.create}</Button>
                </div>
              </div>
            )}

            <div className="mt-4 space-y-3">
              {seriesList.length === 0 ? (
                <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">{ui.noSeries}</div>
              ) : (
                seriesList.map((series) => {
                  const isActive = selectedSeriesId === series._id
                  return (
                    <button
                      key={series._id}
                      type="button"
                      onClick={() => setSelectedSeriesId(series._id)}
                      className={`w-full rounded-2xl border p-4 text-left transition-all ${isActive ? 'border-neutral-900 shadow-sm' : 'border-neutral-200 hover:border-neutral-400'}`}
                    >
                      <div className="flex items-start gap-3">
                        {series.coverImage ? (
                          <img src={series.coverImage} alt={series.title} className="h-20 w-14 rounded-xl object-cover" />
                        ) : (
                          <div className="grid h-20 w-14 place-items-center rounded-xl bg-neutral-100 text-neutral-400">
                            <BookOpen className="size-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate font-medium text-neutral-950">{series.title}</h3>
                              <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{series.description}</p>
                            </div>
                            <Badge variant="secondary" className="shrink-0">{series.status}</Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neutral-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1"><BookOpen className="size-3" /> {series.totalChapters || 0} chapters</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-1"><Layers3 className="size-3" /> {toGenreText(series.genre)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-neutral-200 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-800 px-5 py-4 text-white">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-white/50">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">{ui.detailsTitle}</span>
                  </div>
                  <h2 className="mt-2 truncate text-xl font-semibold">{selectedSeries?.title || ui.selectSeriesHint}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">{ui.editSeriesHint}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" className="bg-white/10 text-white hover:bg-white/15" disabled={!selectedSeries || ['Pending_Editor', 'Pending_EB'].includes(selectedSeries.status || '')} onClick={openEditSeries}>
                    <Pencil className="mr-2 size-4" /> {ui.edit}
                  </Button>
                  <Button variant="ghost" className="bg-red-500/20 text-white hover:bg-red-500/30" disabled={!selectedSeries || ['Pending_Editor', 'Pending_EB'].includes(selectedSeries.status || '')} onClick={handleDeleteSeries}>
                    <Trash2 className="mr-2 size-4" /> {ui.delete}
                  </Button>
                </div>
              </div>
            </div>

            {selectedSeries && (
              <div className="grid gap-0 xl:grid-cols-[320px_1fr]">
                <div className="border-b border-neutral-200 bg-neutral-50 xl:border-b-0 xl:border-r">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
                    {selectedSeries.coverImage ? (
                      <img src={seriesCoverUrl(selectedSeries.coverImage)} alt={selectedSeries.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-neutral-400">
                        <BookOpen className="size-12" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-white text-neutral-950">{selectedSeries.status}</Badge>
                        <Badge className="bg-white/15 text-white">{selectedSeries.totalChapters || 0} chapters</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2 text-xs text-neutral-600">
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1">{toGenreText(selectedSeries.genre)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-neutral-600">{selectedSeries.description}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-neutral-200 bg-white p-2.5 text-center min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 leading-tight truncate" title={ui.totalPages}>{ui.totalPages}</div>
                        <div className="mt-1.5 text-base font-bold text-neutral-950">{selectedChapters.reduce((sum, chapter) => sum + (chapter.totalPages || 0), 0)}</div>
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-white p-2.5 text-center min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 leading-tight truncate" title={ui.avgProgress}>{ui.avgProgress}</div>
                        <div className="mt-1.5 text-base font-bold text-neutral-950">{selectedChapters.length ? Math.round(selectedChapters.reduce((sum, chapter) => sum + (chapter.progress || 0), 0) / selectedChapters.length) : 0}%</div>
                      </div>
                      <div className="rounded-xl border border-neutral-200 bg-white p-2.5 text-center min-w-0">
                        <div className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 leading-tight truncate" title={ui.totalCollaborators}>{ui.totalCollaborators}</div>
                        <div className="mt-1.5 text-base font-bold text-neutral-950">{selectedChapters.reduce((sum, chapter) => sum + (chapter.collaborators?.length || 0), 0)}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2">
                      <Button variant="outline" className="w-full" disabled={!selectedSeries || ['Pending_Editor', 'Pending_EB'].includes(selectedSeries.status || '')} onClick={openEditSeries}>
                        <Pencil className="mr-2 size-4" /> {ui.editCover}
                      </Button>
                      
                      {['Draft', 'Rejected', ''].includes(selectedSeries.status || '') && (
                        <div className="mt-2 space-y-2">
                          {selectedSeries.rejectionNotes && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                              <span className="font-semibold">{t('seriesManager.rejectionFeedback', 'Feedback:')} </span>
                              {selectedSeries.rejectionNotes}
                            </div>
                          )}
                          <Button
                            className="w-full bg-neutral-950 text-white hover:bg-neutral-900 border-none shadow-xs text-xs font-semibold rounded-xl h-10"
                            onClick={() => {
                              setSubmitSeriesId(selectedSeries._id)
                              setShowSubmitModal(true)
                            }}
                          >
                            {t('seriesManager.submitForApproval', 'Submit to Tantou Editor')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-950">{ui.chapterListTitle}</h3>
                      <p className="text-xs text-neutral-500">{ui.chapterListHint}</p>
                    </div>
                    <Button disabled={!selectedSeriesId || selectedSeries?.status === 'Pending_Editor' || selectedSeries?.status === 'Pending_EB'} onClick={() => setShowChapterForm(true)}>
                      <Plus className="mr-2 size-4" /> {ui.newChapter}
                    </Button>
                  </div>

                  {['Pending_Editor', 'Pending_EB'].includes(selectedSeries?.status || '') && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 leading-relaxed">
                      {t('seriesManager.lockedWarning', 'This series is currently in the review queue. Structure updates and chapter modifications are locked.')}
                    </div>
                  )}

                  {showChapterForm && (
                    <div className="mt-4 grid gap-3 rounded-2xl border border-neutral-200 p-4 sm:grid-cols-2">
                      <Input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder={ui.chapterNumber} />
                      <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder={ui.chapterTitle} />
                      <div className="sm:col-span-2 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowChapterForm(false)}>{ui.cancel}</Button>
                        <Button onClick={handleCreateChapter} disabled={saving}>{ui.create}</Button>
                      </div>
                    </div>
                  )}

                  {showEditSeriesForm && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="text-sm font-semibold text-neutral-950">{ui.editSeriesTitle}</div>
                      <Input value={seriesTitle} onChange={(e) => setSeriesTitle(e.target.value)} placeholder={ui.seriesTitle} />
                      <textarea value={seriesDescription} onChange={(e) => setSeriesDescription(e.target.value)} placeholder={ui.seriesDescription} className="min-h-24 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none" />
                      <Input value={seriesGenre} onChange={(e) => setSeriesGenre(e.target.value)} placeholder={ui.seriesGenres} />
                      <Input value={seriesCoverUrlInput} onChange={(e) => setSeriesCoverUrlInput(e.target.value)} placeholder={ui.seriesCoverUrl} />
                      <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-600 hover:bg-white">
                        <Upload className="size-4" />
                        <span>{seriesCoverFile ? seriesCoverFile.name : ui.uploadCover}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleCoverFileChange(e.target.files?.[0])} />
                      </label>
                      {seriesCoverPreview && <img src={seriesCoverPreview} alt="Series cover preview" className="h-40 w-full rounded-xl object-cover" />}
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowEditSeriesForm(false)}>{ui.cancel}</Button>
                        <Button onClick={handleUpdateSeries} disabled={saving}>{ui.save}</Button>
                      </div>
                    </div>
                  )}

                  {showEditChapterForm && (
                    <div className="mt-4 space-y-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <div className="text-sm font-semibold text-neutral-950">{ui.edit} {ui.chapterListTitle}</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Input value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} placeholder={ui.chapterNumber} />
                        <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder={ui.chapterTitle} />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowEditChapterForm(false)}>{ui.cancel}</Button>
                        <Button onClick={handleUpdateChapter} disabled={saving}>{ui.save}</Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 space-y-3">
                    {selectedChapters.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                        {ui.noChapters}
                      </div>
                    ) : (
                      selectedChapters.map((chapter) => (
                        <div key={chapter._id} className="group rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Ch. {chapter.chapterNumber}</p>
                              <h4 className="mt-1 text-sm font-medium text-neutral-950">{chapter.title}</h4>
                            </div>
                            <Badge variant="secondary">{chapter.status}</Badge>
                          </div>
                          <div className="mt-3 grid gap-2 text-xs text-neutral-500 sm:grid-cols-3">
                            <div>{ui.pages}: {chapter.totalPages || 0}</div>
                            <div>{ui.progress}: {chapter.progress || 0}%</div>
                            <div>{ui.collaborators}: {chapter.collaborators?.length || 0}</div>
                          </div>
                          <div className="mt-4 flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                            <Button variant="outline" size="sm" disabled={selectedSeries?.status === 'Pending_Editor' || selectedSeries?.status === 'Pending_EB'} onClick={() => openEditChapter(chapter)}>
                              <Pencil className="mr-2 size-4" /> {ui.edit}
                            </Button>
                            <Button variant="outline" size="sm" className="border-red-200 text-red-600 hover:bg-red-50" disabled={selectedSeries?.status === 'Pending_Editor' || selectedSeries?.status === 'Pending_EB'} onClick={() => handleDeleteChapter(chapter._id)}>
                              <Trash2 className="mr-2 size-4" /> {ui.delete}
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'chapters' && (
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold">{ui.chapterListTitle}</h2>
              <p className="text-xs text-neutral-500">{ui.chapterListHint}</p>
            </div>
            <Badge variant="secondary">{t('seriesManager.chaptersCount', '{{count}} items', { count: selectedChapters.length })}</Badge>
          </div>
          <div className="space-y-3">
            {selectedChapters.map((chapter) => (
              <div key={chapter._id} className="rounded-2xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-neutral-400">Ch. {chapter.chapterNumber}</p>
                    <h3 className="text-sm font-medium">{chapter.title}</h3>
                  </div>
                  <Badge variant="secondary">{chapter.status}</Badge>
                </div>
              </div>
            ))}
            {selectedChapters.length === 0 && <div className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">{ui.noData}</div>}
          </div>
        </Card>
      )}

      {/* ── Submit to Editor Approval Modal ────────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-neutral-950">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wider">
                {t('seriesManager.submitForReview', 'Submit for Editor Review')}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {t('seriesManager.submitDesc', 'Choose a designated Tantou Editor to review your series and chapters production structure. During active review, editing will be locked.')}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-neutral-600 block">
                {t('seriesManager.chooseEditor', 'Select designated Tantou Editor:')}
              </label>
              {editorsList.length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                  {t('seriesManager.noEditorsFound', 'No editors available to review at this time.')}
                </div>
              ) : (
                <select
                  className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-xs bg-neutral-50 focus:bg-white focus:outline-none transition-all font-semibold shadow-xs"
                  value={selectedEditorId}
                  onChange={(e) => setSelectedEditorId(e.target.value)}
                >
                  {editorsList.map((e) => (
                    <option key={e._id} value={e._id}>
                      {e.displayName || e.username} ({e.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold border-neutral-200"
                onClick={() => setShowSubmitModal(false)}
                disabled={saving}
              >
                {ui.cancel}
              </Button>
              <Button
                size="sm"
                className="rounded-xl px-4 text-xs font-semibold bg-neutral-950 text-white hover:bg-neutral-900"
                onClick={handleSubmitForApproval}
                disabled={!selectedEditorId || saving || editorsList.length === 0}
              >
                {saving ? ui.loading : t('seriesManager.submitConfirm', 'Submit Draft')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
