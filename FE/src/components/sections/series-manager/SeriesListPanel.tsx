import { useState, useMemo } from 'react'
import { BookOpen, Layers3, Plus, Search, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '../../ui'
import { toGenreText, seriesCoverUrl, type SeriesData } from './utils'

interface SeriesListPanelProps {
  seriesList: SeriesData[]
  selectedSeriesId: string
  onSelectSeries: (id: string) => void
  onNewSeriesClick: () => void
}

export function SeriesListPanel({
  seriesList,
  selectedSeriesId,
  onSelectSeries,
  onNewSeriesClick,
}: SeriesListPanelProps) {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSeries = useMemo(() => {
    return seriesList.filter((s) => {
      const titleMatch = s.title.toLowerCase().includes(searchQuery.toLowerCase())
      const descMatch = s.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false
      const genreMatch = toGenreText(s.genre).toLowerCase().includes(searchQuery.toLowerCase())
      return titleMatch || descMatch || genreMatch
    })
  }, [seriesList, searchQuery])

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Pending_Editor':
      case 'Pending_EB':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Rejected':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-neutral-50 text-neutral-600 border-neutral-200'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'Active':
        return t('seriesManager.statusActive', 'Active')
      case 'Pending_Editor':
        return t('seriesManager.statusPendingEditor', 'Under Review')
      case 'Pending_EB':
        return t('seriesManager.statusPendingEB', 'EB Review')
      case 'Rejected':
        return t('seriesManager.statusRejected', 'Needs Revision')
      default:
        return status || t('seriesManager.statusDraft', 'Draft')
    }
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] border border-neutral-100 bg-white shadow-md overflow-hidden rounded-3xl">
      {/* Search & Header */}
      <div className="p-4 border-b border-neutral-100 bg-neutral-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900 tracking-tight flex items-center gap-1.5">
              <Sparkles className="size-4 text-neutral-600" />
              {t('seriesManager.yourSeries', 'Your Series')}
            </h2>
            <p className="text-xs text-neutral-500">{t('seriesManager.seriesOwnerHint', 'Only series you own are shown here.')}</p>
          </div>
          <button
            onClick={onNewSeriesClick}
            type="button"
            className="inline-flex size-8 items-center justify-center rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 transition-colors shadow-xs"
            aria-label={t('seriesManager.newSeries', 'New Series')}
          >
            <Plus className="size-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('seriesManager.searchSeriesPlaceholder', 'Search by title, genre...')}
            className="w-full h-9 rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-xs outline-hidden transition-all focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400/20"
          />
        </div>
      </div>

      {/* Series Cards Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredSeries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <BookOpen className="size-8 text-neutral-300 mb-2" />
            <p className="text-xs font-medium text-neutral-500">{t('seriesManager.noSeriesFound', 'No series found')}</p>
            <p className="text-[10px] text-neutral-400 mt-0.5">{t('seriesManager.noSeriesFoundDesc', 'Try a different search term or create a new series.')}</p>
          </div>
        ) : (
          filteredSeries.map((series) => {
            const isActive = selectedSeriesId === series._id
            return (
              <button
                key={series._id}
                type="button"
                onClick={() => onSelectSeries(series._id)}
                className={`group relative w-full flex items-start gap-3 rounded-2xl border p-3 text-left transition-all outline-hidden ${
                  isActive
                    ? 'border-neutral-950 bg-neutral-50/50 shadow-sm ring-1 ring-neutral-950/10'
                    : 'border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50/30'
                }`}
              >
                {/* Active Indicator Line */}
                {isActive && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-neutral-950" />
                )}

                {/* Cover Preview */}
                <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-xl bg-neutral-100 shadow-xs border border-neutral-200/50">
                  {series.coverImage ? (
                    <img
                      src={seriesCoverUrl(series.coverImage)}
                      alt={series.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-neutral-400">
                      <BookOpen className="size-4" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-1">
                    <h3 className="truncate font-medium text-xs text-neutral-900 group-hover:text-neutral-950 leading-tight">
                      {series.title}
                    </h3>
                  </div>

                  <p className="mt-1 line-clamp-2 text-[10px] text-neutral-500 leading-normal">
                    {series.description || t('seriesManager.noDescription', 'No description available.')}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase ${getStatusBadgeClass(
                        series.status
                      )}`}
                    >
                      {getStatusLabel(series.status)}
                    </span>
                    {series.totalChapters !== undefined && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] text-neutral-600 font-medium border border-neutral-200/30">
                        <BookOpen className="size-2.5" />
                        {series.totalChapters}
                      </span>
                    )}
                    {series.genre && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9px] text-neutral-600 font-medium border border-neutral-200/30 truncate max-w-[100px]">
                        <Layers3 className="size-2.5" />
                        {toGenreText(series.genre)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </Card>
  )
}
