import { X, Send, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Avatar, AvatarFallback } from '../../ui'
import { type SeriesData, type EditorUserData } from './utils'

interface EditorSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: () => Promise<void>
  selectedSeries: SeriesData | null
  saving: boolean
}

export function EditorSubmitModal({
  isOpen,
  onClose,
  onSubmit,
  selectedSeries,
  saving,
}: EditorSubmitModalProps) {
  const { t } = useTranslation()
  const handleConfirm = () => {
    onSubmit()
  }

  if (!isOpen) return null

  const isAssigned = !!selectedSeries?.editorId
  const editorInfo = selectedSeries?.editorId && typeof selectedSeries.editorId === 'object'
    ? selectedSeries.editorId as EditorUserData
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-neutral-100 animate-scale-up space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 tracking-tight flex items-center gap-2">
              <Send className="size-5 text-emerald-600" />
              {t('seriesManager.submitForReview', 'Submit for Editor Review')}
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              {t('seriesManager.submitDesc', 'Submit your manuscript draft to the Tantou Editor for formal review. During active review, editing will be locked.')}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-600 transition-colors"
          >
            <X className="size-4.5" />
          </button>
        </div>

        {/* Editor Info or Selector */}
        {isAssigned && editorInfo ? (
          <div className="rounded-2xl bg-neutral-50 p-4 border border-neutral-200/50 space-y-2.5">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
              {t('seriesManager.submitToAssigned', 'Submit directly to your assigned Tantou Editor:')}
            </p>
            <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-neutral-100 shadow-xs">
              <Avatar className="size-9 bg-neutral-200 text-neutral-700">
                <AvatarFallback className="text-[10px] font-bold">
                  {editorInfo.displayName?.[0] || 'E'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-neutral-900 truncate">
                  {editorInfo.displayName || editorInfo.username}
                </p>
                <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                  {editorInfo.email}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-amber-50 border border-amber-200/60 p-4 text-xs text-amber-850 flex items-start gap-2.5 leading-relaxed font-semibold">
            <AlertCircle className="size-4.5 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-extrabold text-amber-955">{t('seriesManager.noEditorAssignedAlert', 'No Editor Assigned Yet')}</p>
              <p className="mt-1 font-medium text-amber-800">
                {t('seriesManager.ebAssignHint', 'Your series will be submitted to the Editorial Board queue, and a Tantou Editor will be designated for you shortly.')}
              </p>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-end gap-2.5 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving
              ? t('common.loading', 'Loading...')
              : t('seriesManager.submitConfirm', 'Submit Draft')}
          </Button>
        </div>
      </div>
    </div>
  )
}
