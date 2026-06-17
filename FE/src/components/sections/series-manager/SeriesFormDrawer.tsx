import { useState, useEffect } from 'react'
import { Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '../../ui'
import { toGenreText, seriesCoverUrl, type SeriesData, type EditorUserData } from './utils'

interface SeriesFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: {
    title: string
    description: string
    genre: string
    coverFile: File | null
    coverUrl: string
    editorId: string
  }) => Promise<void>
  editorsList: EditorUserData[]
  initialSeries: SeriesData | null
  saving: boolean
}

export function SeriesFormDrawer({
  isOpen,
  onClose,
  onSave,
  editorsList,
  initialSeries,
  saving,
}: SeriesFormDrawerProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('action, fantasy')
  const [coverUrlInput, setCoverUrlInput] = useState('')
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState('')
  const [designatedEditorId, setDesignatedEditorId] = useState('')

  useEffect(() => {
    if (initialSeries) {
      Promise.resolve().then(() => {
        setTitle(initialSeries.title || '')
        setDescription(initialSeries.description || '')
        setGenre(toGenreText(initialSeries.genre))
        setCoverUrlInput(initialSeries.coverImage || '')
        setCoverPreview(seriesCoverUrl(initialSeries.coverImage))
        setCoverFile(null)
        const eId =
          initialSeries.editorId && typeof initialSeries.editorId === 'object'
            ? (initialSeries.editorId as { _id: string })._id
            : (initialSeries.editorId as string) || ''
        setDesignatedEditorId(eId)
      })
    } else {
      Promise.resolve().then(() => {
        setTitle('')
        setDescription('')
        setGenre('action, fantasy')
        setCoverUrlInput('')
        setCoverPreview('')
        setCoverFile(null)
        setDesignatedEditorId('')
      })
    }
  }, [initialSeries, isOpen])

  // ESC key listener to close drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleCoverFileChange = (file?: File) => {
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    await onSave({
      title: title.trim(),
      description: description.trim(),
      genre: genre.trim(),
      coverFile,
      coverUrl: coverUrlInput.trim(),
      editorId: designatedEditorId,
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/20 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Body */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-neutral-100 bg-white shadow-2xl transition-transform duration-300 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-6 py-4">
          <h3 className="text-base font-semibold text-neutral-900">
            {initialSeries ? t('seriesManager.editSeriesTitle', 'Edit Series') : t('seriesManager.createSeriesTitle', 'Create Series')}
          </h3>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {/* Title */}
          <div className="space-y-1.5">
            <label htmlFor="series-title" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.seriesTitle', 'Series Title')} <span className="text-red-500">*</span>
            </label>
            <Input
              id="series-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('seriesManager.seriesTitlePlaceholder', 'e.g. My Legendary Manga')}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="series-desc" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.seriesDescription', 'Series Description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              id="series-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('seriesManager.seriesDescPlaceholder', 'Provide an engaging summary of your series...')}
              className="min-h-28 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 shadow-xs outline-hidden transition-all focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/20"
              required
            />
          </div>

          {/* Genres */}
          <div className="space-y-1.5">
            <label htmlFor="series-genre" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.seriesGenres', 'Genres (comma separated)')}
            </label>
            <Input
              id="series-genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="e.g. Action, Fantasy, Adventure"
            />
          </div>

          {/* Editor selection */}
          <div className="space-y-1.5">
            <label htmlFor="series-editor" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.earlyDesignateEditor', 'Designated Tantou Editor (Optional)')}
            </label>
            <select
              id="series-editor"
              className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-sm bg-white focus:outline-hidden focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/20 transition-all text-neutral-950 shadow-xs"
              value={designatedEditorId}
              onChange={(e) => setDesignatedEditorId(e.target.value)}
            >
              <option value="">{t('seriesManager.noEditor', 'None - Designate Later')}</option>
              {editorsList.map((e) => (
                <option key={e._id} value={e._id}>
                  {e.displayName || e.username} ({e.email})
                </option>
              ))}
            </select>
          </div>

          {/* Cover image upload */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block">
              {t('seriesManager.coverImageLabel', 'Cover Image')}
            </label>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-200 hover:border-neutral-300 transition-colors p-3 bg-neutral-50/50 hover:bg-neutral-50">
                <Upload className="size-5 text-neutral-400 mb-1" />
                <span className="text-[10px] font-medium text-neutral-600 text-center truncate w-full">
                  {coverFile ? coverFile.name : t('seriesManager.uploadCover', 'Upload Cover File')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleCoverFileChange(e.target.files?.[0])}
                />
              </label>

              <div className="relative h-24 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                {coverPreview ? (
                  <img src={coverPreview} alt="Cover Preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-xs text-neutral-400 font-medium">
                    {t('seriesManager.noPreview', 'No Preview')}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block mb-1">
                {t('seriesManager.orUrl', 'Or Image URL')}
              </span>
              <Input
                value={coverUrlInput}
                onChange={(e) => setCoverUrlInput(e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex justify-end gap-2.5 border-t border-neutral-100 px-6 py-4 bg-neutral-50/50">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving} size="sm">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !title.trim() || !description.trim()} size="sm">
            {saving ? t('common.saving', 'Saving...') : initialSeries ? t('common.save', 'Save Changes') : t('common.create', 'Create Series')}
          </Button>
        </div>
      </div>
    </div>
  )
}
