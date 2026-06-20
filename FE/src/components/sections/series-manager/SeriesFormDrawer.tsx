import { useState, useEffect } from 'react'
import { Upload, X, Plus, Trash2, FileText, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '../../ui'
import { toGenreText, seriesCoverUrl, type SeriesData, type EditorUserData } from './utils'
import { uploadAPI } from '../../../lib/api'

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
    script?: string
    scriptFile?: string
    characterDesigns?: {
      name: string
      role: string
      description?: string
      image?: string
    }[]
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
  
  // Proposal fields
  const [script, setScript] = useState('')
  const [scriptFileUrl, setScriptFileUrl] = useState('')
  const [scriptFileName, setScriptFileName] = useState('')
  const [uploadingScript, setUploadingScript] = useState(false)
  const [characterDesigns, setCharacterDesigns] = useState<{ name: string; role: string; description?: string; image?: string }[]>([])
  
  // New character form fields
  const [newCharName, setNewCharName] = useState('')
  const [newCharRole, setNewCharRole] = useState('')
  const [newCharDesc, setNewCharDesc] = useState('')
  const [newCharImage, setNewCharImage] = useState('')
  const [uploadingSketch, setUploadingSketch] = useState(false)

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
        setScript(initialSeries.script || '')
        setScriptFileUrl(initialSeries.scriptFile || '')
        setScriptFileName(initialSeries.scriptFile ? 'Uploaded Storyboard Document' : '')
        setCharacterDesigns(initialSeries.characterDesigns || [])
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
        setScript('')
        setScriptFileUrl('')
        setScriptFileName('')
        setCharacterDesigns([])
        setNewCharName('')
        setNewCharRole('')
        setNewCharDesc('')
        setNewCharImage('')
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

  const handleScriptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingScript(true)
    try {
      const res = await uploadAPI.uploadFile(file, 'scripts')
      setScriptFileUrl(res.data.url)
      setScriptFileName(file.name)
    } catch (err) {
      console.error('Failed to upload script file:', err)
      alert('Failed to upload script file.')
    } finally {
      setUploadingScript(false)
    }
  }

  const handleSketchUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingSketch(true)
    try {
      const res = await uploadAPI.uploadFile(file, 'characters')
      setNewCharImage(res.data.url)
    } catch (err) {
      console.error('Failed to upload sketch image:', err)
      alert('Failed to upload character sketch.')
    } finally {
      setUploadingSketch(false)
    }
  }

  const handleAddCharacter = () => {
    if (!newCharName.trim()) return
    setCharacterDesigns((prev) => [
      ...prev,
      {
        name: newCharName.trim(),
        role: newCharRole.trim() || 'Supporting',
        description: newCharDesc.trim(),
        image: newCharImage,
      },
    ])
    // Reset inputs
    setNewCharName('')
    setNewCharRole('')
    setNewCharDesc('')
    setNewCharImage('')
  }

  const handleRemoveCharacter = (index: number) => {
    setCharacterDesigns((prev) => prev.filter((_, idx) => idx !== index))
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
      script: script.trim(),
      scriptFile: scriptFileUrl,
      characterDesigns,
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

          <div className="border-t border-neutral-100 my-6 pt-5 space-y-4">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="size-4 text-indigo-600" />
              Storyboard & Script
            </h4>

            {/* Script Text */}
            <div className="space-y-1.5">
              <label htmlFor="series-script" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                Script Outline (Markdown / Text)
              </label>
              <textarea
                id="series-script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Outline the story, theme, script breakdown, or plot beats..."
                className="min-h-32 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-950 placeholder:text-neutral-400 shadow-xs outline-hidden transition-all focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/20"
              />
            </div>

            {/* Script Document File Upload */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block">
                Attach Script Document (PDF)
              </span>
              <label className="flex h-12 cursor-pointer items-center justify-between rounded-xl border border-dashed border-neutral-200 hover:border-neutral-300 transition-colors px-4 bg-neutral-50/50 hover:bg-neutral-50">
                <span className="text-xs text-neutral-500 font-medium truncate max-w-[280px]">
                  {uploadingScript
                    ? 'Uploading script document...'
                    : scriptFileName || 'Choose a script PDF file...'}
                </span>
                <Upload className="size-4.5 text-neutral-400" />
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleScriptUpload}
                  disabled={uploadingScript}
                />
              </label>
              {scriptFileUrl && (
                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  Attached successfully!
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-neutral-100 my-6 pt-5 space-y-5">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="size-4 text-indigo-600" />
              Character Designs
            </h4>

            {/* Character Designs List */}
            {characterDesigns.length > 0 && (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {characterDesigns.map((char, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl relative group">
                    {char.image ? (
                      <img src={char.image} alt={char.name} className="size-12 rounded-lg object-cover border border-neutral-200 shrink-0" />
                    ) : (
                      <div className="size-12 rounded-lg bg-neutral-100 border border-dashed border-neutral-200 flex items-center justify-center text-xs text-neutral-400 font-medium shrink-0">
                        No Sketch
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-900 truncate">{char.name}</span>
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md truncate max-w-28">
                          {char.role}
                        </span>
                      </div>
                      {char.description && (
                        <p className="text-[10px] text-neutral-500 leading-normal line-clamp-2">
                          {char.description}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCharacter(index)}
                      className="absolute right-2 top-2 p-1 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Character Section */}
            <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/30 space-y-4">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 block">
                Add Character Design
              </span>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Input
                    placeholder="Character Name"
                    value={newCharName}
                    onChange={(e) => setNewCharName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    placeholder="Role (e.g. Hero, Villain, Sidekick)"
                    value={newCharRole}
                    onChange={(e) => setNewCharRole(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <textarea
                  placeholder="Describe character personality, background, and visual references..."
                  value={newCharDesc}
                  onChange={(e) => setNewCharDesc(e.target.value)}
                  className="min-h-16 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-950 placeholder:text-neutral-400 outline-hidden transition-all focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/20"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex h-16 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 hover:border-neutral-300 transition-colors p-2 bg-white hover:bg-neutral-50">
                  <Upload className="size-4 text-neutral-400 mb-0.5" />
                  <span className="text-[9px] font-semibold text-neutral-500 text-center truncate w-full px-1">
                    {uploadingSketch
                      ? 'Uploading Sketch...'
                      : newCharImage ? 'Sketch Uploaded' : 'Upload Sketch File'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleSketchUpload}
                    disabled={uploadingSketch}
                  />
                </label>

                <div className="relative h-16 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                  {newCharImage ? (
                    <img src={newCharImage} alt="Sketch Preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center text-[10px] text-neutral-400 font-medium">
                      Sketch Preview
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold h-8 rounded-xl bg-white hover:bg-neutral-50 border-neutral-200"
                onClick={handleAddCharacter}
                disabled={!newCharName.trim()}
              >
                <Plus className="size-3.5 mr-1" />
                Add to Character Designs
              </Button>
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
