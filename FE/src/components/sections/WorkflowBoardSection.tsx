import { Calendar, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from '../ui'

const columns = [
  {
    title: 'Draft',
    color: 'bg-neutral-500',
    count: '3',
    items: [
      { chapter: 'Ch. 42', series: 'Shadow Blade Saga', author: 'YM', date: 'Mar 22', progress: 35 },
      { chapter: 'Ch. 18', series: 'Lunar Whispers', author: 'RT', date: 'Mar 25', progress: 18 },
    ],
  },
  {
    title: 'Reviewing',
    color: 'bg-amber-500',
    count: '2',
    items: [
      { chapter: 'Ch. 67', series: 'Iron Dragon Heart', author: 'KS', date: 'Mar 20', progress: 72 },
      { chapter: 'Ch. 29', series: 'Cherry Blossom Code', author: 'AN', date: 'Mar 21', progress: 65 },
    ],
  },
  {
    title: 'Approved',
    color: 'bg-sky-500',
    count: '2',
    items: [
      { chapter: 'Ch. 105', series: 'Neon Samurai', author: 'TM', date: 'Mar 19', progress: 92 },
      { chapter: 'Ch. 54', series: 'Forge of Legends', author: 'HK', date: 'Mar 19', progress: 95 },
    ],
  },
  {
    title: 'Published',
    color: 'bg-emerald-500',
    count: '2',
    items: [
      { chapter: 'Ch. 88', series: 'Ocean Phantom', author: 'SK', date: 'Mar 15', progress: 100 },
      { chapter: 'Ch. 31', series: 'Tokyo Spirits', author: 'MY', date: 'Mar 14', progress: 100 },
    ],
  },
]

export function WorkflowBoardSection() {
  return (
    <Card className="gap-4 p-6 shadow-sm">
      <CardHeader className="flex-row items-center justify-between gap-2 p-0">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base leading-6">Chapter Workflow Board</CardTitle>
          <span className="text-xs leading-4 text-neutral-500">Track chapters across production stages</span>
        </div>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="size-3" />
          New Chapter
        </Button>
      </CardHeader>

      <CardContent className="grid gap-4 p-0 xl:grid-cols-4">
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <span className={`size-2 rounded-full ${column.color}`} />
                <span className="text-xs font-medium leading-4">{column.title}</span>
                <Badge variant="default" className="h-4 px-1 text-[10px]">
                  {column.count}
                </Badge>
              </div>
              <MoreHorizontal className="size-3 text-neutral-500" />
            </div>

            {column.items.map((item) => (
              <div key={item.chapter} className="flex flex-col gap-2 rounded-lg border border-neutral-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold leading-4">{item.chapter}</span>
                  <Avatar className="size-5 bg-neutral-200">
                    <AvatarFallback className="text-[8px]">{item.author}</AvatarFallback>
                  </Avatar>
                </div>
                <span className="text-xs leading-4 text-neutral-500">{item.series}</span>
                <div className="flex items-center justify-between text-[10px] text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" />
                    {item.date}
                  </span>
                  <span>{item.progress}%</span>
                </div>
                <Progress value={item.progress} className="h-1" />
              </div>
            ))}
          </div>
        ))}
      </CardContent>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
        <span className="text-xs leading-4 text-neutral-500">Showing 1-4 of 24 series</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="size-7 p-0">
            <ChevronLeft className="size-3" />
          </Button>
          <Button variant="outline" size="sm" className="size-7 p-0">
            1
          </Button>
          <Button variant="ghost" size="sm" className="size-7 p-0">
            2
          </Button>
          <Button variant="ghost" size="sm" className="size-7 p-0">
            3
          </Button>
          <Button variant="outline" size="sm" className="size-7 p-0">
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
