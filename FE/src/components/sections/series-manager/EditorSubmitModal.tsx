import { useState, useEffect } from 'react'
import { X, Send, UserCheck, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Avatar, AvatarFallback } from '../../ui'
import { type SeriesData, type EditorUserData } from './utils'

interface EditorSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (editorId: string) => Promise<void>
  editorsList: EditorUserData[]
  selectedSeries: SeriesData | null
  modalMode: 'invite' | 'submit'
  saving: boolean
}

export function EditorSubmitModal({
  isOpen,
  onClose,
  onSubmit,
  editorsList,
  selectedSeries,
  modalMode,
  saving,
}: EditorSubmitModalProps) {
  const { t } = useTranslation()
  const [selectedEditorId, setSelectedEditorId] = useState('')

  useEffect(() => {
    if (selectedSeries?.editorId) {
      const eId = typeof selectedSeries.editorId === 'object'
        ? selectedSeries.editorId._id
        : selectedSeries.editorId
      Promise.resolve().then(() => {
        setSelectedEditorId(eId)
      })
    } else if (editorsList.length > 0) {
      Promise.resolve().then(() => {
        setSelectedEditorId(editorsList[0]._id)
      })
    }
  }, [selectedSeries, editorsList, isOpen])

  const handleConfirm = () => {
    if (!selectedEditorId) return
    onSubmit(selectedEditorId)
  }

  if (!isOpen) return null

  const isAssigned = selectedSeries?.editorId && selectedSeries?.editorStatus === 'accepted'
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
              {modalMode === 'invite' ? (
                <>
                  <UserCheck className="size-5 text-blue-600" />
                  {t('seriesManager.inviteEditorTitle', 'Invite Tantou Editor')}
                </>
              ) : (
                <>
                  <Send className="size-5 text-emerald-600" />
                  {t('seriesManager.submitForReview', 'Submit for Editor Review')}
                </>
              )}
            </h3>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              {modalMode === 'invite'
                ? t('seriesManager.inviteDesc', 'Invite a designated Tantou Editor to collaborate. They will have access to view and comment on your draft in real-time before you formally submit.')
                : t('seriesManager.submitDesc', 'Submit your manuscript draft to your Tantou Editor for formal review. During active review, editing will be locked.')}
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
              {t('seriesManager.submitToAssigned', 'Submit directly to your pre-assigned Tantou Editor:')}
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wider block">
              {t('seriesManager.chooseEditor', 'Select designated Tantou Editor:')}
            </label>
            {editorsList.length === 0 ? (
              <div className="rounded-2xl bg-amber-50 border border-amber-200/60 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                <AlertCircle className="size-4.5 shrink-0 mt-0.5 text-amber-600" />
                <p>{t('seriesManager.noEditorsFound', 'No editors available to review at this time.')}</p>
              </div>
            ) : (
              <select
                className="w-full h-10 rounded-xl border border-neutral-200 px-3 text-sm bg-neutral-50 focus:bg-white focus:outline-hidden focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/20 transition-all font-semibold text-neutral-950 shadow-xs"
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
            disabled={!selectedEditorId || saving || (!isAssigned && editorsList.length === 0)}
          >
            {saving
              ? t('common.loading', 'Loading...')
              : modalMode === 'invite'
              ? t('seriesManager.sendInvitation', 'Send Invitation')
              : t('seriesManager.submitConfirm', 'Submit Draft')}
          </Button>
        </div>
      </div>
    </div>
  )
}
