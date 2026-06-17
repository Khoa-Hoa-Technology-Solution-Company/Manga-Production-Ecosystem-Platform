import { Search, UserPlus, Users, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Input } from '../../ui'
import { type SeriesData, type DedicatedAssistantData, type UserData } from './utils'

interface AssistantsPanelProps {
  selectedSeriesId: string
  selectedSeries: SeriesData | null
  dedicatedAssistants: DedicatedAssistantData[]
  assistantSearchQuery: string
  assistantSearchResults: UserData[]
  addingAssistant: boolean
  loadingAssistants: boolean
  onSearchAssistants: (query: string) => void
  onAddAssistant: (userId: string) => void
  onRemoveAssistant: (userId: string) => void
}

export function AssistantsPanel({
  selectedSeriesId,
  selectedSeries,
  dedicatedAssistants,
  assistantSearchQuery,
  assistantSearchResults,
  addingAssistant,
  loadingAssistants,
  onSearchAssistants,
  onAddAssistant,
  onRemoveAssistant,
}: AssistantsPanelProps) {
  const { t } = useTranslation()

  if (!selectedSeriesId || selectedSeries?.status !== 'Active') {
    return null
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      {/* Dedicated Assistants List */}
      <Card className="p-5 flex flex-col min-h-[450px] border border-neutral-100 shadow-md rounded-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
              <Users className="size-4.5 text-blue-600" />
              {t('seriesManager.dedicatedAssistants', 'Dedicated Assistants')}
            </h2>
            <p className="text-xs text-neutral-500 mt-1 leading-normal">
              {t('seriesManager.dedicatedDesc', 'Assistants permanently tied to this series. They can see all dedicated tasks.')}
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">{dedicatedAssistants.length}</Badge>
        </div>

        {loadingAssistants ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="size-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </div>
        ) : dedicatedAssistants.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/50 p-6 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-neutral-100 mb-3 shadow-2xs">
              <Users className="size-5 text-neutral-400" />
            </div>
            <p className="text-xs font-semibold text-neutral-600">{t('seriesManager.noDedicated', 'No dedicated assistants yet')}</p>
            <p className="text-[10px] text-neutral-400 mt-1 max-w-[200px] leading-normal">
              {t('seriesManager.noDedicatedDesc', 'Search and add assistants to start collaborating permanently.')}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2.5">
            {dedicatedAssistants.map((da) => {
              const assistantUser = da.userId && typeof da.userId === 'object' ? da.userId : null
              const userId = assistantUser?._id || (typeof da.userId === 'string' ? da.userId : '')
              return (
                <div
                  key={userId}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3 hover:border-neutral-300 transition-all shadow-2xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 font-bold text-xs shadow-3xs">
                      {assistantUser?.displayName?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate leading-tight">
                        {assistantUser?.displayName || userId}
                      </p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">{assistantUser?.email}</p>
                      {assistantUser?.skills && assistantUser.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {assistantUser.skills.slice(0, 3).map((skill: string) => (
                            <span
                              key={skill}
                              className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[8px] font-semibold text-blue-600 border border-blue-100"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-8 p-0 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 shrink-0"
                    onClick={() => onRemoveAssistant(userId)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Add Assistants + Info */}
      <Card className="p-5 border border-neutral-100 shadow-md rounded-3xl space-y-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            <UserPlus className="size-4.5 text-emerald-600" />
            {t('seriesManager.addAssistant', 'Add Dedicated Assistant')}
          </h3>
          <p className="text-xs text-neutral-500 mt-1 leading-normal">
            {t('seriesManager.addAssistantDesc', 'Search for an assistant by name or email to add them permanently to this series.')}
          </p>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <Input
            value={assistantSearchQuery}
            onChange={(e) => onSearchAssistants(e.target.value)}
            placeholder={t('seriesManager.searchAssistant', 'Search assistants by name...')}
            className="pl-10"
          />
        </div>

        {/* Search Results */}
        {assistantSearchResults.length > 0 && (
          <div className="space-y-2 border border-neutral-100 bg-neutral-50/30 p-3 rounded-2xl max-h-[200px] overflow-y-auto">
            {assistantSearchResults.map((u: UserData) => {
              const isAlready = dedicatedAssistants.some((da) => {
                const aId = typeof da.userId === 'object' && da.userId ? da.userId._id : da.userId
                return aId === u._id
              })
              return (
                <div
                  key={u._id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-3xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600 font-bold text-xs">
                      {u.displayName?.[0] || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-neutral-900 truncate leading-tight">{u.displayName}</p>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">{u.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl text-xs h-8 px-3.5"
                    disabled={isAlready || addingAssistant}
                    onClick={() => onAddAssistant(u._id)}
                  >
                    {isAlready ? (
                      t('seriesManager.alreadyAdded', 'Added')
                    ) : (
                      <>
                        <UserPlus className="size-3.5 mr-1.5" />
                        {t('common.add', 'Add')}
                      </>
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4.5 space-y-3.5">
          <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
            {t('seriesManager.assistantTypes', 'Types of Assistants')}
          </h4>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-200 bg-white p-3.5 shadow-3xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-blue-100 shadow-3xs">
                  <Users className="size-3 text-blue-600" />
                </span>
                <span className="text-xs font-bold text-blue-900">{t('seriesManager.dedicatedType', 'Dedicated')}</span>
              </div>
              <p className="text-[10px] text-blue-700 leading-normal">
                {t(
                  'seriesManager.dedicatedTypeDesc',
                  'Permanently assigned to your series. They see all dedicated tasks and can work across chapters.'
                )}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white p-3.5 shadow-3xs">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex size-6 items-center justify-center rounded-lg bg-emerald-100 shadow-3xs">
                  <Search className="size-3 text-emerald-600" />
                </span>
                <span className="text-xs font-bold text-emerald-900">{t('seriesManager.freelanceType', 'Freelance')}</span>
              </div>
              <p className="text-[10px] text-emerald-700 leading-normal">
                {t(
                  'seriesManager.freelanceTypeDesc',
                  'Pick up individual tasks from the marketplace. Any assistant can accept open freelance tasks.'
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
