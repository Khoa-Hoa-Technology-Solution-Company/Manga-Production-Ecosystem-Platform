import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  Eraser,
  Eye,
  EyeOff,
  Layers,
  Lock,
  MessageSquare,
  Minus,
  MousePointer2,
  Move,
  PenTool,
  Plus,
  Redo2,
  Square,
  Type,
  Undo2,
  Unlock,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, Progress, Tabs } from '../ui'

/* ── Zone / Layer data ───────────────────────────────── */
const zones = [
  { name: 'Background', color: '#3b82f6', visible: true, locked: false, progress: 100 },
  { name: 'Characters', color: '#f54900', visible: true, locked: false, progress: 72 },
  { name: 'Effects', color: '#a855f7', visible: true, locked: true, progress: 45 },
  { name: 'Dialog', color: '#22c55e', visible: false, locked: false, progress: 88 },
  { name: 'SFX', color: '#eab308', visible: true, locked: false, progress: 30 },
]

/* ── Active tasks for this page ───────────────────────── */
const pageTasks = [
  { id: 1, name: 'Ink character outlines', zone: 'Characters', assignee: 'YM', status: 'In Progress', deadline: 'Today' },
  { id: 2, name: 'Add speed lines panel 3', zone: 'Effects', assignee: 'RT', status: 'Pending', deadline: 'Mar 23' },
  { id: 3, name: 'Tone background fill', zone: 'Background', assignee: 'KS', status: 'Done', deadline: 'Mar 20' },
  { id: 4, name: 'Place SFX text', zone: 'SFX', assignee: 'AN', status: 'Pending', deadline: 'Mar 24' },
]

/* ── Collaborators ───────────────────────────────────── */
const collaborators = [
  { name: 'Yuki M.', initials: 'YM', color: 'bg-[#f54900]', role: 'Mangaka', online: true },
  { name: 'Ren T.', initials: 'RT', color: 'bg-[#009689]', role: 'Assistant', online: true },
  { name: 'Kenji S.', initials: 'KS', color: 'bg-[#ffb900]', role: 'Editor', online: true },
  { name: 'Aiko N.', initials: 'AN', color: 'bg-[#a855f7]', role: 'Assistant', online: false },
]

/* ── Drawing tools ───────────────────────────────────── */
const tools = [
  { icon: MousePointer2, label: 'Select', key: 'select' },
  { icon: Move, label: 'Move', key: 'move' },
  { icon: PenTool, label: 'Pen', key: 'pen' },
  { icon: Square, label: 'Shape', key: 'shape' },
  { icon: Circle, label: 'Circle', key: 'circle' },
  { icon: Type, label: 'Text', key: 'text' },
  { icon: Eraser, label: 'Eraser', key: 'eraser' },
]

export function StudioWorkspacePage() {
  const [activeTool, setActiveTool] = useState('pen')
  const [currentPage, setCurrentPage] = useState(24)
  const [rightTab, setRightTab] = useState('zones')
  const [zoneVisibility, setZoneVisibility] = useState<Record<string, boolean>>(
    Object.fromEntries(zones.map((z) => [z.name, z.visible]))
  )

  const totalPages = 32

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col">
      {/* ── Top toolbar ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
        <div className="flex items-center gap-1">
          {tools.map(({ icon: Icon, label, key }) => (
            <button
              key={key}
              type="button"
              title={label}
              className={`grid size-8 place-items-center rounded-lg transition-colors ${
                activeTool === key
                  ? 'bg-neutral-900 text-white'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
              }`}
              onClick={() => setActiveTool(key)}
            >
              <Icon className="size-4" />
            </button>
          ))}

          <div className="mx-2 h-5 w-px bg-neutral-200" />

          <button type="button" title="Undo" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100">
            <Undo2 className="size-4" />
          </button>
          <button type="button" title="Redo" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100">
            <Redo2 className="size-4" />
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-medium text-neutral-700">
            Page {currentPage} / {totalPages}
          </span>
          <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button type="button" title="Zoom out" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100">
            <ZoomOut className="size-4" />
          </button>
          <span className="text-xs text-neutral-500 w-10 text-center">100%</span>
          <button type="button" title="Zoom in" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100">
            <ZoomIn className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Main area: Canvas + Right Panel ──────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Canvas ─────────────────────────────────── */}
        <div className="flex-1 relative bg-neutral-100 overflow-auto">
          {/* Grid pattern background */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }} />

          {/* Canvas content */}
          <div className="relative flex items-center justify-center p-8 min-h-full">
            <div className="relative rounded-lg bg-white shadow-2xl overflow-hidden" style={{ width: '500px' }}>
              <img
                src="/manga/page-panels.png"
                alt="Manga page canvas"
                className="w-full h-auto"
              />

              {/* Live editing indicator */}
              <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium shadow-lg backdrop-blur">
                <span className="size-1.5 animate-pulse rounded-full bg-[#e7000b]" />
                Live editing · Page {currentPage}
              </div>

              {/* Zone overlay indicators */}
              <div className="absolute right-3 top-3 flex flex-col gap-1">
                {zones.filter(z => zoneVisibility[z.name]).map((zone) => (
                  <div
                    key={zone.name}
                    className="flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[9px] font-medium shadow-sm backdrop-blur"
                  >
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: zone.color }} />
                    {zone.name}
                  </div>
                ))}
              </div>

              {/* Active collaborator cursors */}
              <div className="absolute bottom-3 left-3 flex items-center -space-x-1.5">
                {collaborators.filter(c => c.online).map((c) => (
                  <Avatar key={c.initials} className={`size-6 border-2 border-white text-white ${c.color}`}>
                    <AvatarFallback className="text-[7px] text-white">{c.initials}</AvatarFallback>
                  </Avatar>
                ))}
                <div className="ml-1.5 text-[10px] font-medium text-neutral-500">
                  {collaborators.filter(c => c.online).length} online
                </div>
              </div>

              {/* Annotation overlay example */}
              <div className="absolute right-3 bottom-16 max-w-36 rounded-lg bg-[#f54900] p-2 text-[9px] text-white shadow-lg">
                <div className="flex items-center gap-1 mb-0.5">
                  <MessageSquare className="size-2.5" />
                  <span className="font-semibold">Kenji S.</span>
                </div>
                <p className="leading-3">Add more motion lines in this panel →</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right Panel ────────────────────────────── */}
        <div className="hidden w-72 flex-col border-l border-neutral-200 bg-white lg:flex">
          <div className="border-b border-neutral-200 px-4 pt-3 pb-0">
            <Tabs
              tabs={[
                { key: 'zones', label: 'Zones' },
                { key: 'tasks', label: 'Tasks', count: pageTasks.filter(t => t.status !== 'Done').length },
                { key: 'collab', label: 'Team' },
              ]}
              active={rightTab}
              onChange={setRightTab}
              className="bg-transparent p-0 gap-0"
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* ── Zones tab ───────────────────────────── */}
            {rightTab === 'zones' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-neutral-500" />
                    <span className="text-xs font-semibold text-neutral-700">Page Zones</span>
                  </div>
                  <Button variant="ghost" size="sm" className="size-6 p-0 rounded-md">
                    <Plus className="size-3" />
                  </Button>
                </div>

                {zones.map((zone) => (
                  <div key={zone.name} className="rounded-xl border border-neutral-200 p-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: zone.color }} />
                        <span className="text-xs font-medium">{zone.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="grid size-5 place-items-center rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                          onClick={() => setZoneVisibility(prev => ({ ...prev, [zone.name]: !prev[zone.name] }))}
                        >
                          {zoneVisibility[zone.name] ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                        </button>
                        <button type="button" className="grid size-5 place-items-center rounded text-neutral-400 hover:text-neutral-700 transition-colors">
                          {zone.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={zone.progress} className="h-1 flex-1" />
                      <span className="text-[10px] text-neutral-500">{zone.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Tasks tab ───────────────────────────── */}
            {rightTab === 'tasks' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-700">Active Tasks</span>
                  <Button variant="outline" size="sm" className="h-6 gap-1 text-[10px] rounded-lg px-2">
                    <Plus className="size-2.5" /> Add
                  </Button>
                </div>

                {pageTasks.map((task) => (
                  <Card key={task.id} className="rounded-xl p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{task.name}</p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{task.zone} zone</p>
                      </div>
                      <Avatar className="size-5 bg-neutral-200 shrink-0">
                        <AvatarFallback className="text-[7px]">{task.assignee}</AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge
                        variant={task.status === 'Done' ? 'secondary' : task.status === 'In Progress' ? 'default' : 'default'}
                        className={`text-[9px] px-1.5 py-0 h-4 ${
                          task.status === 'Done' ? 'text-emerald-600' : task.status === 'In Progress' ? 'text-blue-600' : 'text-neutral-500'
                        }`}
                      >
                        {task.status}
                      </Badge>
                      <span className="text-[10px] text-neutral-400">{task.deadline}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ── Team tab ────────────────────────────── */}
            {rightTab === 'collab' && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-neutral-700">Collaborators</span>
                <div className="mt-3 space-y-2">
                  {collaborators.map((person) => (
                    <div key={person.initials} className="flex items-center gap-2.5 rounded-xl border border-neutral-200 p-2.5">
                      <div className="relative">
                        <Avatar className={`size-8 text-white ${person.color}`}>
                          <AvatarFallback className="text-[9px] text-white">{person.initials}</AvatarFallback>
                        </Avatar>
                        {person.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-white bg-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{person.name}</p>
                        <p className="text-[10px] text-neutral-500">{person.role}</p>
                      </div>
                      {person.online && (
                        <Badge variant="secondary" className="ml-auto text-[9px] px-1.5 py-0 h-4 text-emerald-600 shrink-0">
                          Online
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom info bar ─────────────────────── */}
          <div className="border-t border-neutral-200 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">Chapter 42 · Shadow Blade Saga</span>
            <div className="flex items-center gap-1">
              <Minus className="size-3 text-neutral-400" />
              <span className="text-[10px] text-neutral-500">100%</span>
              <Plus className="size-3 text-neutral-400" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
