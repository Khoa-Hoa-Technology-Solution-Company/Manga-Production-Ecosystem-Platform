import { useState, useEffect } from 'react'
import { Mail, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, Avatar, AvatarFallback, Badge } from '../ui'
import { dashboardAPI } from '../../lib/api'
import { socketService } from '../../lib/socket'

type TeamMember = {
  _id: string
  displayName: string
  email: string
  role: 'mangaka' | 'assistant' | 'editor' | 'editorial_board' | 'reader'
  avatar?: string
  skills?: string[]
  online: boolean
}

export function TeamOverviewSection() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Fetch initial team list
    dashboardAPI.getTeamOverview()
      .then((res) => {
        setTeam(res.data.team || [])
      })
      .catch((err) => {
        console.error('Failed to fetch team overview:', err)
      })
      .finally(() => {
        setLoading(false)
      })

    // 2. Setup realtime socket status listeners
    const handleStatusChange = (data: unknown) => {
      const { userId, status } = data as { userId: string; status: string }
      setTeam((prev) =>
        prev.map((member) =>
          member._id === userId ? { ...member, online: status === 'online' } : member
        )
      )
    }

    socketService.on('user:status', handleStatusChange)

    return () => {
      socketService.off('user:status', handleStatusChange)
    }
  }, [])

  const getInitials = (name?: string) => {
    if (!name) return '?'
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  const getRoleLabel = (role: TeamMember['role']) => {
    switch (role) {
      case 'mangaka':
        return { text: 'Mangaka', badge: 'bg-[#f54900]/10 text-[#f54900] border-none' }
      case 'assistant':
        return { text: 'Assistant', badge: 'bg-[#009689]/10 text-[#009689] border-none' }
      case 'editor':
        return { text: 'Editor', badge: 'bg-indigo-50 text-indigo-700 border-none' }
      case 'editorial_board':
        return { text: 'Editorial Board', badge: 'bg-amber-50 text-amber-700 border-none' }
      default:
        return { text: 'Reader', badge: 'bg-neutral-100 text-neutral-600 border-none' }
    }
  }

  return (
    <Card className="p-6 shadow-sm border border-neutral-200/80 bg-white">
      <CardHeader className="flex-row items-center justify-between p-0 pb-4 border-b border-neutral-100">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold text-neutral-900">Team Overview</CardTitle>
          <span className="text-xs text-neutral-500 font-medium">Realtime presence and active members</span>
        </div>
      </CardHeader>

      <CardContent className="p-0 pt-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-neutral-400">
            <Loader2 className="size-5 animate-spin text-neutral-300 mr-2" />
            <span className="text-xs font-semibold">Loading team members...</span>
          </div>
        ) : team.length === 0 ? (
          <div className="text-center py-10 text-xs text-neutral-400 font-semibold border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
            No active team members registered
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {team.map((member) => {
              const roleMeta = getRoleLabel(member.role)
              return (
                <div key={member._id} className="flex items-center justify-between py-3 hover:bg-neutral-50/40 px-2 rounded-xl transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="size-9 bg-neutral-100 border border-neutral-200">
                        {member.avatar ? (
                          <img src={member.avatar} alt={member.displayName} className="size-full object-cover rounded-full" />
                        ) : (
                          <AvatarFallback className="text-xs font-bold text-neutral-700">
                            {getInitials(member.displayName)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {/* Realtime status dot badge */}
                      <span className={`absolute bottom-0 right-0 block size-2.5 rounded-full ring-2 ring-white ${
                        member.online ? 'bg-emerald-500' : 'bg-neutral-300'
                      }`} />
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-800">{member.displayName}</span>
                        <Badge variant="default" className={`h-4 px-1.5 text-[9px] font-bold ${roleMeta.badge}`}>
                          {roleMeta.text}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-neutral-400 font-medium inline-flex items-center mt-0.5">
                        <Mail className="size-3 mr-1 text-neutral-300" />
                        {member.email}
                      </span>
                    </div>
                  </div>
                  
                  {member.skills && member.skills.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1">
                      {member.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="default" className="h-4 px-1.5 text-[9px] font-semibold border-neutral-200 text-neutral-500">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
