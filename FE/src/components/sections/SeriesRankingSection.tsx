import { ArrowDown, ArrowUpDown, Filter, Search } from 'lucide-react'
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui'

const rows = [
  { rank: '#1', title: 'Shadow Blade Saga', genre: 'Action', weekly: '24,832', votes: '1.2M', status: 'Published' },
  { rank: '#2', title: 'Neon Samurai', genre: 'Sci-Fi', weekly: '21,104', votes: '982K', status: 'Published', highlight: true },
  { rank: '#3', title: 'Iron Dragon Heart', genre: 'Fantasy', weekly: '18,567', votes: '845K', status: 'Published' },
  { rank: '#4', title: 'Lunar Whispers', genre: 'Romance', weekly: '14,209', votes: '512K', status: 'Draft' },
]

export function SeriesRankingSection() {
  return (
    <Card className="gap-4 p-6 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base leading-6">Series Ranking & Reader Votes</CardTitle>
          <span className="text-xs leading-4 text-neutral-500">Top performing series this week</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3 -translate-y-1/2 text-neutral-500" />
            <Input placeholder="Search series..." className="h-8 w-56 pl-8 text-xs leading-4" />
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="size-3" />
            Filter
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <div className="flex items-center gap-1">
                    Rank <ArrowUpDown className="size-3" />
                  </div>
                </TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Series Title <ArrowUpDown className="size-3" />
                  </div>
                </TableHead>
                <TableHead>Genre</TableHead>
                <TableHead>
                  <div className="flex items-center gap-1">
                    Weekly <ArrowDown className="size-3" />
                  </div>
                </TableHead>
                <TableHead>Total Votes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.rank} className={row.highlight ? 'bg-neutral-100/40' : ''}>
                  <TableCell className="font-semibold">{row.rank}</TableCell>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell className="text-neutral-500">{row.genre}</TableCell>
                  <TableCell>{row.weekly}</TableCell>
                  <TableCell className="text-neutral-500">{row.votes}</TableCell>
                  <TableCell>
                    <Badge variant="default" className={row.status === 'Draft' ? 'border-neutral-200 text-neutral-900' : 'text-emerald-600'}>
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs leading-4">
                      View
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs leading-4">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
          <span className="text-xs leading-4 text-neutral-500">Showing 1-4 of 24 series</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="size-7 p-0">
              1
            </Button>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              2
            </Button>
            <Button variant="ghost" size="sm" className="size-7 p-0">
              3
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
