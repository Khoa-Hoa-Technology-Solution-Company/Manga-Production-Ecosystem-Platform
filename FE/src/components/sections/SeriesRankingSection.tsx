import { useState, useEffect } from 'react'
import { ArrowDown, Search, BookOpen } from 'lucide-react'
import { Badge, Card, CardContent, CardHeader, CardTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui'
import { dashboardAPI } from '../../lib/api'

type RankingItem = {
  _id: string
  title: string
  genre: string[]
  weeklyVotes: number
  totalVotes: number
  status: string
}

export function SeriesRankingSection() {
  const [rankings, setRankings] = useState<RankingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    dashboardAPI.getRankings()
      .then((res) => {
        setRankings(res.data.rankings || [])
      })
      .catch((err) => {
        console.error('Failed to fetch rankings for dashboard section:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredRankings = rankings.filter((row) =>
    row.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Card className="gap-4 p-6 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base leading-6">Series Ranking & Reader Votes</CardTitle>
          <span className="text-xs leading-4 text-neutral-500">Top performing active and completed series this week</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
                    Weekly <ArrowDown className="size-3" />
                  </div>
                </TableHead>
                <TableHead>Total Votes</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-neutral-500">
                    Loading rankings...
                  </TableCell>
                </TableRow>
              ) : filteredRankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-neutral-500">
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
                    <TableCell className="font-semibold text-neutral-900">{row.weeklyVotes.toLocaleString()}</TableCell>
                    <TableCell className="text-neutral-500">{row.totalVotes.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="default" className="text-emerald-600 border-emerald-100 bg-emerald-50">
                        {row.status}
                      </Badge>
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
