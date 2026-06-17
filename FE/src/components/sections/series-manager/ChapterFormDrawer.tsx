import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '../../ui'
import { type ChapterData } from './utils'

interface ChapterFormDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { chapterNumber: number; title: string }) => Promise<void>
  saving: boolean
  initialChapter: ChapterData | null
  nextChapterNumber: number
}

export function ChapterFormDrawer({
  isOpen,
  onClose,
  onSave,
  saving,
  initialChapter,
  nextChapterNumber,
}: ChapterFormDrawerProps) {
  const { t } = useTranslation()
  const [chapterNum, setChapterNum] = useState(String(nextChapterNumber))
  const [title, setTitle] = useState(`Chapter ${nextChapterNumber}`)

  useEffect(() => {
    if (initialChapter) {
      Promise.resolve().then(() => {
        setChapterNum(String(initialChapter.chapterNumber))
        setTitle(initialChapter.title || '')
      })
    } else {
      Promise.resolve().then(() => {
        setChapterNum(String(nextChapterNumber))
        setTitle(`Chapter ${nextChapterNumber}`)
      })
    }
  }, [initialChapter, nextChapterNumber, isOpen])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chapterNum.trim() || !title.trim()) return
    await onSave({
      chapterNumber: Number(chapterNum),
      title: title.trim(),
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
            {initialChapter ? t('seriesManager.editChapterTitle', 'Edit Chapter') : t('seriesManager.createChapterTitle', 'New Chapter')}
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
          {/* Chapter Number (read-only/disabled for consistency, or editable) */}
          <div className="space-y-1.5">
            <label htmlFor="chapter-number" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.chapterNumber', 'Chapter Number')}
            </label>
            <Input
              id="chapter-number"
              type="number"
              value={chapterNum}
              disabled
              className="bg-neutral-50 cursor-not-allowed text-neutral-500 font-semibold"
            />
          </div>

          {/* Chapter Title */}
          <div className="space-y-1.5">
            <label htmlFor="chapter-title" className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.chapterTitle', 'Chapter Title')} <span className="text-red-500">*</span>
            </label>
            <Input
              id="chapter-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('seriesManager.chapterTitlePlaceholder', 'e.g. The Beginning of a Journey')}
              required
            />
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex justify-end gap-2.5 border-t border-neutral-100 px-6 py-4 bg-neutral-50/50">
          <Button variant="outline" type="button" onClick={onClose} disabled={saving} size="sm">
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={saving || !title.trim()} size="sm">
            {saving ? t('common.saving', 'Saving...') : initialChapter ? t('common.save', 'Save Changes') : t('common.create', 'Create Chapter')}
          </Button>
        </div>
      </div>
    </div>
  )
}
