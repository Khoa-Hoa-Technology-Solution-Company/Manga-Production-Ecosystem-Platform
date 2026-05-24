import { useEffect, useMemo, useState } from 'react'
import { Bell, CheckCheck, Clock3, Filter, MailOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button, Card } from '../ui'
import { notificationsAPI } from '../../lib/api'

type NotificationItem = {
  _id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  relatedType?: string
}

const filterOptions = [
  { id: 'all', label: 'All notifications' },
  { id: 'unread', label: 'Unread only' },
  { id: 'review', label: 'Review updates' },
]

export function NotificationCenterPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items])

  const loadNotifications = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = {}
      if (filter === 'unread') params.unreadOnly = true
      const res = await notificationsAPI.getAll(params)
      let list = res.data.notifications || []
      if (filter === 'review') {
        list = list.filter((item: NotificationItem) => item.type === 'review' || item.relatedType === 'Series')
      }
      setItems(list)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications().catch(console.error)
  }, [filter])

  const markAllRead = async () => {
    await notificationsAPI.markAllRead()
    await loadNotifications()
  }

  const markRead = async (id: string) => {
    await notificationsAPI.markRead(id)
    await loadNotifications()
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-lg font-semibold">Notification center</h1>
            <p className="text-sm text-neutral-500">Track review updates, task changes, and system messages.</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px]">{unreadCount} unread</Badge>
            <Button variant="outline" size="sm" className="rounded-lg" onClick={markAllRead}>
              <CheckCheck className="mr-2 size-4" /> Mark all read
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Filter className="size-4 text-neutral-500" /> Filters
            </div>
            <div className="space-y-2">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition ${filter === option.id ? 'border-neutral-900 bg-neutral-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>
        </aside>

        <main className="space-y-4">
          {loading ? (
            <Card className="p-8 text-center text-sm text-neutral-500">Loading notifications...</Card>
          ) : items.length === 0 ? (
            <Card className="p-8 text-center">
              <MailOpen className="mx-auto size-10 text-neutral-300" />
              <p className="mt-3 text-sm font-medium">No notifications yet</p>
              <p className="mt-1 text-sm text-neutral-500">New messages about review, tasks, and publishing will appear here.</p>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item._id} className={`p-4 transition ${item.read ? 'bg-white' : 'border-neutral-900/20 bg-neutral-50'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-semibold">{item.title}</h2>
                      {!item.read && <Badge className="rounded-full bg-blue-600 text-[10px] text-white">New</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-neutral-600">{item.message}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                      <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {new Date(item.createdAt).toLocaleString()}</span>
                      <span>{item.relatedType || item.type}</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg"
                    disabled={item.read}
                    onClick={() => markRead(item._id)}
                  >
                    {item.read ? 'Read' : 'Mark read'}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </main>
      </div>
    </div>
  )
}
