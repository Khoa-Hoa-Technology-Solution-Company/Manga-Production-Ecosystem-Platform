import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Briefcase, PenTool, BookMarked, X, AlertTriangle, ThumbsUp, MessageSquare, Clock, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui'
import { notificationsAPI, tasksAPI, chaptersAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { socketService } from '../../lib/socket'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  onUnreadCountChange: (count: number) => void
}

interface NotificationData {
  _id: string
  type: string
  read: boolean
  title: string
  message: string
  createdAt: string
  relatedId?: string
  relatedType?: string
  target?: string
}

export function NotificationsModal({ isOpen, onClose, onUnreadCountChange }: NotificationsModalProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'tasks' | 'system' | 'social'>('all')

  const fallbackPath = () => {
    if (user?.role === 'editor') return '/editor'
    if (user?.role === 'editorial_board') return '/editorial-board'
    if (user?.role === 'assistant') return '/tasks'
    if (user?.role === 'mangaka') return '/studio/manage'
    return '/discover'
  }

  const openChapterContext = async (chapterId: string) => {
    if (user?.role === 'editor') {
      navigate(`/editor/review/${chapterId}`)
      return
    }
    if (user?.role === 'editorial_board') {
      navigate(`/editorial-board?tab=votes&chapterId=${chapterId}`)
      return
    }
    if (user?.role === 'reader') {
      navigate(`/read/${chapterId}`)
      return
    }
    if (user?.role === 'assistant') {
      navigate('/tasks')
      return
    }
    const res = await chaptersAPI.getById(chapterId)
    const chapter = res.data.chapter
    navigate(chapter
      ? `/studio?seriesId=${chapter.seriesId}&chapterId=${chapter._id}`
      : '/studio/manage')
  }

  const openPublishedSeries = async (seriesId: string) => {
    const res = await chaptersAPI.getBySeries(seriesId)
    const chapters = (res.data.chapters || []) as Array<{ _id: string; status: string; chapterNumber?: number }>
    const published = chapters
      .filter(chapter => chapter.status === 'Published')
      .sort((a, b) => (a.chapterNumber || 0) - (b.chapterNumber || 0))[0]
    navigate(published ? `/read/${published._id}` : '/discover')
  }

  const navigateToTarget = async (notif: NotificationData) => {
    const id = notif.relatedId
    if (!id) {
      navigate(fallbackPath())
      return
    }

    switch (notif.target) {
      case 'tasks':
      case 'assistant_series':
        navigate('/tasks')
        return
      case 'mangaka_task_review': {
        if (user?.role !== 'mangaka') {
          navigate(fallbackPath())
          return
        }
        const res = await tasksAPI.getById(id)
        const task = res.data.task
        navigate(task
          ? `/studio?seriesId=${task.seriesId}&chapterId=${task.chapterId}&pageId=${task.pageId || ''}`
          : '/studio/manage')
        return
      }
      case 'editor_chapter_review':
        navigate(user?.role === 'editor' ? `/editor/review/${id}` : fallbackPath())
        return
      case 'chapter_context':
        await openChapterContext(id)
        return
      case 'reader_chapter':
        navigate(`/read/${id}`)
        return
      case 'mangaka_series':
        navigate(user?.role === 'mangaka' ? `/studio/manage?seriesId=${id}` : fallbackPath())
        return
      case 'editor_portfolio':
        navigate(user?.role === 'editor' ? `/editor?tab=portfolio&seriesId=${id}` : fallbackPath())
        return
      case 'editor_approvals':
        navigate(user?.role === 'editor' ? `/editor?tab=approvals&seriesId=${id}` : fallbackPath())
        return
      case 'eb_assign_editor':
        navigate(user?.role === 'editorial_board' ? `/editorial-board?tab=assign-editor&seriesId=${id}` : fallbackPath())
        return
      case 'eb_votes':
        navigate(user?.role === 'editorial_board' ? `/editorial-board?tab=votes&seriesId=${id}` : fallbackPath())
        return
      case 'eb_meetings':
        navigate(user?.role === 'editorial_board'
          ? '/editorial-board?tab=meetings'
          : user?.role === 'editor' ? '/editor?tab=meetings' : fallbackPath())
        return
      case 'reader_series':
        await openPublishedSeries(id)
        return
    }

    // Compatibility for notifications created before explicit targets existed.
    if (notif.type === 'task_assigned' || notif.type === 'task_revision' || notif.type === 'task_cancelled') {
      navigate('/tasks')
    } else if (notif.type === 'task_submitted' || notif.type === 'task_declined') {
      if (user?.role !== 'mangaka') navigate(fallbackPath())
      else {
        const res = await tasksAPI.getById(id)
        const task = res.data.task
        navigate(task ? `/studio?seriesId=${task.seriesId}&chapterId=${task.chapterId}&pageId=${task.pageId || ''}` : '/studio/manage')
      }
    } else if (notif.relatedType === 'Chapter' || notif.type === 'chapter_status') {
      await openChapterContext(id)
    } else if (notif.relatedType === 'Meeting') {
      navigate(user?.role === 'editorial_board'
        ? '/editorial-board?tab=meetings'
        : user?.role === 'editor' ? '/editor?tab=meetings' : fallbackPath())
    } else if (notif.relatedType === 'Series') {
      if (user?.role === 'editor') {
        const tab = notif.title.toLowerCase().includes('submitted') ? 'approvals' : 'portfolio'
        navigate(`/editor?tab=${tab}&seriesId=${id}`)
      } else if (user?.role === 'editorial_board') {
        const tab = notif.title.toLowerCase().includes('assignment') ? 'assign-editor' : 'votes'
        navigate(`/editorial-board?tab=${tab}&seriesId=${id}`)
      } else if (user?.role === 'mangaka') navigate(`/studio/manage?seriesId=${id}`)
      else if (user?.role === 'reader') await openPublishedSeries(id)
      else navigate('/tasks')
    } else navigate(fallbackPath())
  }

  const handleNotificationClick = async (notif: NotificationData) => {
    if (!notif.read) {
      setNotifications(prev => prev.map(item => item._id === notif._id ? { ...item, read: true } : item))
      onUnreadCountChange(Math.max(0, notifications.filter(item => !item.read).length - 1))
      notificationsAPI.markRead(notif._id).catch(console.error)
    }
    onClose()
    try {
      await navigateToTarget(notif)
    } catch (err) {
      console.error('Notification navigation failed', err)
      navigate(fallbackPath())
    }
  }

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationsAPI.getAll()
      setNotifications(res.data.notifications || [])
      onUnreadCountChange(res.data.unread || 0)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => fetchNotifications().catch(console.error))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    const handleNew = (data: unknown) => {
      const incoming = data as NotificationData
      setNotifications(prev => prev.some(item => item._id === incoming._id) ? prev : [incoming, ...prev])
    }
    const handleRead = (data: unknown) => {
      const { notificationId } = data as { notificationId: string }
      setNotifications(prev => prev.map(item => item._id === notificationId ? { ...item, read: true } : item))
    }
    const handleReadAll = () => setNotifications(prev => prev.map(item => ({ ...item, read: true })))
    socketService.on('notification:new', handleNew)
    socketService.on('notification:read', handleRead)
    socketService.on('notification:read-all', handleReadAll)
    return () => {
      socketService.off('notification:new', handleNew)
      socketService.off('notification:read', handleRead)
      socketService.off('notification:read-all', handleReadAll)
    }
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead()
      setNotifications(prev => prev.map(item => ({ ...item, read: true })))
      onUnreadCountChange(0)
    } catch (err) {
      console.error('Failed to mark all notifications read', err)
    }
  }

  const typeStyles: Record<string, { bg: string, border: string, iconColor: string, iconBg: string, icon: React.ComponentType<{ className?: string }> }> = {
    task_assigned: { bg: 'hover:bg-blue-50/25 bg-blue-50/5', border: 'border-l-blue-500 border-l-4', iconColor: 'text-blue-600', iconBg: 'bg-blue-50', icon: Briefcase },
    task_submitted: { bg: 'hover:bg-emerald-50/25 bg-emerald-50/5', border: 'border-l-emerald-500 border-l-4', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', icon: PenTool },
    task_declined: { bg: 'hover:bg-rose-50/25 bg-rose-50/5', border: 'border-l-rose-500 border-l-4', iconColor: 'text-rose-600', iconBg: 'bg-rose-50', icon: X },
    task_cancelled: { bg: 'hover:bg-rose-50/25 bg-rose-50/5', border: 'border-l-rose-500 border-l-4', iconColor: 'text-rose-600', iconBg: 'bg-rose-50', icon: X },
    task_revision: { bg: 'hover:bg-amber-50/25 bg-amber-50/5', border: 'border-l-amber-500 border-l-4', iconColor: 'text-amber-600', iconBg: 'bg-amber-50', icon: AlertTriangle },
    chapter_status: { bg: 'hover:bg-purple-50/25 bg-purple-50/5', border: 'border-l-purple-500 border-l-4', iconColor: 'text-purple-600', iconBg: 'bg-purple-50', icon: BookMarked },
    vote: { bg: 'hover:bg-indigo-50/25 bg-indigo-50/5', border: 'border-l-indigo-500 border-l-4', iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', icon: ThumbsUp },
    comment: { bg: 'hover:bg-teal-50/25 bg-teal-50/5', border: 'border-l-teal-500 border-l-4', iconColor: 'text-teal-600', iconBg: 'bg-teal-50', icon: MessageSquare },
    deadline: { bg: 'hover:bg-red-50/25 bg-red-50/5', border: 'border-l-red-500 border-l-4', iconColor: 'text-red-600', iconBg: 'bg-red-50', icon: Clock },
    system: { bg: 'hover:bg-sky-50/25 bg-sky-50/5', border: 'border-l-sky-500 border-l-4', iconColor: 'text-sky-600', iconBg: 'bg-sky-50', icon: Settings },
  }

  const getStyle = (type: string) => {
    return typeStyles[type] || { bg: 'hover:bg-neutral-50/20 bg-white', border: 'border-l-neutral-400 border-l-4', iconColor: 'text-neutral-600', iconBg: 'bg-neutral-100', icon: Bell }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'tasks') {
      return ['task_assigned', 'task_submitted', 'task_declined', 'task_revision', 'task_cancelled'].includes(notif.type)
    }
    if (filter === 'system') {
      return ['system', 'deadline', 'chapter_status'].includes(notif.type)
    }
    if (filter === 'social') {
      return ['vote', 'comment'].includes(notif.type)
    }
    return true
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-800 flex items-center gap-1.5">
            <Bell className="size-4 text-neutral-800" />
            {t('notifications.title', 'Notifications')}
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* ── Category Classification Tabs ── */}
        <div className="flex gap-1.5 border-b border-neutral-100 pb-2 overflow-x-auto">
          {(['all', 'tasks', 'system', 'social'] as const).map(tab => {
            const count = tab === 'all' 
              ? notifications.length 
              : tab === 'tasks'
                ? notifications.filter(n => ['task_assigned', 'task_submitted', 'task_declined', 'task_revision', 'task_cancelled'].includes(n.type)).length
                : tab === 'system'
                  ? notifications.filter(n => ['system', 'deadline', 'chapter_status'].includes(n.type)).length
                  : notifications.filter(n => ['vote', 'comment'].includes(n.type)).length

            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`rounded-lg px-2.5 py-1 text-[10px] font-semibold transition-all capitalize border flex items-center gap-1 shrink-0 ${
                  filter === tab
                    ? 'bg-neutral-900 text-white border-neutral-900'
                    : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                }`}
              >
                {tab === 'all' ? t('common.all', 'All') : t(`notifications.tab_${tab}`, tab)}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[8px] leading-none ${
                    filter === tab ? 'bg-white text-neutral-900 font-bold' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-6 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="grid size-12 place-items-center rounded-2xl bg-neutral-100 mx-auto">
              <Bell className="size-5 text-neutral-400" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-700">{t('notifications.noNotifications', 'No new notifications')}</h4>
            <p className="text-[10px] text-neutral-500">{t('notifications.subtitle', 'Job updates and new chapter alerts will appear here.')}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <div className="grid size-12 place-items-center rounded-2xl bg-neutral-100 mx-auto">
              <Bell className="size-5 text-neutral-400" />
            </div>
            <h4 className="text-xs font-semibold text-neutral-700">{t('notifications.noCategoryNotifications', 'No notifications here')}</h4>
            <p className="text-[10px] text-neutral-500">{t('notifications.categorySubtitle', 'No messages found under this category filter.')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {filteredNotifications.map((notif) => {
              const style = getStyle(notif.type)
              const NotifIcon = style.icon

              return (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  role="button"
                  tabIndex={0}
                  className={`flex gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:border-neutral-300 focus:outline-none focus:ring-2 focus:ring-neutral-200 ${style.border} ${style.bg} ${
                    notif.read ? 'opacity-85 border-neutral-100' : 'shadow-xs border-neutral-200'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleNotificationClick(notif)
                    }
                  }}
                >
                  <div className={`grid size-8 shrink-0 place-items-center rounded-xl ${style.iconBg} ${style.iconColor}`}>
                    <NotifIcon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-neutral-800 leading-tight">{notif.title}</p>
                      {!notif.read && (
                        <span className="size-2 bg-blue-500 rounded-full shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-600 mt-1 leading-normal">{notif.message}</p>
                    <span className="text-[9px] text-neutral-400 mt-1.5 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="flex justify-between gap-2 pt-2 border-t border-neutral-100">
          <Button
            size="sm"
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={!notifications.some(item => !item.read)}
          >
            {t('notifications.markAllRead', 'Mark all read')}
          </Button>
          <Button size="sm" onClick={onClose} className="bg-neutral-900 text-white hover:bg-neutral-800">
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  )
}
