import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Star, BookOpen, Heart, ArrowRight } from 'lucide-react'
import { Card, CardHeader, Badge, Button } from '../ui'
import { KpiCardsSection } from './KpiCardsSection'
import { RoleStripSection } from './RoleStripSection'
import { SeriesRankingSection } from './SeriesRankingSection'
import { WorkflowBoardSection } from './WorkflowBoardSection'
import { RoleCtaSection } from './RoleCtaSection'
import { RecentActivitySection } from './RecentActivitySection'
import { TeamOverviewSection } from './TeamOverviewSection'
import { useAuth } from '../../lib/auth'
import { dashboardAPI, chaptersAPI } from '../../lib/api'

interface SubscribedSeries {
  _id: string
  title: string
  coverImage?: string
  status: string
  mangakaId?: {
    displayName: string
  }
  description: string
  totalVotes?: number
}

interface VotingActivityItem {
  _id: string
  createdAt?: string
  chapterId?: {
    _id: string
    chapterNumber: number
    title?: string
  }
  seriesId?: {
    title: string
  }
  rating?: number
  reaction?: string
}

function ReaderSubscribedSeriesSection({ series, loading }: { series: SubscribedSeries[], loading: boolean }) {
  const navigate = useNavigate()
  
  if (loading) {
    return (
      <Card className="gap-4 p-6 shadow-sm border border-neutral-200/80 bg-white rounded-2xl animate-pulse">
        <div className="h-5 w-48 bg-neutral-200 rounded mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((idx) => (
            <div key={idx} className="flex gap-3 p-3 border border-neutral-100 rounded-xl">
              <div className="w-16 h-24 bg-neutral-200 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2 mt-1">
                <div className="h-4 w-28 bg-neutral-200 rounded" />
                <div className="h-3 w-16 bg-neutral-200 rounded" />
                <div className="h-3 w-20 bg-neutral-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="gap-4 p-6 shadow-sm border border-neutral-200/80 bg-white rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0 mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold leading-6 text-neutral-900 flex items-center gap-2">
            <BookOpen className="size-4 text-indigo-500" />
            My Reading List
          </h2>
          <span className="text-xs leading-4 text-neutral-500 font-medium">Manga series you are subscribed to</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/discover')}
          className="text-xs font-semibold h-8 rounded-xl hover:bg-neutral-50 border-neutral-200"
        >
          Discover
        </Button>
      </CardHeader>
      
      {series.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-neutral-50/50 border border-dashed border-neutral-200">
          <div className="size-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 mb-3 shadow-inner">
            <BookOpen className="size-6" />
          </div>
          <h3 className="text-sm font-semibold text-neutral-950 mb-1">Your reading list is empty</h3>
          <p className="text-xs text-neutral-500 max-w-sm mb-4 leading-relaxed">
            Follow series to get notified of new chapters and track them here on your dashboard.
          </p>
          <Button 
            variant="default" 
            size="sm" 
            onClick={() => navigate('/discover')}
            className="text-xs font-semibold h-8 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white"
          >
            Find Manga
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {series.map((item) => (
            <div 
              key={item._id} 
              onClick={async () => {
                try {
                  const res = await chaptersAPI.getBySeries(item._id)
                  interface ChapterItem {
                    _id: string
                    status: string
                    chapterNumber: number
                  }
                  const publishedChapters = (res.data.chapters || [])
                    .filter((c: ChapterItem) => c.status === 'Published')
                    .sort((a: ChapterItem, b: ChapterItem) => a.chapterNumber - b.chapterNumber)
                  if (publishedChapters.length > 0) {
                    navigate(`/read/${publishedChapters[0]._id}`)
                  } else {
                    navigate('/discover')
                  }
                } catch {
                  navigate('/discover')
                }
              }}
              className="group flex gap-4 p-3 border border-neutral-200/60 rounded-2xl bg-white hover:border-neutral-300 hover:shadow-md transition-all duration-300 cursor-pointer select-none"
            >
              <div className="w-16 h-24 bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden shrink-0 relative shadow-sm">
                {item.coverImage ? (
                  <img 
                    src={item.coverImage} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <BookOpen className="size-5" />
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5">
                  <Badge className={`text-[8px] h-3.5 px-1 border-none font-bold text-white shadow-sm bg-indigo-600`}>
                    {item.status}
                  </Badge>
                </div>
              </div>
              
              <div className="flex flex-col min-w-0 flex-1 justify-between py-0.5">
                <div className="space-y-0.5">
                  <h3 className="text-xs font-semibold text-neutral-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-[9px] text-neutral-400 font-semibold truncate">
                    by {item.mangakaId?.displayName || 'Unknown Mangaka'}
                  </p>
                  <p className="text-[10px] text-neutral-500 line-clamp-2 mt-1 leading-normal">
                    {item.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-[9px] text-neutral-400 font-medium">
                  <span className="flex items-center gap-0.5">
                    <Heart className="size-2.5 text-rose-500 fill-current" /> {item.totalVotes || 0}
                  </span>
                  <span className="text-indigo-500 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-bold">
                    Read Now <ArrowRight className="size-2.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function ReaderVotingActivitySection({ votes, loading }: { votes: VotingActivityItem[], loading: boolean }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <Card className="gap-4 p-6 shadow-sm border border-neutral-200/80 bg-white rounded-2xl animate-pulse">
        <div className="h-5 w-36 bg-neutral-200 rounded mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="flex gap-3">
              <div className="size-8 rounded-full bg-neutral-200 shrink-0" />
              <div className="flex-1 space-y-2 mt-0.5">
                <div className="h-3.5 w-32 bg-neutral-200 rounded" />
                <div className="h-3 w-16 bg-neutral-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  const renderStars = (rating?: number) => {
    if (!rating) return null
    return (
      <div className="flex items-center gap-0.5 text-amber-400">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`size-2.5 ${star <= rating ? 'fill-current' : 'text-neutral-200'}`} 
          />
        ))}
      </div>
    )
  }

  return (
    <Card className="gap-4 p-6 shadow-sm border border-neutral-200/80 bg-white rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0 mb-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold leading-6 text-neutral-900 flex items-center gap-2">
            <Heart className="size-4 text-rose-500" />
            My Voting History
          </h2>
          <span className="text-xs leading-4 text-neutral-500 font-medium">Chapters you supported with votes</span>
        </div>
      </CardHeader>
      
      {votes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl bg-neutral-50/50 border border-dashed border-neutral-200">
          <div className="size-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-2 shadow-inner">
            <Heart className="size-5" />
          </div>
          <h3 className="text-xs font-semibold text-neutral-950 mb-0.5">No votes cast yet</h3>
          <p className="text-[10px] text-neutral-500 max-w-[200px] mb-3 leading-normal">
            Vote on published chapters to support creators!
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/discover')}
            className="text-[10px] font-semibold h-7 px-2.5 rounded-lg hover:bg-neutral-50 border-neutral-200"
          >
            Find Chapters
          </Button>
        </div>
      ) : (
        <div className="relative border-l border-neutral-100 pl-4 space-y-4 ml-1.5 py-1">
          {votes.map((item) => {
            const timeAgo = item.createdAt 
              ? new Date(item.createdAt).toLocaleDateString()
              : 'Recently'
            return (
              <div key={item._id} className="relative group">
                <div className="absolute -left-[21.5px] top-1 flex size-3.5 items-center justify-center rounded-full bg-rose-100 border-2 border-white text-rose-500 group-hover:bg-rose-500 group-hover:text-white transition-colors duration-300">
                  <Heart className="size-[6px] fill-current" />
                </div>
                
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span 
                      onClick={() => navigate(`/read/${item.chapterId?._id}`)}
                      className="text-xs font-semibold text-neutral-950 hover:text-indigo-600 transition-colors cursor-pointer select-none line-clamp-1"
                    >
                      {item.seriesId?.title} — Ch. {item.chapterId?.chapterNumber || 0}
                    </span>
                    <span className="text-[9px] text-neutral-400 font-semibold shrink-0">
                      {timeAgo}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {renderStars(item.rating)}
                    {item.reaction && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium select-none">
                        {item.reaction}
                      </span>
                    )}
                  </div>
                  
                  {item.chapterId?.title && (
                    <p className="text-[10px] text-neutral-400 font-medium italic">
                      "{item.chapterId.title}"
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export function DashboardContentSection() {
  const { user } = useAuth()
  const role = user?.role?.toLowerCase() || 'reader'
  const isReader = role === 'reader'
  const isAssistant = role === 'assistant'
  const showTeam = role === 'mangaka' || role === 'editor' || role === 'editorial_board'

  const [readerData, setReaderData] = useState<{
    subscribedSeries: SubscribedSeries[];
    votedChapters: VotingActivityItem[];
  } | null>(null)
  const [loadingReader, setLoadingReader] = useState(false)

  useEffect(() => {
    if (isReader) {
      Promise.resolve().then(() => {
        setLoadingReader(true)
      })
      dashboardAPI.getReaderData()
        .then((res) => {
          setReaderData(res.data)
        })
        .catch((err) => {
          console.error('Failed to fetch reader dashboard data:', err)
        })
        .finally(() => {
          setLoadingReader(false)
        })
    }
  }, [isReader])

  if (isReader) {
    return (
      <div className="flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6 lg:p-8">
        <KpiCardsSection />
        
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <ReaderSubscribedSeriesSection 
              series={readerData?.subscribedSeries || []} 
              loading={loadingReader} 
            />
            <SeriesRankingSection />
          </div>
          <div className="space-y-6">
            <ReaderVotingActivitySection 
              votes={readerData?.votedChapters || []} 
              loading={loadingReader} 
            />
            <RecentActivitySection />
          </div>
        </div>
        
        <RoleStripSection />
        <RoleCtaSection />
      </div>
    )
  }

  if (isAssistant) {
    return (
      <div className="flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6 lg:p-8">
        <KpiCardsSection />
        
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">
            <WorkflowBoardSection />
          </div>
          <div className="space-y-6">
            <RecentActivitySection />
          </div>
        </div>
        
        <RoleStripSection />
        <RoleCtaSection />
      </div>
    )
  }

  // Mangaka, Editor, Editorial Board Layout
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-hidden p-4 sm:p-6 lg:p-8">
      <KpiCardsSection />
      
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 space-y-6">
          <WorkflowBoardSection />
          <SeriesRankingSection />
        </div>
        <div className="space-y-6">
          {showTeam && <TeamOverviewSection />}
          <RecentActivitySection />
        </div>
      </div>
      
      <RoleStripSection />
      <RoleCtaSection />
    </div>
  )
}
