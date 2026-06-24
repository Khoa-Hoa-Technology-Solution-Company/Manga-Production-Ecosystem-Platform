import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, ChevronLeft, ChevronRight, MoreHorizontal, Plus, Loader2 } from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from '../ui'
import { dashboardAPI } from '../../lib/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

type WorkflowItem = {
  _id: string
  chapterNumber: number
  title: string
  status: 'Draft' | 'Reviewing' | 'Approved' | 'Published'
  progress: number
  updatedAt: string
  seriesId?: {
    _id: string
    title: string
  }
  mangakaId?: {
    _id: string
    displayName: string
    avatar?: string
  }
}

type ColumnData = {
  items: WorkflowItem[]
  count: number
}

type WorkflowData = {
  Draft: ColumnData
  Reviewing: ColumnData
  Approved: ColumnData
  Published: ColumnData
}

export function WorkflowBoardSection() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t, i18n } = useTranslation()
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 4

  const columnMeta = [
    { status: 'Draft' as const, title: t('workflowBoard.draft'), color: 'bg-neutral-400', badgeClass: 'bg-neutral-100 text-neutral-600' },
    { status: 'Reviewing' as const, title: t('workflowBoard.reviewing'), color: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-600' },
    { status: 'Approved' as const, title: t('workflowBoard.approved'), color: 'bg-sky-500', badgeClass: 'bg-sky-100 text-sky-600' },
    { status: 'Published' as const, title: t('workflowBoard.publishedCol'), color: 'bg-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-600' },
  ]

  useEffect(() => {
    Promise.resolve().then(() => {
      setLoading(true)
    })
    dashboardAPI.getWorkflow(currentPage, limit)
      .then((res) => {
        setWorkflow(res.data.workflow)
      })
      .catch((err) => {
        console.error('Failed to fetch dashboard workflow board:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [currentPage])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Mar 22'
    const locale = i18n.language === 'vi' ? 'vi-VN' : 'en-US'
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const getSubtitle = () => {
    switch (user?.role) {
      case 'mangaka': return t('workflowBoard.subtitleMangaka')
      case 'assistant': return t('workflowBoard.subtitleAssistant')
      case 'editor': return t('workflowBoard.subtitleEditor')
      case 'editorial_board': return t('workflowBoard.subtitleEB')
      default: return t('workflowBoard.subtitleDefault')
    }
  }

  // Calculate pagination details
  const maxCount = workflow
    ? Math.max(
      workflow.Draft?.count || 0,
      workflow.Reviewing?.count || 0,
      workflow.Approved?.count || 0,
      workflow.Published?.count || 0
    )
    : 0

  const totalPages = Math.max(1, Math.ceil(maxCount / limit))

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  return (
    <Card className="gap-4 p-6 shadow-sm border border-neutral-200/80 bg-white">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold leading-6 text-neutral-900">{t('workflowBoard.title')}</CardTitle>
          <span className="text-xs leading-4 text-neutral-500 font-medium">
            {getSubtitle()}
          </span>
        </div>
        {user?.role === 'mangaka' && (
          <Button variant="outline" size="sm" className="gap-1.5 font-semibold text-neutral-700 hover:text-neutral-900 border-neutral-200" onClick={() => navigate('/studio')}>
            <Plus className="size-3.5" />
            {t('workflowBoard.newChapter')}
          </Button>
        )}
      </CardHeader>

      <CardContent className="grid gap-4 p-0 xl:grid-cols-4 min-h-[250px]">
        {loading ? (
          <div className="col-span-4 flex items-center justify-center py-16 text-neutral-400">
            <Loader2 className="size-8 animate-spin text-neutral-300 mr-2" />
            <span className="text-xs font-semibold">{t('workflowBoard.loadingStages')}</span>
          </div>
        ) : !workflow ? (
          <div className="col-span-4 text-center py-16 text-xs text-neutral-500 font-medium border border-dashed border-neutral-200 rounded-xl">
            {t('workflowBoard.noData')}
          </div>
        ) : (
          columnMeta.map((col) => {
            const colData = workflow[col.status] || { items: [], count: 0 }
            return (
              <div key={col.status} className="flex flex-col gap-2 bg-neutral-50/50 rounded-xl p-2 border border-neutral-100/85">
                <div className="flex items-center justify-between px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${col.color}`} />
                    <span className="text-xs font-bold leading-4 text-neutral-700">{col.title}</span>
                    <Badge variant="default" className={`h-4 px-1.5 text-[10px] border-none font-bold ${col.badgeClass}`}>
                      {colData.count}
                    </Badge>
                  </div>
                  <MoreHorizontal className="size-3.5 text-neutral-400 cursor-pointer hover:text-neutral-600 transition-colors" />
                </div>

                <div className="flex flex-col gap-2 flex-1">
                  {colData.items.length === 0 ? (
                    <div className="text-center py-8 px-2 text-[10px] text-neutral-400 font-semibold border border-dashed border-neutral-200/60 rounded-lg bg-white/50">
                      {t('workflowBoard.noChaptersHere')}
                    </div>
                  ) : (
                    colData.items.map((item) => (
                      <div key={item._id} className="flex flex-col gap-2 rounded-xl border border-neutral-200/70 bg-white p-3 hover:shadow-md hover:border-neutral-300 transition-all cursor-pointer">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold leading-4 text-neutral-800">Ch. {item.chapterNumber}</span>
                          <Avatar className="size-5 bg-indigo-50 border border-indigo-100">
                            {item.mangakaId?.avatar ? (
                              <img src={item.mangakaId.avatar} alt={item.mangakaId.displayName} className="size-full object-cover rounded-full" />
                            ) : (
                              <AvatarFallback className="text-[8px] font-bold text-indigo-700 bg-indigo-50">
                                {getInitials(item.mangakaId?.displayName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                        </div>
                        <span className="text-[11px] font-medium leading-4 text-neutral-500 truncate" title={item.title}>
                          {item.title}
                        </span>
                        {item.seriesId?.title && (
                          <span className="text-[10px] text-neutral-400 font-semibold truncate bg-neutral-50 px-1.5 py-0.5 rounded self-start">
                            {item.seriesId.title}
                          </span>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3 text-neutral-300" />
                            {formatDate(item.updatedAt)}
                          </span>
                          <span className="font-semibold text-neutral-500">{item.progress}%</span>
                        </div>
                        <Progress value={item.progress} className="h-1 bg-neutral-100" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })
        )}
      </CardContent>

      <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-1">
        <span className="text-xs leading-4 text-neutral-400 font-semibold">
          {t('common.showingRange', { 
            from: maxCount > 0 ? (currentPage - 1) * limit + 1 : 0, 
            to: Math.min(currentPage * limit, maxCount), 
            total: maxCount 
          })}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="size-8.5 p-0 border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="size-5" />
            </Button>

            {Array.from({ length: totalPages }).map((_, idx) => {
              const p = idx + 1
              const isActive = p === currentPage
              return (
                <Button
                  key={p}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  className="size-9 p-0 text-xs font-bold rounded-lg"
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </Button>
              )
            })}

            <Button
              variant="outline"
              size="sm"
              className="size-9 p-0 border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-lg"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="size-5" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
