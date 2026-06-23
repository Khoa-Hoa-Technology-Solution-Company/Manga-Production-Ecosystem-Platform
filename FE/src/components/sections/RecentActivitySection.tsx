import { useState, useEffect } from 'react'
import { Bell, CheckSquare, Heart, MessageSquare, Clock, Award, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui'
import { dashboardAPI } from '../../lib/api'

type Activity = {
  _id: string
  userId: string
  type: 'task_assigned' | 'task_submitted' | 'task_declined' | 'task_revision' | 'task_cancelled' | 'chapter_status' | 'vote' | 'comment' | 'deadline' | 'system'
  title: string
  message: string
  createdAt: string
}

export function RecentActivitySection() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardAPI.getActivity()
      .then((res) => {
        setActivities(res.data.activities || [])
      })
      .catch((err) => {
        console.error('Failed to fetch recent activities:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const formatRelativeTime = (dateStr: string) => {
    const now = new Date()
    const past = new Date(dateStr)
    const diffMs = now.getTime() - past.getTime()
    if (isNaN(diffMs) || diffMs < 0) return 'Just now'
    
    const diffSec = Math.floor(diffMs / 1000)
    if (diffSec < 60) return 'Just now'
    
    const diffMin = Math.floor(diffSec / 60)
    if (diffMin < 60) return `${diffMin}m ago`
    
    const diffHour = Math.floor(diffMin / 60)
    if (diffHour < 24) return `${diffHour}h ago`
    
    const diffDay = Math.floor(diffHour / 24)
    return `${diffDay}d ago`
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'task_assigned':
      case 'task_submitted':
      case 'task_revision':
        return { icon: CheckSquare, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' }
      case 'task_declined':
      case 'task_cancelled':
        return { icon: CheckSquare, color: 'text-rose-600 bg-rose-50 border-rose-100' }
      case 'vote':
        return { icon: Heart, color: 'text-rose-500 bg-rose-50 border-rose-100' }
      case 'comment':
        return { icon: MessageSquare, color: 'text-sky-500 bg-sky-50 border-sky-100' }
      case 'deadline':
        return { icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-100' }
      case 'chapter_status':
        return { icon: Award, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' }
      default:
        return { icon: Bell, color: 'text-neutral-500 bg-neutral-50 border-neutral-100' }
    }
  }

  return (
    <Card className="p-6 shadow-sm border border-neutral-200/80 bg-white">
      <CardHeader className="flex-row items-center justify-between p-0 pb-4 border-b border-neutral-100">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold text-neutral-900">Recent Activity</CardTitle>
          <span className="text-xs text-neutral-500 font-medium">Updates and alerts across your projects</span>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="size-5 animate-spin text-neutral-300 mr-2" />
            <span className="text-xs font-semibold">Loading activities...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-10 text-xs text-neutral-400 font-semibold border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
            No recent activity
          </div>
        ) : (
          <div className="flow-root">
            <ul className="-mb-8">
              {activities.map((activity, idx) => {
                const { icon: Icon, color } = getActivityIcon(activity.type)
                const isLast = idx === activities.length - 1

                return (
                  <li key={activity._id}>
                    <div className="relative pb-8">
                      {!isLast && (
                        <span className="absolute left-5 top-5 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`flex size-10 items-center justify-center rounded-xl border ${color}`}>
                            <Icon className="size-4.5" />
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                          <div>
                            <p className="text-xs font-bold text-neutral-800">
                              {activity.title}
                            </p>
                            <p className="text-xs text-neutral-500 font-medium mt-0.5">
                              {activity.message}
                            </p>
                          </div>
                          <div className="whitespace-nowrap text-right text-[10px] font-bold text-neutral-400">
                            {formatRelativeTime(activity.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
