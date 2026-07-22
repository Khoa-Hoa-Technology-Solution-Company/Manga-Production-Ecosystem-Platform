/* eslint-disable */
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown,
  ArrowLeft,
  Bell,
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  MessageCircle,
  Play,
  Share2,
  Star,
  ThumbsUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, Button, Card, Textarea } from '../ui'
import { commentsAPI, seriesAPI, chaptersAPI, ratingsAPI, pagesAPI, reactionsAPI } from '../../lib/api'
import { socketService } from '../../lib/socket'
import { useAuth } from '../../lib/auth'

/* ── Chapter data (Mock fallbacks) ──────────────────── */
const MOCK_CHAPTER_INFO = {
  series: 'Shadow Blade Saga',
  chapter: 42,
  title: 'The Blade Awakens',
  author: 'Yuki Mori',
  publishedDate: 'March 18, 2026',
  totalPages: 24,
  rating: 4.9,
  ratingCount: 2847,
}

/* ── Page images (Mock fallbacks) ───────────────────── */
const MOCK_PAGES = [
  '/manga/page-panels.png',
  '/manga/cover-action.png',
  '/manga/cover-scifi.png',
  '/manga/cover-fantasy.png',
  '/manga/cover-horror.png',
]

/* ── Comments ────────────────────────────────────────── */
const comments = [
  {
    id: 1,
    user: 'MangaHunter_99',
    initials: 'MH',
    color: 'bg-blue-500',
    time: '2 hours ago',
    text: 'The panel composition in this chapter is absolutely incredible! The way Yuki-sensei draws the sword unsheathing sequence gives me chills every time. 🔥',
    likes: 124,
    liked: false,
  },
  {
    id: 2,
    user: 'OtakuSenpai',
    initials: 'OS',
    color: 'bg-purple-500',
    time: '3 hours ago',
    text: 'I knew Kaito would finally unlock the blade\'s true power! The foreshadowing from Chapter 38 all makes sense now.',
    likes: 89,
    liked: true,
  },
  {
    id: 3,
    user: 'InkDrinker',
    initials: 'ID',
    color: 'bg-emerald-500',
    time: '5 hours ago',
    text: 'The art quality keeps getting better. Those double-page spreads are wallpaper material. Can\'t wait for next week!',
    likes: 67,
    liked: false,
  },
  {
    id: 4,
    user: 'PageTurner_X',
    initials: 'PT',
    color: 'bg-amber-500',
    time: '8 hours ago',
    text: 'Am I the only one who noticed the hidden symbol on page 18? I think it connects to the prophecy from the first arc...',
    likes: 45,
    liked: false,
  },
  {
    id: 5,
    user: 'DragonScroll',
    initials: 'DS',
    color: 'bg-rose-500',
    time: '1 day ago',
    text: 'Best chapter of the year so far. The emotional weight of that final panel hit different.',
    likes: 156,
    liked: true,
  },
]

/* ── Reactions ───────────────────────────────────────── */
const reactions = [
  { emoji: '🔥', label: 'Fire', count: 2841 },
  { emoji: '❤️', label: 'Love', count: 1923 },
  { emoji: '😮', label: 'Shocked', count: 847 },
  { emoji: '😭', label: 'Crying', count: 432 },
  { emoji: '👏', label: 'Clap', count: 1205 },
]

export function ReadingViewPage() {
  const navigate = useNavigate()
  const { chapterId } = useParams<{ chapterId: string }>()
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [subscribingSeries, setSubscribingSeries] = useState(false)

  const handleToggleSeriesSubscribe = async () => {
    if (!user || !series?._id) return
    setSubscribingSeries(true)
    try {
      const res = await seriesAPI.subscribe(series._id)
      const updatedSeries = res.data.series
      if (updatedSeries) {
        setSeries(updatedSeries)
      }
    } catch (err) {
      console.error('Failed to toggle series subscription:', err)
    } finally {
      setSubscribingSeries(false)
    }
  }
  
  const [currentPage, setCurrentPage] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const [activeReactions, setActiveReactions] = useState<Set<string>>(new Set())
  const [readingMode, setReadingMode] = useState<'scroll' | 'paged'>('scroll')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const viewerRef = useRef<HTMLDivElement>(null)
  const hasIncrementedView = useRef<string | null>(null)

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  // Dynamic state for real-time updates
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [commentsList, setCommentsList] = useState<any[]>([]) // Initial empty, will load static + API
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [avgRating, setAvgRating] = useState<number>(0)
  const [ratingCount, setRatingCount] = useState<number>(0)
  const [serverReactions, setServerReactions] = useState<Array<{ _id: string; count: number }>>([])

  // Real database entities
  const [chapter, setChapter] = useState<any>(null)
  const [series, setSeries] = useState<any>(null)
  const [pagesList, setPagesList] = useState<string[]>(MOCK_PAGES)
  const [loading, setLoading] = useState(true)
  const [chaptersList, setChaptersList] = useState<any[]>([])

  // Shadow variables for original JSX compatibility
  const pages = pagesList
  const chapterInfo = {
    series: series?.title || MOCK_CHAPTER_INFO.series,
    chapter: chapter?.chapterNumber || MOCK_CHAPTER_INFO.chapter,
    title: chapter?.title || MOCK_CHAPTER_INFO.title,
    author: series?.mangakaId?.displayName || MOCK_CHAPTER_INFO.author,
    publishedDate: chapter?.createdAt ? new Date(chapter.createdAt).toLocaleDateString() : MOCK_CHAPTER_INFO.publishedDate,
    totalPages: pagesList.length,
    rating: avgRating,
    ratingCount: ratingCount,
  }

  const currentChapterIndex = chaptersList.findIndex((c) => c._id === chapterId)
  const prevChapter = currentChapterIndex > 0 ? chaptersList[currentChapterIndex - 1] : null
  const nextChapter = currentChapterIndex >= 0 && currentChapterIndex < chaptersList.length - 1 ? chaptersList[currentChapterIndex + 1] : null

  // Increment view count when entering chapter
  useEffect(() => {
    if (chapterId && hasIncrementedView.current !== chapterId) {
      hasIncrementedView.current = chapterId
      chaptersAPI.incrementView(chapterId).catch((err) => {
        console.error('Failed to increment view count:', err)
      })
    }
  }, [chapterId])

  // Resolve real chapter details, series details, pages, and rating data
  useEffect(() => {
    if (!chapterId) return
    setActiveChapterId(chapterId)
    setLoading(true)

    // Reset viewer states for new chapter
    setCurrentPage(0)
    setActiveReactions(new Set())

    // Load chapter details
    chaptersAPI.getById(chapterId)
      .then(async (res) => {
        const ch = res.data.chapter
        setChapter(ch)
        
        // Load series details
        if (ch?.seriesId) {
          try {
            const sRes = await seriesAPI.getById(ch.seriesId)
            setSeries(sRes.data.series)
          } catch (err) {
            console.error('Failed to load series details:', err)
          }

          // Load series chapters for navigation
          try {
            const cRes = await chaptersAPI.getBySeries(ch.seriesId)
            const published = (cRes.data.chapters || [])
              .filter((c: any) => c.status === 'Published')
              .sort((a: any, b: any) => a.chapterNumber - b.chapterNumber)
            setChaptersList(published)
          } catch (err) {
            console.error('Failed to load series chapters:', err)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load chapter details:', err)
      })

    // Load chapter pages
    pagesAPI.getByChapter(chapterId)
      .then((res) => {
        const p = (res.data.pages || []).map((page: any) => 
          page.compositeImage || page.processedImage || page.originalImage
        )
        if (p.length > 0) {
          setPagesList(p)
        } else {
          setPagesList(MOCK_PAGES)
        }
      })
      .catch((err) => {
        console.error('Failed to load pages:', err)
        setPagesList(MOCK_PAGES)
      })
      .finally(() => {
        setLoading(false)
      })

    // Load rating summary
    ratingsAPI.getByChapter(chapterId)
      .then((res) => {
        if (res.data.avgRating !== undefined) {
          setAvgRating(Math.round(res.data.avgRating * 10) / 10)
        }
        if (res.data.ratingCount !== undefined) {
          setRatingCount(res.data.ratingCount)
        }
        if (res.data.userVote) {
          setUserRating(res.data.userVote.rating || 0)
        } else {
          setUserRating(0)
        }
      })
      .catch(console.error)

    // Load decoupled reactions
    reactionsAPI.get('chapter', chapterId)
      .then((res: any) => {
        if (res.data.reactions) {
          const mapped = res.data.reactions.map((r: any) => ({ _id: r.emoji, count: r.count }))
          setServerReactions(mapped)
        }
        if (res.data.userReactions) {
          setActiveReactions(new Set(res.data.userReactions))
        }
      })
      .catch(console.error)
  }, [chapterId])

  // Setup Socket.io and fetch initial comments
  useEffect(() => {
    if (!activeChapterId || activeChapterId === 'fallback') {
      setCommentsList(comments) // Load static mock data
      return
    }

    // Fetch existing comments from API
    commentsAPI.getByChapter(activeChapterId).then((res) => {
      if (res.data.comments) {
        const formatComment = (c: any) => ({
          id: c._id,
          user: c.userId?.displayName || 'Reader',
          initials: (c.userId?.displayName || 'R').substring(0, 2).toUpperCase(),
          color: 'bg-indigo-500',
          time: new Date(c.createdAt).toLocaleDateString(),
          text: c.text,
          likes: c.likes || 0,
          liked: false,
          parentId: c.parentId,
        })
        
        const apiComments = res.data.comments.map((c: any) => ({
          ...formatComment(c),
          replies: (c.replies || []).map(formatComment),
        }))
        setCommentsList(apiComments)
      }
    }).catch(console.error)

    socketService.joinChapterRoom(activeChapterId)

    const handleNewComment = (newComment: any) => {
      const formatted = {
        id: newComment._id,
        user: newComment.userId?.displayName || 'Reader',
        initials: (newComment.userId?.displayName || 'R').substring(0, 2).toUpperCase(),
        color: 'bg-indigo-500',
        time: 'Just now',
        text: newComment.text,
        likes: 0,
        liked: false,
        parentId: newComment.parentId,
      }

      setCommentsList((prev) => {
        if (formatted.parentId) {
          return prev.map(p => {
            if (p.id === formatted.parentId) {
              return { ...p, replies: [...(p.replies || []), formatted] }
            }
            return p
          })
        }
        return [{ ...formatted, replies: [] }, ...prev]
      })
    }

    const handleNewRating = (data: any) => {
      if (data.avgRating !== undefined) {
        setAvgRating(Math.round(data.avgRating * 10) / 10)
      }
      if (data.ratingCount !== undefined) {
        setRatingCount(data.ratingCount)
      }
    }

    socketService.on('comment:new', handleNewComment)
    socketService.on('vote:new', handleNewRating)

    return () => {
      socketService.leaveChapterRoom(activeChapterId)
      socketService.off('comment:new', handleNewComment)
      socketService.off('vote:new', handleNewRating)
    }
  }, [activeChapterId])

  // Keyboard navigation for Paged View
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow navigation only in paged mode
      if (readingMode !== 'paged') return
      
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
        return
      }

      if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => Math.max(0, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => Math.min(chapterInfo.totalPages - 1, prev + 1))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [readingMode, chapterInfo.totalPages])

  const handlePostComment = async () => {
    if (!commentText.trim()) return
    setIsSubmitting(true)
    try {
      if (activeChapterId && activeChapterId !== 'fallback') {
        await commentsAPI.create(activeChapterId, { text: commentText })
      }
      setCommentText('')
    } catch (error) {
      console.error('Failed to post comment', error)
      alert('Lỗi: Không thể gửi bình luận. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePostReply = async (parentId: string) => {
    if (!replyText.trim()) return
    setIsSubmitting(true)
    try {
      if (activeChapterId && activeChapterId !== 'fallback') {
        await commentsAPI.create(activeChapterId, { text: replyText, parentId })
      }
      setReplyText('')
      setReplyingToId(null)
    } catch (error) {
      console.error('Failed to post reply', error)
      alert('Lỗi: Không thể gửi trả lời. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string, parentId?: string) => {
    try {
      if (activeChapterId && activeChapterId !== 'fallback') {
        const res = await commentsAPI.like(commentId)
        
        setCommentsList(prev => prev.map(p => {
          if (parentId && p.id === parentId) {
            return {
              ...p,
              replies: p.replies?.map((r: any) => 
                r.id === commentId ? { ...r, liked: res.data.liked, likes: res.data.comment.likes } : r
              )
            }
          }
          if (!parentId && p.id === commentId) {
            return { ...p, liked: res.data.liked, likes: res.data.comment.likes }
          }
          return p
        }))
      }
    } catch (e) {
      console.error('Failed to like comment', e)
    }
  }

  const handleRate = async (ratingVal: number) => {
    setUserRating(ratingVal)
    try {
      if (activeChapterId && activeChapterId !== 'fallback') {
        await ratingsAPI.rate(activeChapterId, { rating: ratingVal, seriesId: chapter?.seriesId })
        const ratingsRes = await ratingsAPI.getByChapter(activeChapterId)
        if (ratingsRes.data.avgRating !== undefined) {
          setAvgRating(Math.round(ratingsRes.data.avgRating * 10) / 10)
        }
        if (ratingsRes.data.ratingCount !== undefined) {
          setRatingCount(ratingsRes.data.ratingCount)
        }
      }
    } catch (err) {
      console.error('Failed to rate chapter:', err)
    }
  }

  const toggleReaction = async (emoji: string) => {
    if (!activeChapterId || activeChapterId === 'fallback') {
      // Offline mode: just toggle local state
      setActiveReactions((prev) => {
        const next = new Set(prev)
        if (next.has(emoji)) next.delete(emoji)
        else next.add(emoji)
        return next
      })
      return
    }

    const hadReaction = activeReactions.has(emoji)

    // Optimistic update
    setActiveReactions((prev) => {
      const next = new Set(prev)
      if (hadReaction) next.delete(emoji)
      else next.add(emoji)
      return next
    })

    try {
      const res = await reactionsAPI.toggle('chapter', activeChapterId, emoji)
      if (res.data.reactions) {
        const mapped = res.data.reactions.map((r: any) => ({ _id: r.emoji, count: r.count }))
        setServerReactions(mapped)
      }
      if (res.data.userReactions) {
        setActiveReactions(new Set(res.data.userReactions))
      }
    } catch (err) {
      console.error('Failed to save reaction:', err)
      // Revert on error
      setActiveReactions((prev) => {
        const next = new Set(prev)
        if (hadReaction) next.add(emoji)
        else next.delete(emoji)
        return next
      })
    }
  }


  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden">
      {/* ── Top bar ──────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 sm:px-6 bg-white z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="size-9 p-0 rounded-lg" onClick={() => navigate(-1)}>
            <ArrowLeft className="size-5" />
          </Button>
          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <div className="flex items-center gap-1.5 shrink-0">
              <h1 className="text-sm font-semibold truncate max-w-[120px] sm:max-w-none">{chapterInfo.series}</h1>
              {series && user && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-9 w-9 p-0 rounded-full hover:bg-neutral-100 shrink-0 transition-all ${
                    series.subscribers?.includes(user._id) ? 'text-indigo-600 hover:text-indigo-700' : 'text-neutral-400 hover:text-neutral-600'
                  }`}
                  disabled={subscribingSeries}
                  onClick={handleToggleSeriesSubscribe}
                  title={series.subscribers?.includes(user._id)
                    ? t('settingsPage.unsubscribeSeries', i18n.language === 'vi' ? 'Huỷ theo dõi series này' : 'Unsubscribe from this series')
                    : t('settingsPage.subscribeSeries', i18n.language === 'vi' ? 'Theo dõi series này' : 'Subscribe to this series')
                  }
                >
                  <Bell className={`size-6 ${series.subscribers?.includes(user._id) ? 'fill-current animate-pulse' : ''}`} />
                </Button>
              )}
            </div>
            {chaptersList.length > 0 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-md hover:bg-neutral-100 flex items-center justify-center"
                  disabled={!prevChapter}
                  onClick={() => prevChapter && navigate(`/read/${prevChapter._id}`)}
                  title="Previous Chapter"
                >
                  <ChevronLeft className="size-[18px]" />
                </Button>
                
                <select
                  value={chapterId}
                  onChange={(e) => navigate(`/read/${e.target.value}`)}
                  className="text-[11px] font-medium bg-neutral-100 border border-neutral-200 rounded px-2 py-1 max-w-[160px] focus:outline-none focus:ring-1 focus:ring-neutral-400 cursor-pointer"
                >
                  {chaptersList.map((c) => (
                    <option key={c._id} value={c._id}>
                      Ch. {c.chapterNumber} — {c.title}
                    </option>
                  ))}
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-md hover:bg-neutral-100 flex items-center justify-center"
                  disabled={!nextChapter}
                  onClick={() => nextChapter && navigate(`/read/${nextChapter._id}`)}
                  title="Next Chapter"
                >
                  <ChevronRight className="size-[18px]" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] gap-1.5 px-2.5 h-8.5 rounded-lg bg-neutral-100/50 hover:bg-neutral-200"
            onClick={toggleFullscreen}
          >
            <Maximize className="size-4"/>
            Fullscreen
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] gap-1.5 px-2.5 h-8.5 rounded-lg bg-neutral-100/50 hover:bg-neutral-200"
            onClick={() => setReadingMode(readingMode === 'scroll' ? 'paged' : 'scroll')}
          >
            {readingMode === 'scroll' ? <BookOpen className="size-4"/> : <ArrowDown className="size-4"/>}
            {readingMode === 'scroll' ? 'Paged View' : 'Scroll View'}
          </Button>
          <Button
            variant={bookmarked ? 'secondary' : 'ghost'}
            size="sm"
            className="size-9 p-0 rounded-lg"
            onClick={() => setBookmarked(!bookmarked)}
          >
            <Bookmark className={`size-[18px] ${bookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" className="size-9 p-0 rounded-lg">
            <Share2 className="size-[18px]" />
          </Button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        {/* ── Manga Viewer (Left) ─────────────────── */}
        <div ref={viewerRef} className={`flex-1 flex flex-col bg-neutral-100 overflow-hidden relative ${isFullscreen ? 'bg-neutral-900' : ''}`}>
          
          {isFullscreen && (
            <Button
              variant="secondary"
              size="sm"
              className="absolute top-4 right-6 z-50 size-10 p-0 rounded-full shadow-lg opacity-30 hover:opacity-100 transition-opacity flex items-center justify-center"
              onClick={toggleFullscreen}
            >
              <Minimize className="size-5" />
            </Button>
          )}

          {/* Page display */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center relative">
            {loading ? (
              <div className="flex size-full items-center justify-center text-sm text-neutral-500">
                Loading pages...
              </div>
            ) : readingMode === 'paged' ? (
              <div className="relative w-full max-w-lg flex flex-col items-center justify-center min-h-full">
                <img
                  src={pages[currentPage % pages.length]}
                  alt={`Page ${currentPage + 1}`}
                  className="w-full rounded-lg shadow-2xl"
                />

                {/* Page navigation overlay */}
                <button
                  type="button"
                  className="absolute inset-y-0 left-0 w-1/3 cursor-pointer group"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                >
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
                      <ChevronLeft className="size-5" />
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 w-1/3 cursor-pointer group"
                  onClick={() => setCurrentPage(Math.min(chapterInfo.totalPages - 1, currentPage + 1))}
                >
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="grid size-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur">
                      <ChevronRight className="size-5" />
                    </div>
                  </div>
                </button>
              </div>
            ) : (
              <div className="w-full max-w-lg flex flex-col gap-2 pb-20">
                {pages.map((p, idx) => (
                  <img
                    key={idx}
                    src={p}
                    alt={`Page ${idx + 1}`}
                    className="w-full rounded-lg shadow-xl"
                  />
                ))}

                {/* Next Chapter CTA at the bottom of scroll view */}
                {nextChapter && (
                  <div className="mt-8 p-6 rounded-2xl border border-neutral-200 bg-white shadow-sm flex flex-col items-center text-center gap-3">
                    <p className="text-xs text-neutral-500">You've finished reading Chapter {chapterInfo.chapter}!</p>
                    <h4 className="text-sm font-semibold text-neutral-900">Next: Chapter {nextChapter.chapterNumber} — {nextChapter.title}</h4>
                    <Button 
                      onClick={() => navigate(`/read/${nextChapter._id}`)}
                      className="mt-1 h-9 px-4 text-xs font-semibold gap-1.5 bg-neutral-950 text-white hover:bg-neutral-800 rounded-xl"
                    >
                      <Play className="size-3.5 fill-current" /> Read Next Chapter
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Page navigation bar */}
          {!loading && readingMode === 'paged' && (
            <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-2.5 shrink-0 z-10">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>

              <div className="flex items-center gap-1.5 overflow-x-auto px-2">
                {pages.slice(0, 8).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`size-8 rounded-md overflow-hidden border-2 transition-all ${
                      idx === currentPage ? 'border-neutral-900 shadow-md scale-110' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    onClick={() => setCurrentPage(idx)}
                  >
                    <img src={p} alt={`Page ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
                {chapterInfo.totalPages > 8 && (
                  <span className="text-[10px] text-neutral-400 ml-1">+{chapterInfo.totalPages - 8} more</span>
                )}
              </div>

              <Button
                variant={currentPage === chapterInfo.totalPages - 1 && nextChapter ? 'default' : 'ghost'}
                size="sm"
                className="gap-1 text-xs font-semibold"
                onClick={() => {
                  if (currentPage === chapterInfo.totalPages - 1 && nextChapter) {
                    navigate(`/read/${nextChapter._id}`)
                  } else {
                    setCurrentPage(Math.min(chapterInfo.totalPages - 1, currentPage + 1))
                  }
                }}
              >
                {currentPage === chapterInfo.totalPages - 1 && nextChapter ? (
                  <>Next Chapter <ChevronRight className="size-3.5" /></>
                ) : (
                  <>Next <ChevronRight className="size-3.5" /></>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* ── Right Sidebar (Info + Comments) ─────── */}
        <div className="w-full border-t border-neutral-200 lg:w-96 lg:border-l lg:border-t-0 overflow-y-auto shrink-0 bg-white h-full flex flex-col">
          <div className="p-4 sm:p-5 space-y-5 flex-1">
            {/* Chapter Info */}
            <div className="space-y-3">
              <div>
                <h2 className="text-base font-semibold">{chapterInfo.title}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {chapterInfo.series} · Chapter {chapterInfo.chapter}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Avatar className="size-7 bg-neutral-200">
                  <AvatarFallback className="text-[8px]">{chapterInfo.author.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium">{chapterInfo.author}</p>
                  <p className="text-[10px] text-neutral-500">Published {chapterInfo.publishedDate}</p>
                </div>
              </div>
            </div>

            {/* Rating */}
            <Card className="rounded-xl p-4 border border-neutral-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-neutral-800">Rate this chapter</span>
                <span className="text-xs text-neutral-500">
                  {chapterInfo.rating} ({chapterInfo.ratingCount.toLocaleString()})
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className="transition-transform hover:scale-125"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => handleRate(star)}
                  >
                    <Star
                      className={`size-7 ${
                        star <= (hoverRating || userRating)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-neutral-300'
                      }`}
                    />
                  </button>
                ))}
                {userRating > 0 && (
                  <span className="ml-2 text-xs font-medium text-amber-600">{userRating}/5</span>
                )}
              </div>
            </Card>

            {/* Reactions */}
            <div>
              <span className="text-xs font-semibold text-neutral-700">Quick Reactions</span>
              <div className="flex gap-2 mt-2 flex-wrap">
                {reactions.map((r) => {
                  const serverCount = serverReactions.find(s => s._id === r.emoji)?.count ?? r.count
                  const isActive = activeReactions.has(r.emoji)
                  return (
                    <button
                      key={r.emoji}
                      type="button"
                      className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all ${
                        isActive
                          ? 'bg-neutral-900 text-white scale-105'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                      onClick={() => toggleReaction(r.emoji)}
                    >
                      <span className="text-base">{r.emoji}</span>
                      <span className="text-[9px] font-medium">
                        {serverCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="size-4 text-neutral-500" />
                <span className="text-xs font-semibold">{commentsList.length} Comments</span>
              </div>

              {/* Comment form */}
              <div className="flex gap-2 mb-4">
                <Avatar className="size-7 bg-neutral-200 shrink-0 mt-0.5">
                  <AvatarFallback className="text-[8px]">HK</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2">
                  <Textarea
                    placeholder="Share your thoughts..."
                    className="min-h-16 text-xs rounded-lg"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      className="h-7 text-xs rounded-lg" 
                      disabled={!commentText.trim() || isSubmitting}
                      onClick={handlePostComment}
                    >
                      {isSubmitting ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-4">
                {commentsList.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-3 text-left">
                    {/* Parent Comment */}
                    <div className="flex gap-2.5">
                      <Avatar className={`size-7 shrink-0 text-white ${comment.color}`}>
                        <AvatarFallback className="text-[8px] text-white">{comment.initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{comment.user}</span>
                          <span className="text-[10px] text-neutral-400">{comment.time}</span>
                        </div>
                        <p className="text-xs leading-5 text-neutral-700 mt-0.5">{comment.text}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          <button
                            type="button"
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 text-[10px] transition-colors ${
                              comment.liked ? 'text-blue-600 font-medium' : 'text-neutral-400 hover:text-neutral-600'
                            }`}
                          >
                            <ThumbsUp className="size-3" /> {comment.likes}
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              setReplyingToId(replyingToId === comment.id ? null : comment.id)
                              setReplyText('')
                            }}
                            className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors"
                          >
                            Reply
                          </button>
                        </div>

                        {/* Reply Input */}
                        {replyingToId === comment.id && (
                          <div className="flex gap-2 mt-3">
                            <Textarea
                              placeholder="Write a reply..."
                              className="min-h-12 text-xs rounded-lg"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <div className="flex flex-col gap-2">
                              <Button 
                                size="sm" 
                                className="h-7 text-[10px] rounded-lg px-3" 
                                disabled={!replyText.trim() || isSubmitting}
                                onClick={() => handlePostReply(comment.id)}
                              >
                                {isSubmitting ? '...' : 'Reply'}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px] rounded-lg px-3"
                                onClick={() => setReplyingToId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Child Comments (Replies) */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className="flex flex-col gap-3 pl-9 border-l-2 border-neutral-100 ml-3.5">
                        {comment.replies.map((reply: any) => (
                          <div key={reply.id} className="flex gap-2.5">
                            <Avatar className={`size-6 shrink-0 text-white ${reply.color}`}>
                              <AvatarFallback className="text-[7px] text-white">{reply.initials}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold">{reply.user}</span>
                                <span className="text-[10px] text-neutral-400">{reply.time}</span>
                              </div>
                              <p className="text-xs leading-5 text-neutral-700 mt-0.5">{reply.text}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleLikeComment(reply.id, comment.id)}
                                  className={`flex items-center gap-1 text-[10px] transition-colors ${
                                    reply.liked ? 'text-blue-600 font-medium' : 'text-neutral-400 hover:text-neutral-600'
                                  }`}
                                >
                                  <ThumbsUp className="size-3" /> {reply.likes}
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    setReplyingToId(comment.id)
                                    setReplyText(`@${reply.user} `)
                                  }}
                                  className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors"
                                >
                                  Reply
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Button variant="ghost" className="w-full mt-3 text-xs text-neutral-500">
                Load more comments...
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
