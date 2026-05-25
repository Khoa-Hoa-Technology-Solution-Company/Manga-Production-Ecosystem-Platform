import { useEffect, useState } from 'react'
import { Bell, Briefcase, PenTool, BookMarked, X, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../ui'
import { notificationsAPI } from '../../lib/api'

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  onMarkReadComplete: () => void
}

interface NotificationData {
  _id: string
  type: string
  read: boolean
  title: string
  message: string
  createdAt: string
}

export function NotificationsModal({ isOpen, onClose, onMarkReadComplete }: NotificationsModalProps) {
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationsAPI.getAll()
      setNotifications(res.data.notifications || [])
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      Promise.resolve().then(() => {
        fetchNotifications().catch(console.error)
      })
      // Mark all read automatically on open
      notificationsAPI.markAllRead()
        .then(() => onMarkReadComplete())
        .catch(console.error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

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
            ✕
          </button>
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
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {notifications.map((notif) => {
              let NotifIcon = Bell
              let iconBg = 'bg-neutral-100 text-neutral-600'

              if (notif.type === 'task_assigned') {
                NotifIcon = Briefcase
                iconBg = 'bg-blue-50 text-blue-600'
              } else if (notif.type === 'task_submitted') {
                NotifIcon = PenTool
                iconBg = 'bg-emerald-50 text-emerald-600'
              } else if (notif.type === 'task_declined') {
                NotifIcon = X
                iconBg = 'bg-rose-50 text-rose-600'
              } else if (notif.type === 'task_revision') {
                NotifIcon = AlertTriangle
                iconBg = 'bg-rose-50 text-rose-600'
              } else if (notif.type === 'chapter_status') {
                NotifIcon = BookMarked
                iconBg = 'bg-purple-50 text-purple-600'
              }

              return (
                <div
                  key={notif._id}
                  className={`flex gap-3 p-3 rounded-xl border transition-all ${
                    notif.read ? 'border-neutral-100 bg-white opacity-80' : 'border-neutral-200 bg-neutral-50/50 shadow-xs'
                  }`}
                >
                  <div className={`grid size-8 shrink-0 place-items-center rounded-xl ${iconBg}`}>
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

        <div className="flex justify-end pt-2 border-t border-neutral-100">
          <Button size="sm" onClick={onClose} className="bg-neutral-900 text-white hover:bg-neutral-800">
            {t('common.close', 'Close')}
          </Button>
        </div>
      </div>
    </div>
  )
}
