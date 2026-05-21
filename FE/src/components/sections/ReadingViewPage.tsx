import { useState } from 'react'
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  Share2,
  Star,
  ThumbsUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, Textarea } from '../ui'

/* ── Chapter data ────────────────────────────────────── */
const chapterInfo = {
  series: 'Shadow Blade Saga',
  chapter: 42,
  title: 'The Blade Awakens',
  author: 'Yuki Mori',
  publishedDate: 'March 18, 2026',
  totalPages: 24,
  voteCount: '184.2K',
  rating: 4.9,
  ratingCount: 2847,
}

/* ── Page images ─────────────────────────────────────── */
const pages = [
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

type ReadingViewProps = {
  onBack?: () => void
}

export function ReadingViewPage({ onBack }: ReadingViewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [userRating, setUserRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [bookmarked, setBookmarked] = useState(false)
  const [voted, setVoted] = useState(false)
  const [activeReactions, setActiveReactions] = useState<Set<string>>(new Set())

  const toggleReaction = (emoji: string) => {
    setActiveReactions((prev) => {
      const next = new Set(prev)
      if (next.has(emoji)) next.delete(emoji)
      else next.add(emoji)
      return next
    })
  }

  return (
    <div className="flex flex-col">
      {/* ── Top bar ──────────────────────────────────── */}
      <header className="flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate">{chapterInfo.series}</h1>
            <p className="text-[10px] text-neutral-500">Ch. {chapterInfo.chapter} — {chapterInfo.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={bookmarked ? 'secondary' : 'ghost'}
            size="sm"
            className="size-8 p-0 rounded-lg"
            onClick={() => setBookmarked(!bookmarked)}
          >
            <Bookmark className={`size-4 ${bookmarked ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg">
            <Share2 className="size-4" />
          </Button>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────── */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ── Manga Viewer (Left) ─────────────────── */}
        <div className="flex-1 flex flex-col bg-neutral-100">
          {/* Page display */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="relative w-full max-w-lg">
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
          </div>

          {/* Page navigation bar */}
          <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="size-3.5" /> Prev
            </Button>

            <div className="flex items-center gap-1.5">
              {pages.map((p, idx) => (
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
              {chapterInfo.totalPages > pages.length && (
                <span className="text-[10px] text-neutral-400 ml-1">+{chapterInfo.totalPages - pages.length} more</span>
              )}
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs"
              onClick={() => setCurrentPage(Math.min(chapterInfo.totalPages - 1, currentPage + 1))}
              disabled={currentPage === chapterInfo.totalPages - 1}
            >
              Next <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Right Sidebar (Info + Comments) ─────── */}
        <div className="w-full border-t border-neutral-200 lg:w-96 lg:border-l lg:border-t-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 57px)' }}>
          <div className="p-4 sm:p-5 space-y-5">
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
                  <AvatarFallback className="text-[8px]">YM</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-medium">{chapterInfo.author}</p>
                  <p className="text-[10px] text-neutral-500">Published {chapterInfo.publishedDate}</p>
                </div>
              </div>
            </div>

            {/* Rating */}
            <Card className="rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold">Rate this chapter</span>
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
                    onClick={() => setUserRating(star)}
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

            {/* Voting */}
            <Card className="rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold">Reader Votes</span>
                  <p className="text-lg font-bold mt-0.5">{chapterInfo.voteCount}</p>
                </div>
                <Button
                  variant={voted ? 'secondary' : 'default'}
                  className="gap-1.5"
                  onClick={() => setVoted(!voted)}
                >
                  <Heart className={`size-4 ${voted ? 'fill-rose-500 text-rose-500' : ''}`} />
                  {voted ? 'Voted!' : 'Vote'}
                </Button>
              </div>
            </Card>

            {/* Reactions */}
            <div>
              <span className="text-xs font-semibold text-neutral-700">Quick Reactions</span>
              <div className="flex gap-2 mt-2">
                {reactions.map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 transition-all ${
                      activeReactions.has(r.emoji)
                        ? 'bg-neutral-900 text-white scale-105'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                    onClick={() => toggleReaction(r.emoji)}
                  >
                    <span className="text-base">{r.emoji}</span>
                    <span className="text-[9px] font-medium">
                      {activeReactions.has(r.emoji) ? r.count + 1 : r.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="size-4 text-neutral-500" />
                <span className="text-xs font-semibold">{comments.length + 42} Comments</span>
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
                    <Button size="sm" className="h-7 text-xs rounded-lg" disabled={!commentText.trim()}>
                      Post Comment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Comments list */}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-2.5">
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
                          className={`flex items-center gap-1 text-[10px] transition-colors ${
                            comment.liked ? 'text-blue-600 font-medium' : 'text-neutral-400 hover:text-neutral-600'
                          }`}
                        >
                          <ThumbsUp className="size-3" /> {comment.likes}
                        </button>
                        <button type="button" className="text-[10px] text-neutral-400 hover:text-neutral-600 transition-colors">
                          Reply
                        </button>
                      </div>
                    </div>
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
