import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpDown,
  Bookmark,
  Eye,
  Flame,
  Heart,
  Medal,
  Play,
  Search,
  Star,
  TrendingUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, Input, Tabs, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui'

/* ── Series data ─────────────────────────────────────── */
const seriesList = [
  { id: 's1', title: 'Shadow Blade Saga', author: 'Yuki Mori', genre: 'Action', votes: '1.2M', chapters: 42, readers: '340K', cover: '/manga/cover-action.png', hot: true },
  { id: 's2', title: 'Neon Samurai', author: 'Ren Takahashi', genre: 'Sci-Fi', votes: '982K', chapters: 105, readers: '280K', cover: '/manga/cover-scifi.png', hot: true },
  { id: 's3', title: 'Lunar Whispers', author: 'Aiko Nakamura', genre: 'Romance', votes: '845K', chapters: 19, readers: '420K', cover: '/manga/cover-fantasy.png', hot: false },
  { id: 's4', title: 'Iron Dragon Heart', author: 'Kenji Sato', genre: 'Fantasy', votes: '512K', chapters: 67, readers: '190K', cover: '/manga/cover-horror.png', hot: true },
  { id: 's5', title: 'Cherry Blossom Code', author: 'Hana Ito', genre: 'Slice of Life', votes: '380K', chapters: 30, readers: '150K', cover: '/manga/cover-fantasy.png', hot: false },
  { id: 's6', title: 'Ocean Phantom', author: 'Shiro Kato', genre: 'Horror', votes: '290K', chapters: 88, readers: '95K', cover: '/manga/cover-horror.png', hot: false },
  { id: 's7', title: 'Tokyo Spirits', author: 'Mai Yamada', genre: 'Action', votes: '445K', chapters: 31, readers: '210K', cover: '/manga/cover-action.png', hot: true },
  { id: 's8', title: 'Forge of Legends', author: 'Hiro Kazuo', genre: 'Fantasy', votes: '678K', chapters: 54, readers: '250K', cover: '/manga/cover-scifi.png', hot: false },
]

/* ── Leaderboard ─────────────────────────────────────── */
const leaderboard = [
  { rank: 1, username: 'MangaHunter_99', votes: '12,847', seriesRead: 89, badge: '🏆 Champion', level: 'Diamond' },
  { rank: 2, username: 'OtakuSenpai', votes: '11,204', seriesRead: 76, badge: '⚔️ Warrior', level: 'Platinum' },
  { rank: 3, username: 'InkDrinker', votes: '9,856', seriesRead: 64, badge: '🔥 Fire', level: 'Gold' },
  { rank: 4, username: 'PageTurner_X', votes: '8,392', seriesRead: 58, badge: '📖 Scholar', level: 'Gold' },
  { rank: 5, username: 'MoonlitReader', votes: '7,105', seriesRead: 51, badge: '🌙 Mystic', level: 'Silver' },
  { rank: 6, username: 'DragonScroll', votes: '6,230', seriesRead: 45, badge: '🐉 Dragon', level: 'Silver' },
]

/* ── New releases ────────────────────────────────────── */
const newReleases = [
  { title: 'Shadow Blade Saga Ch. 42', series: 'Shadow Blade Saga', date: '2 hours ago', cover: '/manga/cover-action.png' },
  { title: 'Neon Samurai Ch. 106', series: 'Neon Samurai', date: '5 hours ago', cover: '/manga/cover-scifi.png' },
  { title: 'Iron Dragon Ch. 68', series: 'Iron Dragon Heart', date: '1 day ago', cover: '/manga/cover-horror.png' },
  { title: 'Lunar Whispers Ch. 19', series: 'Lunar Whispers', date: '1 day ago', cover: '/manga/cover-fantasy.png' },
  { title: 'Tokyo Spirits Ch. 32', series: 'Tokyo Spirits', date: '2 days ago', cover: '/manga/cover-action.png' },
]

const categories = ['All', 'Action', 'Romance', 'Sci-Fi', 'Fantasy', 'Horror', 'Slice of Life']

import { useNavigate } from 'react-router-dom'

export function ReaderHubPage() {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredSeries = seriesList.filter((s) => {
    const matchCategory = activeCategory === 'All' || s.genre === activeCategory
    const matchSearch = searchQuery === '' || s.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCategory && matchSearch
  })

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
        <section className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white">
          <img
            src="/manga/featured-banner.png"
            alt="Featured manga"
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />

          <div className="relative flex flex-col justify-end gap-4 p-6 sm:p-8 lg:p-10" style={{ minHeight: '280px' }}>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="gap-1 bg-white/15 text-white border-white/20 backdrop-blur">
                <Flame className="size-3" /> Trending #1
              </Badge>
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur">Action</Badge>
              <Badge variant="secondary" className="bg-white/15 text-white border-white/20 backdrop-blur">42 Chapters</Badge>
            </div>

            <div className="max-w-xl space-y-2">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Shadow Blade Saga</h2>
              <p className="text-sm leading-6 text-white/70">
                In a world where ancient swords choose their wielders, a young ronin discovers a blade that can cut through fate itself.
                Follow Kaito's journey through war-torn provinces as he faces impossible odds.
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs text-white/60">
              <span className="flex items-center gap-1"><Eye className="size-3.5" /> 340K readers</span>
              <span className="flex items-center gap-1"><Heart className="size-3.5" /> 1.2M votes</span>
              <span className="flex items-center gap-1"><Star className="size-3.5" /> 4.9 rating</span>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="secondary"
                onClick={() => navigate('/read/s1')}
                className="gap-1.5"
              >
                <Play className="size-3.5" /> Read Now
              </Button>
              <Button variant="outline" className="gap-1.5 border-white/20 bg-transparent text-white hover:bg-white/10">
                <Bookmark className="size-3.5" /> Add to List
              </Button>
            </div>
          </div>
        </section>

        {/* ── Hot This Week ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="size-4 text-orange-500" />
              <h2 className="text-base font-semibold">Hot This Week</h2>
            </div>
            <Button variant="ghost" size="sm" className="text-xs gap-1 text-neutral-500">
              See all <ArrowRight className="size-3" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredSeries.map((series) => (
              <Card
                key={series.id}
                className="group cursor-pointer overflow-hidden shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                onClick={() => navigate(`/read/${series.id}`)}
              >
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={series.cover}
                    alt={series.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {series.hot && (
                    <Badge variant="destructive" className="absolute top-2 left-2 text-[9px] px-1.5 py-0 h-4 gap-0.5">
                      <Flame className="size-2.5" /> Hot
                    </Badge>
                  )}

                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="text-sm font-semibold text-white truncate">{series.title}</h3>
                    <p className="text-[10px] text-white/70">{series.author}</p>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5">{series.genre}</Badge>
                    <span className="text-[10px] text-neutral-500">{series.chapters} ch.</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Heart className="size-3 text-rose-400" /> {series.votes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="size-3" /> {series.readers}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── New Releases ───────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-blue-500" />
              <h2 className="text-base font-semibold">New Releases</h2>
            </div>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {newReleases.map((release, idx) => (
              <Card
                key={idx}
                className="flex-none w-44 cursor-pointer overflow-hidden shadow-sm transition-all hover:shadow-md group"
                onClick={() => navigate(`/read/s1`)}
              >
                <div className="relative h-24 overflow-hidden">
                  <img src={release.cover} alt={release.title} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </div>
                <div className="p-2">
                  <p className="text-[11px] font-medium truncate">{release.title}</p>
                  <p className="text-[10px] text-neutral-500">{release.date}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Reader Leaderboard ─────────────────────── */}
        <Card className="p-6 shadow-sm">
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
                {leaderboard.map((row) => (
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
                        row.level === 'Diamond' ? 'text-blue-600' : row.level === 'Platinum' ? 'text-purple-600' :
                        row.level === 'Gold' ? 'text-amber-600' : 'text-neutral-500'
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
