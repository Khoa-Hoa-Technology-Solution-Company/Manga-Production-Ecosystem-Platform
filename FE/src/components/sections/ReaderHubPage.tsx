import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpDown,
  Bell,
  Eye,
  Flame,
  Heart,
  Medal,
  Play,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, Input, Tabs, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui'
import { seriesAPI, chaptersAPI, dashboardAPI, authAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'

interface SeriesData {
  _id: string
  title: string
  description: string
  genre: string[]
  coverImage?: string
  totalChapters: number
  totalVotes: number
  readerCount: number
  status?: string
  subscribers?: string[]
  mangakaId?: {
    displayName: string
  }
}

interface ReleaseData {
  _id: string
  chapterNumber: number
  title: string
  updatedAt?: string
  createdAt: string
  seriesId?: {
    title: string
  }
}

interface ChapterData {
  _id: string
  chapterNumber: number
  status: string
}

interface LeaderboardItem {
  rank: number
  username: string
  votes: string
  seriesRead: number
  badge: string
  level: string
}

interface RawLeaderboardItem {
  username: string
  votes: number
  seriesRead: number
}

/* ── Leaderboard (Mock data preserved) ──────────────── */
const leaderboard = [
  { rank: 1, username: 'MangaHunter_99', votes: '12,847', seriesRead: 89, badge: '🏆 Champion', level: 'Diamond' },
  { rank: 2, username: 'OtakuSenpai', votes: '11,204', seriesRead: 76, badge: '⚔️ Warrior', level: 'Platinum' },
  { rank: 3, username: 'InkDrinker', votes: '9,856', seriesRead: 64, badge: '🔥 Fire', level: 'Gold' },
  { rank: 4, username: 'PageTurner_X', votes: '8,392', seriesRead: 58, badge: '📖 Scholar', level: 'Gold' },
  { rank: 5, username: 'MoonlitReader', votes: '7,105', seriesRead: 51, badge: '🌙 Mystic', level: 'Silver' },
  { rank: 6, username: 'DragonScroll', votes: '6,230', seriesRead: 45, badge: '🐉 Dragon', level: 'Silver' },
]

const categories = ['All', 'Action', 'Romance', 'Sci-Fi', 'Fantasy', 'Horror', 'Comedy']

export function ReaderHubPage() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { user, updateUser } = useAuth()
  const [subscribing, setSubscribing] = useState(false)

  const handleToggleSubscription = async () => {
    if (!user) return
    setSubscribing(true)
    try {
      const isCurrentlySubscribed = !!user.subscribedToNewSeries
      const res = await authAPI.updateProfile({
        subscribedToNewSeries: !isCurrentlySubscribed,
      })
      if (res.data.user) {
        updateUser(res.data.user)
      }
    } catch (err) {
      console.error('Failed to update subscription:', err)
    } finally {
      setSubscribing(false)
    }
  }

  const [subscribingSeriesId, setSubscribingSeriesId] = useState<string | null>(null)

  const handleToggleSeriesSubscribe = async (e: React.MouseEvent, seriesId: string) => {
    e.stopPropagation()
    if (!user) return
    setSubscribingSeriesId(seriesId)
    try {
      const res = await seriesAPI.subscribe(seriesId)
      const updated = res.data.series
      if (updated) {
        setSeriesList((prev) => prev.map((s) => s._id === seriesId ? { ...s, subscribers: updated.subscribers } : s))
      }
    } catch (err) {
      console.error('Failed to toggle series subscription:', err)
    } finally {
      setSubscribingSeriesId(null)
    }
  }

  const [searchParams, setSearchParams] = useSearchParams()
  const activeCategory = searchParams.get('category') || 'All'
  const setActiveCategory = (category: string) => {
    setSearchParams(
      (prev) => {
        if (category && category !== 'All') {
          prev.set('category', category)
        } else {
          prev.delete('category')
        }
        return prev
      },
      { replace: true }
    )
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [seriesList, setSeriesList] = useState<SeriesData[]>([])
  const [newReleases, setNewReleases] = useState<ReleaseData[]>([])
  const [leaderboardList, setLeaderboardList] = useState<LeaderboardItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch active/completed series
    seriesAPI.getAll()
      .then((res) => {
        setSeriesList(res.data.series || [])
      })
      .catch((err) => {
        console.error('Failed to fetch series for reader hub:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // Fetch recently published chapters as new releases
    dashboardAPI.getWorkflow()
      .then((res) => {
        setNewReleases(res.data.workflow?.Published || [])
      })
      .catch((err) => {
        console.error('Failed to fetch new releases:', err)
      })

    // Fetch reader rankings
    dashboardAPI.getRankings()
      .then((res) => {
        if (res.data.readerLeaderboard && res.data.readerLeaderboard.length > 0) {
          const formatted = res.data.readerLeaderboard.map((item: RawLeaderboardItem, idx: number) => {
            let badge = '📖 Reader'
            let level = 'Bronze'
            if (idx === 0) {
              badge = '🏆 Champion'
              level = 'Diamond'
            } else if (idx === 1) {
              badge = '⚔️ Warrior'
              level = 'Platinum'
            } else if (idx === 2) {
              badge = '🔥 Fire'
              level = 'Gold'
            } else if (idx < 5) {
              badge = '📖 Scholar'
              level = 'Silver'
            }
            return {
              rank: idx + 1,
              username: item.username,
              votes: item.votes.toLocaleString(),
              seriesRead: item.seriesRead,
              badge,
              level,
            }
          })
          setLeaderboardList(formatted)
        } else {
          setLeaderboardList(leaderboard)
        }
      })
      .catch((err) => {
        console.error('Failed to fetch reader rankings:', err)
        setLeaderboardList(leaderboard)
      })
  }, [])

  const handleReadSeries = async (seriesId: string) => {
    try {
      const res = await chaptersAPI.getBySeries(seriesId)
      const publishedChapters = (res.data.chapters || [])
        .filter((c: ChapterData) => c.status === 'Published')
        .sort((a: ChapterData, b: ChapterData) => a.chapterNumber - b.chapterNumber) // Start from first chapter (Ch. 1)

      if (publishedChapters.length > 0) {
        navigate(`/read/${publishedChapters[0]._id}`)
      } else {
        alert('Truyện này chưa có chapter nào được xuất bản. / This series has no published chapters yet.')
      }
    } catch (err) {
      console.error('Failed to start reading series:', err)
      alert('Không thể tải danh sách chương. / Failed to load chapters.')
    }
  }

  const filteredSeries = seriesList.filter((s) => {
    const isPublic = s.status === 'Active' || s.status === 'Completed'
    if (!isPublic) return false
    const matchCategory = activeCategory === 'All' || (s.genre && s.genre.some((g: string) => g.toLowerCase() === activeCategory.toLowerCase()))
    const matchSearch = searchQuery === '' || s.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

  const featuredSeries = seriesList.filter((s) => s.status === 'Active' || s.status === 'Completed')[0] || null

  return (
    <div className="flex flex-col">
      {/* ── Header ─────────────────────────────────── */}
      <header className="flex flex-col gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Discover</h1>
            <p className="text-xs text-neutral-500">Explore manga, vote for favorites, and join the community</p>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <Button
                variant={user.subscribedToNewSeries ? 'default' : 'outline'}
                size="sm"
                className={`h-8 gap-1.5 text-xs rounded-xl transition-all duration-300 ${
                  user.subscribedToNewSeries ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-transparent' : ''
                }`}
                onClick={handleToggleSubscription}
                disabled={subscribing}
              >
                <Bell className={`size-3.5 ${user.subscribedToNewSeries ? 'fill-current animate-bounce' : ''}`} />
                {user.subscribedToNewSeries 
                  ? t('settingsPage.subscribed', i18n.language === 'vi' ? 'Đã đăng ký' : 'Subscribed') 
                  : t('settingsPage.subscribeNewSeries', i18n.language === 'vi' ? 'Nhận thông báo series mới' : 'Notify on New Series')
                }
              </Button>
            )}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-neutral-500" />
              <Input
                placeholder="Search series..."
                className="h-8 w-52 pl-8 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <Tabs
          tabs={categories.map((c) => ({ key: c, label: c }))}
          active={activeCategory}
          onChange={setActiveCategory}
        />
      </header>

      <div className="flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        {/* ── Featured Banner ────────────────────────── */}
        {featuredSeries && (
          <section className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white shadow-lg">
            {featuredSeries.coverImage && (
              <img
                src={featuredSeries.coverImage}
                alt="Featured manga"
                className="absolute inset-0 h-full w-full object-cover opacity-40"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-transparent" />

            <div className="relative flex flex-col justify-end gap-4 p-6 sm:p-8 lg:p-10" style={{ minHeight: '300px' }}>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 bg-white/15 text-white border-white/20 backdrop-blur">
                  <Flame className="size-3 text-orange-400" /> Trending #1
                </Badge>
                <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur">
                  {featuredSeries.genre ? featuredSeries.genre[0] : 'Genre'}
                </Badge>
                <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur">
                  {featuredSeries.totalChapters || 0} Chapters
                </Badge>
              </div>

              <div className="max-w-xl space-y-2">
                <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{featuredSeries.title}</h2>
                <p className="text-sm leading-6 text-white/70 line-clamp-3">
                  {featuredSeries.description}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-white/60">
                <span className="flex items-center gap-1">
                  <Eye className="size-3.5" /> {(featuredSeries.readerCount || 0).toLocaleString()} readers
                </span>
                <span className="flex items-center gap-1">
                  <Heart className="size-3.5" /> {(featuredSeries.totalVotes || 0).toLocaleString()} votes
                </span>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="secondary"
                  onClick={() => handleReadSeries(featuredSeries._id)}
                  className="gap-1.5 font-semibold"
                >
                  <Play className="size-3.5" /> Read Now
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── Hot This Week ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <h2 className="text-base font-semibold">Hot This Week</h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-neutral-500">Loading series...</div>
          ) : filteredSeries.length === 0 ? (
            <div className="text-center py-12 text-sm text-neutral-500">No active series found</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredSeries.map((series) => (
                <Card
                  key={series._id}
                  className="group cursor-pointer overflow-hidden shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 border border-neutral-100 rounded-2xl bg-white"
                  onClick={() => handleReadSeries(series._id)}
                >
                  <div className="relative h-48 overflow-hidden bg-neutral-100">
                    {series.coverImage ? (
                      <img
                        src={series.coverImage}
                        alt={series.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <TrendingUp className="size-8 text-neutral-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                    {series.totalVotes > 100 && (
                      <Badge variant="destructive" className="absolute top-2 left-2 text-[9px] px-1.5 py-0 h-4 gap-0.5">
                        <Flame className="size-2.5" /> Hot
                      </Badge>
                    )}

                    <span 
                      className={`absolute top-2 right-2 text-[9px] px-2 py-0.5 rounded-full font-bold shadow-md select-none ${
                        series.status === 'Active' || series.status === 'Completed'
                          ? 'bg-emerald-600 text-white border border-emerald-700'
                          : 'bg-amber-500 text-white border border-amber-600'
                      }`}
                    >
                      {series.status === 'Active' || series.status === 'Completed' ? 'Published' : 'Coming Soon'}
                    </span>

                    <div className="absolute bottom-2 left-2 right-2">
                      <h3 className="text-sm font-semibold text-white truncate">{series.title}</h3>
                      <p className="text-[10px] text-white/70">{series.mangakaId?.displayName || 'Author'}</p>
                    </div>
                  </div>

                  <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-neutral-100 text-neutral-600 border-none">
                        {series.genre ? series.genre.join(', ') : 'Genre'}
                      </Badge>
                      <span className="text-[10px] text-neutral-500">{series.totalChapters || 0} ch.</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Heart className="size-3 text-rose-400" /> {(series.totalVotes || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="size-3" /> {(series.readerCount || 0).toLocaleString()}
                        </span>
                      </div>
                      {user && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-8 w-8 p-0 rounded-full transition-all duration-300 ${
                            series.subscribers?.includes(user._id)
                              ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-700'
                              : 'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100'
                          }`}
                          onClick={(e) => handleToggleSeriesSubscribe(e, series._id)}
                          disabled={subscribingSeriesId === series._id}
                          title={series.subscribers?.includes(user._id) ? 'Unsubscribe from new chapters' : 'Subscribe to new chapters'}
                        >
                          <Bell className={`size-5 ${series.subscribers?.includes(user._id) ? 'fill-current animate-pulse' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* ── New Releases ───────────────────────────── */}
        {newReleases.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-blue-500" />
                <h2 className="text-base font-semibold">New Releases</h2>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {newReleases.map((release) => (
                <Card
                  key={release._id}
                  className="flex-none w-44 cursor-pointer overflow-hidden shadow-sm transition-all hover:shadow-md group border border-neutral-100 rounded-xl bg-white"
                  onClick={() => navigate(`/read/${release._id}`)}
                >
                  <div className="relative h-24 overflow-hidden bg-neutral-900 flex items-center justify-center">
                    <div className="absolute inset-0 bg-neutral-950/40 z-10" />
                    <span className="text-white text-xs font-bold z-20">Ch. {release.chapterNumber}</span>
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-[11px] font-semibold text-neutral-900 truncate">
                      {release.seriesId?.title || 'Series'}
                    </p>
                    <p className="text-[10px] text-neutral-600 truncate">
                      {release.title}
                    </p>
                    <p className="text-[9px] text-neutral-400">
                      {new Date(release.updatedAt || release.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* ── Reader Leaderboard ─────────────────────── */}
        <Card className="p-6 shadow-sm border border-neutral-100 rounded-2xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Medal className="size-4 text-amber-500" />
              <h2 className="text-base font-semibold">Reader Leaderboard</h2>
            </div>
            <span className="text-xs text-neutral-500">This month</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <div className="flex items-center gap-1">Rank <ArrowUpDown className="size-3" /></div>
                  </TableHead>
                  <TableHead>Reader</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">Votes <ArrowUpDown className="size-3" /></div>
                  </TableHead>
                  <TableHead>Series Read</TableHead>
                  <TableHead>Badge</TableHead>
                  <TableHead>Level</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardList.map((row) => (
                  <TableRow key={row.rank} className={row.rank <= 3 ? 'bg-amber-50/30' : ''}>
                    <TableCell className="font-bold">
                      {row.rank <= 3 ? (
                        <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                          row.rank === 1 ? 'bg-amber-500' : row.rank === 2 ? 'bg-neutral-400' : 'bg-amber-700'
                        }`}>
                          {row.rank}
                        </span>
                      ) : (
                        <span className="text-neutral-500">#{row.rank}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7 bg-neutral-200">
                          <AvatarFallback className="text-[8px]">{row.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{row.username}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold">{row.votes}</TableCell>
                    <TableCell className="text-neutral-500">{row.seriesRead}</TableCell>
                    <TableCell>{row.badge}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-[10px] ${
                        row.level === 'Diamond' ? 'text-blue-600 border-blue-100 bg-blue-50' : row.level === 'Platinum' ? 'text-purple-600 border-purple-100 bg-purple-50' :
                        row.level === 'Gold' ? 'text-amber-600 border-amber-100 bg-amber-50' : 'text-neutral-500'
                      }`}>
                        {row.level}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  )
}
