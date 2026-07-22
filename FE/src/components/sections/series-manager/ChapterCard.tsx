import { Pencil, Trash2, Send, BookOpen, Users, HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Progress } from '../../ui'
import { type ChapterData, type SeriesData } from './utils'

interface ChapterCardProps {
  chapter: ChapterData
  selectedSeries: SeriesData | null
  saving: boolean
  onEdit: (chapter: ChapterData) => void
  onDelete: (chapterId: string) => Promise<void>
}

export function ChapterCard({
  chapter,
  selectedSeries,
  saving,
  onEdit,
  onDelete,
}: ChapterCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const isPendingEditorAccepted = selectedSeries?.status === 'Pending_Editor'
    && selectedSeries.editorStatus === 'accepted'
  const isLocked = selectedSeries?.status === 'Pending_EB'
    || (selectedSeries?.status === 'Pending_Editor' && !isPendingEditorAccepted)
  const canSubmitForReview = selectedSeries?.status === 'Active' || isPendingEditorAccepted

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Draft':
        return 'bg-neutral-50 text-neutral-600 border-neutral-200'
      case 'Reviewing':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Approved':
        return t('seriesManager.chapterStatusApproved', 'Approved')
      case 'Draft':
        return t('seriesManager.chapterStatusDraft', 'Draft')
      case 'Reviewing':
        return t('seriesManager.chapterStatusReviewing', 'Reviewing')
      default:
        return status
    }
  }

  const handleDelete = async () => {
    await onDelete(chapter._id)
    setShowConfirmDelete(false)
  }

  return (
    <div className="group relative rounded-2xl border border-neutral-100 bg-white p-4.5 transition-all hover:border-neutral-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {t('seriesManager.chapterNumPrefix', 'Ch. {{num}}', { num: chapter.chapterNumber })}
          </span>
          <h4 className="mt-1 text-sm font-semibold text-neutral-900 group-hover:text-neutral-950 leading-snug">
            {chapter.title}
          </h4>
        </div>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${getStatusClass(
            chapter.status
          )}`}
        >
          {getStatusLabel(chapter.status)}
        </span>
      </div>

      {/* Progress & Stats section */}
      <div className="mt-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">
            <span>{t('seriesManager.progressLabel', 'Production Progress')}</span>
            <span className="font-bold text-neutral-900">{chapter.progress || 0}%</span>
          </div>
          <Progress value={chapter.progress || 0} className="h-1.5 bg-neutral-100/80" />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 font-medium pt-1">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="size-3.5 text-neutral-400" />
            {t('seriesManager.pagesCount', '{{count}} Pages', { count: chapter.totalPages || 0 })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3.5 text-neutral-400" />
            {t('seriesManager.collaboratorsCount', '{{count}} Collaborators', {
              count: chapter.collaborators?.length || 0,
            })}
          </span>
        </div>
      </div>

      {/* Hover/Focus Actions */}
      <div className="mt-4 flex items-center justify-end gap-2.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
        {showConfirmDelete ? (
          <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 px-2.5 py-1">
            <span className="text-[10px] font-bold text-red-800 flex items-center gap-1">
              <HelpCircle className="size-3 text-red-600" />
              {t('seriesManager.confirmDelete', 'Delete?')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] rounded-lg text-neutral-500 hover:bg-neutral-100"
              onClick={() => setShowConfirmDelete(false)}
              disabled={saving}
            >
              {t('common.no', 'No')}
            </Button>
            <Button
              className="h-6 px-2 text-[10px] rounded-lg bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={saving}
            >
              {t('common.yes', 'Yes')}
            </Button>
          </div>
        ) : (
          <>
            {chapter.status === 'Draft' && canSubmitForReview && (
              <Button
                variant="outline"
                size="sm"
                className="border-neutral-200 hover:border-neutral-300 text-neutral-800 h-8 rounded-xl px-3 text-xs font-semibold"
                disabled={isLocked || saving}
                onClick={() => navigate(`/studio?seriesId=${selectedSeries?._id}&chapterId=${chapter._id}&submitReview=true`)}
              >
                <Send className="mr-1.5 size-3.5" />
                {t('seriesManager.submitReview', 'Submit for Review')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="border-neutral-200 hover:border-neutral-300 text-neutral-800 h-8 rounded-xl px-2.5 text-xs font-semibold"
              disabled={isLocked}
              onClick={() => navigate(`/studio?seriesId=${selectedSeries?._id}&chapterId=${chapter._id}`)}
              title="Open in Studio Workspace"
            >
              <BookOpen className="size-3.5 text-neutral-600" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-neutral-200 hover:border-neutral-300 text-neutral-800 h-8 rounded-xl px-2.5 text-xs font-semibold"
              disabled={isLocked || saving}
              onClick={() => onEdit(chapter)}
              title="Edit Chapter"
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 h-8 rounded-xl px-2.5 text-xs font-semibold"
              disabled={isLocked || saving}
              onClick={() => setShowConfirmDelete(true)}
              title="Delete Chapter"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
