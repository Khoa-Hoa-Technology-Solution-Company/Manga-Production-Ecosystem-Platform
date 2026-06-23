import { useState, useEffect } from 'react'
import { ArrowDown, Search, BookOpen, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui'
import { dashboardAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'

type RankingItem = {
  _id: string
  title: string
  genre: string[]
  weeklyVotes: number
  totalVotes: number
  averageRating?: number
  ratingCount?: number
  status: string
}

export function SeriesRankingSection() {
  const { user } = useAuth()
  const [sortBy, setSortBy] = useState<'votes' | 'rating'>('votes')
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSortChange = (newSortBy: 'votes' | 'rating') => {
    if (newSortBy !== sortBy) {
      setSortBy(newSortBy)
      setLoading(true)
    }
  }

  useEffect(() => {
    dashboardAPI.getRankings(sortBy)
      .then((res) => {
        setRankings(res.data.rankings || [])
      })
      .catch((err) => {
        console.error('Failed to fetch rankings for dashboard section:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [sortBy])

  const filteredRankings = rankings.filter((row) =>
    row.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Card className="gap-4 p-6 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base leading-6">Series Ranking & Ratings</CardTitle>
          <span className="text-xs leading-4 text-neutral-500">
            {user?.role === 'mangaka' && 'Top performing active and completed series in your studio'}
            {user?.role === 'editor' && 'Top performing active and completed series you manage'}
            {user?.role === 'assistant' && 'Performance of series you are assisting with'}
            {user?.role === 'editorial_board' && 'Top performing active and completed series on the platform'}
            {user?.role === 'reader' && 'Top performing active and completed series on the platform'}
            {!['mangaka', 'editor', 'assistant', 'editorial_board', 'reader'].includes(user?.role || '') && 'Top performing active and completed series'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort selection tabs */}
          <div className="flex rounded-lg bg-neutral-100 p-0.5 border border-neutral-200">
            <button
              onClick={() => handleSortChange('votes')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                sortBy === 'votes' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Weekly Votes
            </button>
            <button
              onClick={() => handleSortChange('rating')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                sortBy === 'rating' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Average Rating
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-neutral-500" />
            <Input
              placeholder="Search series..."
              className="h-8 w-56 pl-8 text-xs leading-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Rank</TableHead>
                <TableHead>Series Title</TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Rating {sortBy === 'rating' && <ArrowDown className="size-3" />}
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Weekly Votes {sortBy === 'votes' && <ArrowDown className="size-3" />}
                  </div>
                </TableHead>
                <TableHead>Total Votes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                    Loading rankings...
                  </TableCell>
                </TableRow>
              ) : filteredRankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-neutral-500">
                    No series found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRankings.map((row, idx) => (
                  <TableRow key={row._id}>
                    <TableCell className="font-semibold">#{idx + 1}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <BookOpen className="size-3.5 text-neutral-400" />
                        {row.title}
                      </div>
                    </TableCell>
                    <TableCell className="text-neutral-500">{row.genre.join(', ')}</TableCell>
                    <TableCell className="font-semibold text-amber-500">
                      <Star className="size-3.5 fill-amber-400 text-amber-400 inline mr-1 align-middle" />
                      {row.averageRating !== undefined ? row.averageRating.toFixed(1) : '0.0'}
                      <span className="text-[10px] text-neutral-400 font-normal ml-1">
                        ({row.ratingCount || 0})
                      </span>
                    </TableCell>
                    <TableCell className={`font-semibold ${sortBy === 'votes' ? 'text-neutral-900' : 'text-neutral-500'}`}>{row.weeklyVotes.toLocaleString()}</TableCell>
                    <TableCell className="text-neutral-500">{row.totalVotes.toLocaleString()}</TableCell>
                    <TableCell>
                      <span 
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          row.status === 'Active' || row.status === 'Completed'
                            ? 'text-emerald-700 border-emerald-200 bg-emerald-50'
                            : 'text-amber-700 border-amber-200 bg-amber-50'
                        }`}
                      >
                        {row.status === 'Active' || row.status === 'Completed' ? 'Published' : 'Coming Soon'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-3">
          <span className="text-xs leading-4 text-neutral-500">
            Showing {filteredRankings.length} of {rankings.length} series
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
