import { Pencil, Trash2, BookOpen, Layers3, Users, Send } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Button, Avatar, AvatarFallback, Card } from '../../ui'
import { toGenreText, seriesCoverUrl, type SeriesData, type ChapterData, type EditorUserData } from './utils'
import { WorkflowTimeline } from './WorkflowTimeline'
import { ChapterCard } from './ChapterCard'
import { ProposalDetailView } from './ProposalDetailView'

interface SeriesDetailPanelProps {
  selectedSeries: SeriesData | null
  selectedChapters: ChapterData[]
  saving: boolean
  onEditSeries: () => void
  onDeleteSeries: () => Promise<void>
  onSubmitForApprovalClick: () => void
  onNewChapterClick: () => void
  onEditChapter: (chapter: ChapterData) => void
  onDeleteChapter: (chapterId: string) => Promise<void>
}

export function SeriesDetailPanel({
  selectedSeries,
  selectedChapters,
  saving,
  onEditSeries,
  onDeleteSeries,
  onSubmitForApprovalClick,
  onNewChapterClick,
  onEditChapter,
  onDeleteChapter,
}: SeriesDetailPanelProps) {
  const { t } = useTranslation()
  const [showConfirmDeleteSeries, setShowConfirmDeleteSeries] = useState(false)

  if (!selectedSeries) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] border border-dashed border-neutral-200 bg-neutral-50/30 rounded-3xl p-8 text-center">
        <BookOpen className="size-12 text-neutral-300 mb-3" />
        <h3 className="text-sm font-semibold text-neutral-600">
          {t('seriesManager.selectSeriesHint', 'Select a series to view chapters')}
        </h3>
        <p className="text-xs text-neutral-400 mt-1 max-w-[280px] leading-normal">
          {t('seriesManager.selectSeriesHintDesc', 'Choose a series from the list on the left to manage its details and chapters.')}
        </p>
      </div>
    )
  }

  const isSeriesMetadataLocked = ['Pending_Editor', 'Pending_EB'].includes(selectedSeries.status || '')
  const isChapterProductionLocked = selectedSeries.status === 'Pending_EB'
    || (selectedSeries.status === 'Pending_Editor' && selectedSeries.editorStatus !== 'accepted')
  const canDeleteSeries = selectedSeries.status === 'Draft'

  // Calculate statistics
  const totalPages = selectedChapters.reduce((sum, chapter) => sum + (chapter.totalPages || 0), 0)
  const avgProgress = selectedChapters.length
    ? Math.round(selectedChapters.reduce((sum, chapter) => sum + (chapter.progress || 0), 0) / selectedChapters.length)
    : 0
  const totalCollaborators = selectedChapters.reduce((sum, chapter) => sum + (chapter.collaborators?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Series Header Card */}
      <div className="border border-neutral-100 bg-white shadow-md rounded-3xl overflow-hidden">
        {/* Banner with cover + info */}
        <div className="p-6 sm:p-8 flex flex-col md:flex-row gap-6 items-start border-b border-neutral-100">
          {/* Cover Art */}
          <div className="relative aspect-[3/4] w-32 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 border border-neutral-200/50 shadow-md">
            {selectedSeries.coverImage ? (
              <img
                src={seriesCoverUrl(selectedSeries.coverImage)}
                alt={selectedSeries.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full place-items-center text-neutral-400">
                <BookOpen className="size-10" />
              </div>
            )}
          </div>

          {/* Details & Description */}
          <div className="min-w-0 flex-1 space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight">
                  {selectedSeries.title}
                </h2>
                {(selectedSeries.tags?.length || selectedSeries.genre) && (
                  <p className="text-xs text-neutral-400 mt-1.5 flex items-center gap-1 font-semibold uppercase tracking-wider">
                    <Layers3 className="size-3 text-neutral-400" />
                    {toGenreText(selectedSeries.tags?.length ? selectedSeries.tags : selectedSeries.genre)}
                  </p>
                )}
              </div>

              {/* Top Panel Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {showConfirmDeleteSeries ? (
                  <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 px-2.5 py-1">
                    <span className="text-[10px] font-bold text-red-800">
                      {t('seriesManager.deleteConfirmShort', 'Delete Series?')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-[10px] rounded-lg text-neutral-500 hover:bg-neutral-100"
                      onClick={() => setShowConfirmDeleteSeries(false)}
                      disabled={saving}
                    >
                      {t('common.no', 'No')}
                    </Button>
                    <Button
                      className="h-7 px-2 text-[10px] rounded-lg bg-red-600 text-white hover:bg-red-700"
                      onClick={onDeleteSeries}
                      disabled={saving}
                    >
                      {t('common.yes', 'Yes')}
                    </Button>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 px-3 rounded-xl text-xs font-semibold"
                      disabled={isSeriesMetadataLocked || saving}
                      onClick={onEditSeries}
                    >
                      <Pencil className="mr-1.5 size-3.5" />
                      {t('common.edit', 'Edit')}
                    </Button>
                    {canDeleteSeries && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-xl text-xs font-semibold border-red-200 text-red-600 hover:bg-red-50"
                        disabled={saving}
                        onClick={() => setShowConfirmDeleteSeries(true)}
                      >
                        <Trash2 className="mr-1.5 size-3.5" />
                        {t('common.delete', 'Delete')}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            <p className="text-sm text-neutral-600 leading-relaxed font-medium">
              {selectedSeries.description || t('seriesManager.noDescription', 'No description available.')}
            </p>

            {/* Rejection Notes */}
            {selectedSeries.rejectionNotes && (
              <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-xs text-red-800 flex items-start gap-3">
                <span className="mt-1 flex size-2 shrink-0 rounded-full bg-red-500" />
                <div>
                  <span className="font-bold">{t('seriesManager.rejectionFeedback', 'Editor Feedback:')} </span>
                  <p className="mt-1 leading-normal font-medium">{selectedSeries.rejectionNotes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Workflow & Handshake details */}
        <div className="p-6 sm:p-8 bg-neutral-50/50 grid gap-6 lg:grid-cols-2">
          {/* Workflow Timeline */}
          <WorkflowTimeline status={selectedSeries.status || 'Draft'} />

          {/* Tantou Collab Details */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-4.5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                {t('seriesManager.tantouEditorCollaboration', 'Tantou Collaboration')}
              </span>
              <div>
                {selectedSeries.editorId ? (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md flex items-center gap-1.5 border ${selectedSeries.editorStatus === 'accepted'
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-amber-700 bg-amber-50 border-amber-200'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${selectedSeries.editorStatus === 'accepted' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                    {selectedSeries.editorStatus === 'accepted'
                      ? t('seriesManager.statusAccepted', 'Accepted')
                      : t('seriesManager.statusPendingInvite', 'Pending Editor Response')}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {t('seriesManager.awaitingAssignment', 'Awaiting Assignment')}
                  </span>
                )}
              </div>
            </div>

            {/* Editor Detail Row */}
            {selectedSeries.editorId ? (
              <div className="flex items-center gap-2.5 bg-neutral-50/50 p-2.5 rounded-xl border border-neutral-100">
                <Avatar className="size-8 bg-neutral-200 text-neutral-700">
                  <AvatarFallback className="text-[10px] font-bold">
                    {(typeof selectedSeries.editorId === 'object'
                      ? selectedSeries.editorId.displayName || ''
                      : ''
                    )?.[0] || 'E'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-800 truncate">
                    {typeof selectedSeries.editorId === 'object'
                      ? selectedSeries.editorId.displayName || ''
                      : t('seriesManager.tantouEditor', 'Tantou Editor')}
                  </p>
                  {typeof selectedSeries.editorId === 'object' && (
                    <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                      {(selectedSeries.editorId as EditorUserData).email}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-neutral-500 italic pl-1 leading-relaxed bg-neutral-50/50 p-3 rounded-xl border border-neutral-100">
                {t('seriesManager.awaitingEditorAssignmentDesc', 'A Tantou Editor will be designated by the Editorial Board once submitted.')}
              </p>
            )}

            {/* Submit Draft Button */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              {['Draft', 'Rejected', ''].includes(selectedSeries.status || '') && (
                <Button className="w-full text-xs font-semibold h-9 rounded-xl flex items-center gap-1.5" onClick={onSubmitForApprovalClick}>
                  <Send className="size-3.5" />
                  {t('seriesManager.submitForReviewLabel', 'Submit for Editorial Review')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Series Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-neutral-100 bg-white p-4.5 shadow-sm text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-center gap-1">
            <BookOpen className="size-3.5" />
            {t('seriesManager.totalPages', 'Total Pages')}
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{totalPages}</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-white p-4.5 shadow-sm text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-center gap-1">
            <Layers3 className="size-3.5" />
            {t('seriesManager.avgProgress', 'Avg. Progress')}
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{avgProgress}%</p>
        </div>
        <div className="rounded-2xl border border-neutral-100 bg-white p-4.5 shadow-sm text-center">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-center gap-1">
            <Users className="size-3.5" />
            {t('seriesManager.totalCollaborators', 'Total Collaborators')}
          </div>
          <p className="mt-2 text-2xl font-bold text-neutral-900">{totalCollaborators}</p>
        </div>
      </div>

      {/* Proposal Details (Script & Character Designs) */}
      <Card className="p-6 border border-neutral-100 shadow-md rounded-3xl space-y-4">
        <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-widest flex items-center gap-1.5 mb-2">
          Series Script & Character Concepts
        </h4>
        <ProposalDetailView
          script={selectedSeries.script}
          scriptFile={selectedSeries.scriptFile}
          characterDesigns={selectedSeries.characterDesigns}
        />
      </Card>

      {/* Chapter List Card */}
      <Card className="p-6 border border-neutral-100 shadow-md rounded-3xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-1.5">
              <BookOpen className="size-4.5 text-neutral-600" />
              {t('seriesManager.chapterListTitle', 'Chapter List')}
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              {t('seriesManager.chapterListHint', 'Quickly manage chapters of the selected series.')}
            </p>
          </div>

          <Button disabled={isChapterProductionLocked} onClick={onNewChapterClick} className="h-9 rounded-xl px-3.5 text-xs font-semibold">
            {t('seriesManager.newChapter', 'New Chapter')}
          </Button>
        </div>

        {selectedSeries.status === 'Pending_Editor' && selectedSeries.editorStatus === 'accepted' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-800 leading-relaxed font-semibold">
            {t(
              'seriesManager.editorProductionHint',
              'The editor accepted the assignment. Create or open a chapter in Studio, add pages, then submit it for review. After at least one chapter is approved, the editor can forward the series to the Editorial Board.'
            )}
          </div>
        )}

        {/* Lock Info message if review queue active */}
        {isChapterProductionLocked && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-800 leading-relaxed font-semibold">
            {t(
              'seriesManager.lockedWarning',
              selectedSeries.status === 'Pending_EB'
                ? 'This series is awaiting Editorial Board review. Chapter production is temporarily locked.'
                : 'Chapter production opens after the assigned editor accepts the invitation.'
            )}
          </div>
        )}

        {/* Chapters Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {selectedChapters.length === 0 ? (
            <div className="sm:col-span-2 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-8 text-center">
              <BookOpen className="size-10 text-neutral-300 mx-auto mb-2.5" />
              <p className="text-xs font-semibold text-neutral-500">{t('seriesManager.noChapters', 'No chapters yet.')}</p>
              <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px] mx-auto leading-normal">
                {t('seriesManager.noChaptersDesc', 'Start building your story by creating the first chapter.')}
              </p>
            </div>
          ) : (
            selectedChapters.map((chapter) => (
              <ChapterCard
                key={chapter._id}
                chapter={chapter}
                selectedSeries={selectedSeries}
                saving={saving}
                onEdit={onEditChapter}
                onDelete={onDeleteChapter}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  )
}
