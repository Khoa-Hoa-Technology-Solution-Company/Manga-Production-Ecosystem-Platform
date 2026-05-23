/* eslint-disable */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Canvas as FabricCanvas, Rect, FabricImage, IText, PencilBrush, Point, util } from 'fabric'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Hand,
  Layers,
  Minus,
  MousePointer2,
  Pen,
  Plus,
  Redo2,
  RotateCcw,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { Avatar, AvatarFallback, Badge, Button, Card, Input, Progress, Tabs } from '../ui'
import { useAuth } from '../../lib/auth'
import { pagesAPI, zonesAPI, tasksAPI, seriesAPI, chaptersAPI } from '../../lib/api'
import { socketService } from '../../lib/socket'

/* ── Types ────────────────────────────────────────────── */
type ZoneData = {
  _id: string
  name: string
  type: string
  color: string
  boundingBox: { x: number; y: number; width: number; height: number }
  assignedTo?: { _id: string; displayName: string; avatar?: string } | null
  status: string
  progress: number
}

type PageData = {
  _id: string
  pageNumber: number
  originalImage: string
  width: number
  height: number
}

type TaskData = {
  _id: string
  title: string
  type: string
  status: string
  assignedTo?: { _id: string; displayName: string } | null
  deadline: string
}

/* ── Zone colors by type ──────────────────────────────── */
const zoneTypeColors: Record<string, string> = {
  background: '#3b82f6',
  characters: '#f54900',
  effects: '#a855f7',
  dialog: '#22c55e',
  sfx: '#eab308',
}

/* ── Tool definitions ─────────────────────────────────── */
const tools = [
  { icon: MousePointer2, label: 'Select', key: 'select' },
  { icon: Hand, label: 'Pan', key: 'pan' },
  { icon: Square, label: 'Zone', key: 'zone' },
  { icon: Pen, label: 'Draw', key: 'draw' },
  { icon: Type, label: 'Text', key: 'text' },
]

export function StudioWorkspacePage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  const [activeTool, setActiveTool] = useState('select')
  const [rightTab, setRightTab] = useState('zones')
  const [zoom, setZoom] = useState(100)

  // ── Data state ────────────────────────────────────
  const [seriesList, setSeriesList] = useState<any[]>([])
  const [selectedSeriesId, setSelectedSeriesId] = useState('')
  const [chapters, setChapters] = useState<any[]>([])
  const [selectedChapterId, setSelectedChapterId] = useState('')
  const [pages, setPages] = useState<PageData[]>([])
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [zones, setZones] = useState<ZoneData[]>([])
  const [pageTasks, setPageTasks] = useState<TaskData[]>([])
  const [zoneVisibility, setZoneVisibility] = useState<Record<string, boolean>>({})
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; color: string; name: string }>>({})
  const [roomMembers, setRoomMembers] = useState<Array<{ userId: string; role: string }>>([])
  const [focusedObjects, setFocusedObjects] = useState<Record<string, { userId: string; role: string }>>({})
  const [lockedObjects, setLockedObjects] = useState<Record<string, { userId: string; role: string }>>({})
  const [shareUserId, setShareUserId] = useState('')
  const [shareUserQuery, setShareUserQuery] = useState('')
  const [shareUserResults, setShareUserResults] = useState<any[]>([])
  const [shareRole, setShareRole] = useState<'assistant' | 'editor'>('assistant')
  const [shareCanEdit, setShareCanEdit] = useState(true)
  const [shareCanComment, setShareCanComment] = useState(true)
  const [shareCanInvite, setShareCanInvite] = useState(false)

  // ── Zone creation dialog ──────────────────────────
  const [showNewZoneDialog, setShowNewZoneDialog] = useState(false)
  const [newZoneName, setNewZoneName] = useState('Background')
  const [newZoneType, setNewZoneType] = useState('background')
  const [pendingZoneRect, setPendingZoneRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // ── Fabric.js refs ────────────────────────────────
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const bgImageRef = useRef<FabricImage | null>(null)
  const isPanning = useRef(false)
  const lastPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const isApplyingRemoteChange = useRef(false)
  const objectSyncCounter = useRef(0)
  const syncIdRegistry = useRef(new Set<string>())
  
  // History for manual tools (draw, text)
  type HistoryRecord = { type: 'manual_change', prevState: string, nextState: string }
  type SyncableObject = any & { _syncId?: string }
  const historyStack = useRef<HistoryRecord[]>([])
  const redoStack = useRef<HistoryRecord[]>([])
  const currentManualState = useRef<string>('[]')
  const isRestoring = useRef(false)
  
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawSize, setDrawSize] = useState(2)
  const [brushMode, setBrushMode] = useState<'ink' | 'marker' | 'pencil' | 'eraser'>('ink')
  const drawColorRef = useRef(drawColor)
  const drawSizeRef = useRef(drawSize)
  const brushModeRef = useRef(brushMode)
  useEffect(() => {
    drawColorRef.current = drawColor
    drawSizeRef.current = drawSize
    brushModeRef.current = brushMode
  }, [drawColor, drawSize, brushMode])

  // Sync color/size changes to active objects immediately
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return
    if (fc.isDrawingMode && fc.freeDrawingBrush) {
      fc.freeDrawingBrush.color = drawColor
      fc.freeDrawingBrush.width = drawSize
    }
    const activeObjs = fc.getActiveObjects()
    if (activeObjs.length) {
      let changed = false
      activeObjs.forEach((obj: any) => {
        if (!obj._zoneId && obj !== bgImageRef.current) {
          if (obj.type === 'path') {
            obj.set({ stroke: drawColor, strokeWidth: drawSize })
            changed = true
          } else if (obj.type === 'i-text') {
            obj.set({ fill: drawColor, fontSize: Math.max(12, drawSize * 10) })
            changed = true
          }
        }
      })
      if (changed) fc.requestRenderAll()
    }
  }, [drawColor, drawSize])
  
  const currentPage = pages[currentPageIdx]
  const isMangaka = user?.role === 'mangaka'
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  const chapterRoom = selectedChapterId ? `chapter:${selectedChapterId}` : ''

  useEffect(() => {
    socketService.connect()
    return () => socketService.disconnect()
  }, [])

  useEffect(() => {
    if (!chapterRoom) return
    socketService.joinRoom(chapterRoom)
    const onCursorMove = (payload: any) => {
      if (!payload?.userId || payload.userId === user?._id) return
      setRemoteCursors(prev => ({
        ...prev,
        [payload.userId]: {
          x: payload.x ?? 0,
          y: payload.y ?? 0,
          color: payload.color || '#ef4444',
          name: payload.name || payload.userId,
        },
      }))
    }
    const onPresenceJoined = (payload: any) => {
      if (!payload?.userId || payload.userId === user?._id) return
      setRemoteCursors(prev => ({
        ...prev,
        [payload.userId]: prev[payload.userId] || {
          x: 0,
          y: 0,
          color: '#22c55e',
          name: payload.userId,
        },
      }))
    }
    const onPresenceLeft = (payload: any) => {
      if (!payload?.userId) return
      setRemoteCursors(prev => {
        const next = { ...prev }
        delete next[payload.userId]
        return next
      })
    }

    const onPresenceList = (payload: any) => {
      if (payload?.room !== chapterRoom) return
      setRoomMembers(payload.members || [])
    }
    const onObjectFocus = (payload: any) => {
      if (!payload?.objectId || payload.userId === user?._id) return
      setFocusedObjects(prev => {
        const next = { ...prev }
        if (payload.action === 'blur') delete next[payload.objectId]
        else next[payload.objectId] = { userId: payload.userId, role: payload.role }
        return next
      })
    }
    const onObjectLock = (payload: any) => {
      if (!payload?.objectId || payload.userId === user?._id) return
      setLockedObjects(prev => {
        const next = { ...prev }
        if (payload.action === 'unlock') delete next[payload.objectId]
        else next[payload.objectId] = { userId: payload.userId, role: payload.role }
        return next
      })
    }

    socketService.on('cursor:move', onCursorMove)
    socketService.on('presence:joined', onPresenceJoined)
    socketService.on('presence:left', onPresenceLeft)
    socketService.on('presence:list', onPresenceList)
    socketService.on('object:focus', onObjectFocus)
    socketService.on('object:lock', onObjectLock)
    return () => {
      socketService.off('cursor:move', onCursorMove)
      socketService.off('presence:joined', onPresenceJoined)
      socketService.off('presence:left', onPresenceLeft)
      socketService.off('presence:list', onPresenceList)
      socketService.off('object:focus', onObjectFocus)
      socketService.off('object:lock', onObjectLock)
      socketService.leaveRoom(chapterRoom)
    }
  }, [chapterRoom, user?._id])

  const connectedCollaborators = roomMembers.filter(m => m.userId !== user?._id)
  const collaboratorCount = connectedCollaborators.length

  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !chapterRoom) return
    const sendCursor = (opt: any) => {
      const p = fc.getScenePoint(opt.e)
      socketService.emit('cursor:move', {
        room: chapterRoom,
        payload: {
          x: p.x,
          y: p.y,
          color: user?.avatarColor || '#ef4444',
          name: user?.displayName || user?.email || 'User',
        },
      })
    }
    const onObjectSync = async (message: any) => {
      if (!message || message.pageId !== currentPage?._id) return
      const data = message.payload?.object || message.payload?.payload || message.payload
      if (!data) return
      isApplyingRemoteChange.current = true
      try {
        if (message.kind === 'object:removed') {
          const syncId = data._syncId || message.id
          const target = fc.getObjects().find((o: any) => (o as SyncableObject)._syncId === syncId)
          if (target) fc.remove(target)
        } else if (message.kind === 'object:added') {
          const syncId = data._syncId || message.id
          const existing = fc.getObjects().find((o: any) => (o as SyncableObject)._syncId === syncId)
          if (!existing) {
            const [obj] = await util.enlivenObjects([data])
            if (obj) {
              ;(obj as SyncableObject)._syncId = syncId
              obj.selectable = activeTool === 'select'
              fc.add(obj)
            }
          }
        } else if (message.kind === 'object:modified') {
          const syncId = data._syncId || message.id
          const target = fc.getObjects().find((o: any) => (o as SyncableObject)._syncId === syncId)
          if (target) {
            target.set(data)
          }
        }
        fc.requestRenderAll()
      } finally {
        isApplyingRemoteChange.current = false
      }
    }
    fc.on('mouse:move', sendCursor)
    socketService.on('object:sync', onObjectSync)
    return () => {
      fc.off('mouse:move', sendCursor)
      socketService.off('object:sync', onObjectSync)
    }
  }, [chapterRoom, currentPage?._id, activeTool, user?.avatarColor, user?.displayName, user?.email])

  // ═══════════════════════════════════════════════════
  // DATA LOADING
  // ═══════════════════════════════════════════════════

  useEffect(() => {
    seriesAPI.getAll().then(res => {
      setSeriesList(res.data.series || [])
      if (res.data.series?.length > 0) setSelectedSeriesId(res.data.series[0]._id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedSeriesId) return
    chaptersAPI.getBySeries(selectedSeriesId).then(res => {
      setChapters(res.data.chapters || [])
      if (res.data.chapters?.length > 0) setSelectedChapterId(res.data.chapters[0]._id)
    }).catch(() => {})
  }, [selectedSeriesId])

  useEffect(() => {
    if (!selectedChapterId) return
    pagesAPI.getByChapter(selectedChapterId).then(res => {
      setPages(res.data.pages || [])
      setCurrentPageIdx(0)
    }).catch(() => {})
  }, [selectedChapterId])

  const emitCanvasSync = useCallback((kind: 'object:added' | 'object:removed' | 'object:modified' | 'canvas:snapshot', payload: any) => {
    if (!chapterRoom) return
    socketService.emit('object:sync', {
      room: chapterRoom,
      payload: {
        id: `${user?._id || 'u'}-${Date.now()}-${objectSyncCounter.current += 1}`,
        kind,
        pageId: currentPage?._id,
        payload,
      },
    })
  }, [chapterRoom, currentPage?._id, user?._id])

  const loadZones = useCallback(() => {
    if (!currentPage?._id) { setZones([]); return }
    zonesAPI.getByPage(currentPage._id).then(res => {
      const z = res.data.zones || []
      setZones(z)
      // Keep existing visibility state if it exists, otherwise set to true
      setZoneVisibility(prev => {
        const next = { ...prev }
        z.forEach((zone: ZoneData) => { if (next[zone._id] === undefined) next[zone._id] = true })
        return next
      })
    }).catch(() => {})
  }, [currentPage?._id])

  useEffect(() => { loadZones() }, [loadZones])

  useEffect(() => {
    if (!currentPage?._id) { setPageTasks([]); return }
    tasksAPI.getAll({ pageId: currentPage._id }).then(res => {
      setPageTasks(res.data.tasks || [])
    }).catch(() => {})
  }, [currentPage?._id])

  // ═══════════════════════════════════════════════════
  // FABRIC.JS CANVAS
  // ═══════════════════════════════════════════════════

  // Resize canvas to fill container
  const resizeCanvas = useCallback(() => {
    const fc = fabricRef.current
    const container = canvasContainerRef.current
    if (!fc || !container) return
    const { width, height } = container.getBoundingClientRect()
    fc.setDimensions({ width, height })
  }, [])

  // Save manual history
  const saveManualHistory = useCallback(() => {
    const fc = fabricRef.current
    if (!fc || isRestoring.current) return
    const manuals = fc.getObjects().filter((o: any) => !o._zoneId && o !== bgImageRef.current)
    const nextState = JSON.stringify(manuals.map(o => o.toObject()))
    
    if (nextState !== currentManualState.current) {
      historyStack.current.push({
        type: 'manual_change',
        prevState: currentManualState.current,
        nextState: nextState
      })
      currentManualState.current = nextState
      redoStack.current = []
    }
  }, [])

  // Restore manual state
  const restoreManualState = async (stateJson: string) => {
    const fc = fabricRef.current
    if (!fc) return
    
    const objects = JSON.parse(stateJson)
    const currentManuals = fc.getObjects().filter((o: any) => !o._zoneId && o !== bgImageRef.current)
    currentManuals.forEach(o => fc.remove(o))
    
    if (objects.length > 0) {
      try {
        const enlivened = await util.enlivenObjects(objects)
        enlivened.forEach((obj: any) => {
          obj.selectable = activeTool === 'select'
          obj.hasControls = true
          obj.lockMovementX = false
          obj.lockMovementY = false
          fc.add(obj)
        })
      } catch (err) { console.error('Enliven error:', err) }
    }
    fc.requestRenderAll()
  }

  // Initialize Fabric canvas
  useEffect(() => {
    if (!currentPage || !canvasElRef.current || fabricRef.current) return
    const fc = new FabricCanvas(canvasElRef.current, {
      selection: true,
      preserveObjectStacking: true,
      backgroundColor: '#e5e5e5',
    })
    fabricRef.current = fc
    resizeCanvas()

    return () => {
      fc.dispose()
      fabricRef.current = null
    }
  }, [currentPage, resizeCanvas])

  useEffect(() => {
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  // Load background image when page changes
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !currentPage) return

    const imgUrl = currentPage.originalImage.startsWith('http')
      ? currentPage.originalImage
      : `${apiBase}${currentPage.originalImage}`

    FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
      // Remove old background
      if (bgImageRef.current) {
        fc.remove(bgImageRef.current)
      }

      // Scale image to fit canvas width while keeping aspect ratio
      const canvasW = fc.getWidth()
      const canvasH = fc.getHeight()
      const imgW = img.width || 800
      const imgH = img.height || 1200
      const scale = Math.min(canvasW * 0.8 / imgW, canvasH * 0.9 / imgH)

      img.set({
        originX: 'left',
        originY: 'top',
        left: (canvasW - imgW * scale) / 2,
        top: (canvasH - imgH * scale) / 2,
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
      })

      bgImageRef.current = img
      fc.insertAt(0, img)

      // Reset viewport and history
      fc.setViewportTransform([1, 0, 0, 1, 0, 0])
      setZoom(100)
      historyStack.current = []
      redoStack.current = []
      currentManualState.current = '[]'
      fc.requestRenderAll()
    }).catch((err) => {
      console.error('Failed to load image:', err)
    })
  }, [currentPage?._id, currentPage?.originalImage, apiBase])

  // Render zone overlays when zones or visibility changes
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    // Remove existing zone rectangles (tagged objects)
    const toRemove = fc.getObjects().filter((obj: any) => obj._zoneId)
    toRemove.forEach((obj) => fc.remove(obj))

    // Get background image position for relative zone placement
    const bg = bgImageRef.current
    if (!bg) return
    const bgLeft = bg.left || 0
    const bgTop = bg.top || 0
    const bgScaleX = bg.scaleX || 1
    const bgScaleY = bg.scaleY || 1

    zones.forEach((zone) => {
      if (!zoneVisibility[zone._id]) return

      const rect = new Rect({
        originX: 'left',
        originY: 'top',
        left: bgLeft + zone.boundingBox.x * bgScaleX,
        top: bgTop + zone.boundingBox.y * bgScaleY,
        width: zone.boundingBox.width * bgScaleX,
        height: zone.boundingBox.height * bgScaleY,
        fill: zone.color + '20',
        stroke: zone.color,
        strokeWidth: 2,
        selectable: activeTool === 'select',
        hasControls: activeTool === 'select' && isMangaka,
        lockMovementX: !(activeTool === 'select' && isMangaka),
        lockMovementY: !(activeTool === 'select' && isMangaka),
        hoverCursor: activeTool === 'select' ? 'move' : 'default',
        transparentCorners: false,
        cornerColor: zone.color,
        cornerStrokeColor: '#fff',
        cornerStyle: 'circle',
      });
      (rect as any)._zoneId = zone._id;
      (rect as any)._zoneName = zone.name

      fc.add(rect)

      // Add label (non-interactive, just visual)
      const label = new IText(zone.name, {
        originX: 'left',
        originY: 'bottom',
        left: bgLeft + zone.boundingBox.x * bgScaleX,
        top: bgTop + zone.boundingBox.y * bgScaleY - 2,
        fontSize: 11,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 'bold',
        fill: '#fff',
        backgroundColor: zone.color,
        padding: 3,
        selectable: false,
        evented: false,
      });
      (label as any)._zoneId = zone._id
      fc.add(label)
    })

    fc.requestRenderAll()
  }, [zones, zoneVisibility, activeTool])

  // ── Tool mode handling ────────────────────────────
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc) return

    // Reset drawing mode
    fc.isDrawingMode = false
    fc.selection = false
    fc.defaultCursor = 'default'
    fc.hoverCursor = 'default'

    // Remove old event listeners
    fc.off('mouse:down')
    fc.off('mouse:move')
    fc.off('mouse:up')
    fc.off('mouse:wheel')
    fc.off('object:modified')
    fc.off('object:added')

    // Track manual user actions for history
    fc.on('object:added', (opt) => {
      if (isApplyingRemoteChange.current) return
      if (opt.target && !(opt.target as any)._zoneId && opt.target !== bgImageRef.current) {
        const target = opt.target as SyncableObject
        if (!target._syncId) target._syncId = `${user?._id || 'u'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        saveManualHistory()
        emitCanvasSync('object:added', target.toObject())
      }
    })
    fc.on('object:removed', (opt) => {
      if (isApplyingRemoteChange.current) return
      if (opt.target && !(opt.target as any)._zoneId && opt.target !== bgImageRef.current) {
        const target = opt.target as SyncableObject
        saveManualHistory()
        emitCanvasSync('object:removed', { object: { ...target.toObject(), _syncId: target._syncId } })
      }
    })

    // Modifications (both zones and manuals)
    fc.on('object:modified', (opt) => {
      const target = opt.target as any
      if (!target) return

      if (target._zoneId && bgImageRef.current) {
        // Zone modify
        const bg = bgImageRef.current
        const bgScaleX = bg.scaleX || 1
        const bgScaleY = bg.scaleY || 1
        
        const newX = ((target.left || 0) - (bg.left || 0)) / bgScaleX
        const newY = ((target.top || 0) - (bg.top || 0)) / bgScaleY
        const newW = ((target.width || 0) * (target.scaleX || 1)) / bgScaleX
        const newH = ((target.height || 0) * (target.scaleY || 1)) / bgScaleY

        zonesAPI.update(target._zoneId, {
          boundingBox: { x: Math.round(newX), y: Math.round(newY), width: Math.round(newW), height: Math.round(newH) }
        }).then(() => loadZones()).catch(console.error)
      } else if (target !== bgImageRef.current) {
        // Manual modify
        const syncTarget = target as SyncableObject
        if (!syncTarget._syncId) syncTarget._syncId = `${user?._id || 'u'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        saveManualHistory()
        emitCanvasSync('object:modified', { object: { ...target.toObject(), _syncId: syncTarget._syncId } })
      }
    })

    // ── Mouse wheel zoom (always active) ────────────
    fc.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent
      e.preventDefault()
      e.stopPropagation()

      const delta = e.deltaY
      let newZoom = fc.getZoom() * (1 - delta / 500)
      newZoom = Math.max(0.2, Math.min(5, newZoom))

      fc.zoomToPoint(new Point(e.offsetX, e.offsetY), newZoom)
      setZoom(Math.round(newZoom * 100))
      fc.requestRenderAll()
    })

    if (activeTool === 'select') {
      fc.selection = true
      fc.defaultCursor = 'default'
      fc.forEachObject((obj: any) => {
        if (obj === bgImageRef.current) return
        if (obj._zoneId) {
          obj.selectable = true
        } else {
          // Manual drawings/text
          obj.selectable = true
          obj.hasControls = true
          obj.lockMovementX = false
          obj.lockMovementY = false
        }
        const syncObj = obj as SyncableObject
        if (syncObj._syncId && focusedObjects[syncObj._syncId]) {
          obj.set({ strokeDashArray: [4, 2], borderColor: '#f59e0b' })
        }
        if (syncObj._syncId && lockedObjects[syncObj._syncId]) {
          const owner = lockedObjects[syncObj._syncId]
          obj.set({ selectable: false, evented: false, opacity: 0.75 })
          ;(obj as any).lockLabel = owner
        }
      })

      // Click on zone rect → select it
      fc.on('mouse:down', (opt) => {
        const target = opt.target as any
        if (target?._zoneId) {
          setSelectedZoneId(target._zoneId)
        }
        if (target?._syncId && !lockedObjects[target._syncId]) {
          socketService.emit('object:focus', {
            room: chapterRoom,
            objectId: target._syncId,
            action: 'focus',
          })
          socketService.emit('object:lock', {
            room: chapterRoom,
            objectId: target._syncId,
            action: 'lock',
          })
        }
      })

      fc.on('mouse:up', (opt) => {
        const target = opt.target as any
        if (target?._syncId) {
          socketService.emit('object:focus', {
            room: chapterRoom,
            objectId: target._syncId,
            action: 'blur',
          })
          socketService.emit('object:lock', {
            room: chapterRoom,
            objectId: target._syncId,
            action: 'unlock',
          })
        }
      })

    } else if (activeTool === 'pan') {
      fc.defaultCursor = 'grab'
      fc.hoverCursor = 'grab'
      fc.forEachObject((obj: any) => { obj.selectable = false })

      fc.on('mouse:down', (opt) => {
        isPanning.current = true
        fc.defaultCursor = 'grabbing'
        const e = opt.e as MouseEvent
        lastPanPos.current = { x: e.clientX, y: e.clientY }
      })

      fc.on('mouse:move', (opt) => {
        if (!isPanning.current) return
        const e = opt.e as MouseEvent
        const vpt = fc.viewportTransform!
        vpt[4] += e.clientX - lastPanPos.current.x
        vpt[5] += e.clientY - lastPanPos.current.y
        lastPanPos.current = { x: e.clientX, y: e.clientY }
        fc.requestRenderAll()
      })

      fc.on('mouse:up', () => {
        isPanning.current = false
        fc.defaultCursor = 'grab'
      })

    } else if (activeTool === 'zone') {
      fc.defaultCursor = 'crosshair'
      fc.hoverCursor = 'crosshair'
      fc.forEachObject((obj: any) => { obj.selectable = false })

      let drawingRect: Rect | null = null
      let startX = 0, startY = 0

      fc.on('mouse:down', (opt) => {
        if (opt.target) return // Don't draw on existing objects
        const pointer = fc.getScenePoint(opt.e)
        startX = pointer.x
        startY = pointer.y
        drawingRect = new Rect({
          originX: 'left',
          originY: 'top',
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: zoneTypeColors[newZoneType] + '20',
          stroke: zoneTypeColors[newZoneType],
          strokeWidth: 2,
          strokeDashArray: [6, 3],
          selectable: false,
          evented: false,
        })
        fc.add(drawingRect)
      })

      fc.on('mouse:move', (opt) => {
        if (!drawingRect) return
        const pointer = fc.getScenePoint(opt.e)
        const w = pointer.x - startX
        const h = pointer.y - startY

        drawingRect.set({
          left: w >= 0 ? startX : pointer.x,
          top: h >= 0 ? startY : pointer.y,
          width: Math.abs(w),
          height: Math.abs(h),
        })
        fc.requestRenderAll()
      })

      fc.on('mouse:up', () => {
        if (!drawingRect) return
        const w = drawingRect.width || 0
        const h = drawingRect.height || 0

        if (w < 10 || h < 10) {
          fc.remove(drawingRect)
          drawingRect = null
          return
        }

        // Convert canvas coordinates to image-relative coordinates
        const bg = bgImageRef.current
        if (bg) {
          const bgLeft = bg.left || 0
          const bgTop = bg.top || 0
          const bgScaleX = bg.scaleX || 1
          const bgScaleY = bg.scaleY || 1

          setPendingZoneRect({
            x: ((drawingRect.left || 0) - bgLeft) / bgScaleX,
            y: ((drawingRect.top || 0) - bgTop) / bgScaleY,
            w: w / bgScaleX,
            h: h / bgScaleY,
          })
          setShowNewZoneDialog(true)
        }

        fc.remove(drawingRect)
        drawingRect = null
      })

    } else if (activeTool === 'draw') {
      fc.isDrawingMode = true
      const brush = new PencilBrush(fc)
      brush.color = brushMode === 'eraser' ? '#e5e5e5' : drawColorRef.current
      brush.width = brushMode === 'marker' ? drawSizeRef.current * 2 : brushMode === 'pencil' ? Math.max(1, drawSizeRef.current - 1) : drawSizeRef.current
      brush.strokeLineCap = 'round'
      brush.strokeLineJoin = 'round'
      fc.freeDrawingBrush = brush
      fc.on('path:created', (opt) => {
        if (isApplyingRemoteChange.current) return
        const path = opt.path as SyncableObject
        if (path) {
          if (!path._syncId) path._syncId = `${user?._id || 'u'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          path.set({
            shadow: brushMode === 'marker' ? '0 0 0 rgba(0,0,0,0.15)' : undefined,
            globalCompositeOperation: brushMode === 'eraser' ? 'destination-out' : 'source-over',
            opacity: brushMode === 'marker' ? 0.35 : 1,
          })
          emitCanvasSync('object:added', { ...path.toObject(), _syncId: path._syncId })
        }
      })

    } else if (activeTool === 'text') {
      fc.defaultCursor = 'text'
      fc.forEachObject((obj: any) => { obj.selectable = false })

      fc.on('mouse:down', (opt) => {
        if (opt.target && opt.target.type === 'i-text') return // let it be editable
        const pointer = fc.getScenePoint(opt.e)
        const text = new IText('Gõ chữ ở đây...', {
          originX: 'left',
          originY: 'top',
          left: pointer.x,
          top: pointer.y,
          fontSize: Math.max(12, drawSizeRef.current * 10),
          fontFamily: 'Inter, sans-serif',
          fill: drawColorRef.current,
          editable: true,
          selectable: true,
          hasControls: true,
        })
        fc.add(text)
        fc.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        fc.requestRenderAll()
      })
    }

    return () => {
      fc.off('mouse:down')
      fc.off('mouse:move')
      fc.off('mouse:up')
      fc.off('mouse:wheel')
      fc.off('object:modified')
      fc.off('object:added')
      fc.off('object:removed')
    }
  }, [activeTool, newZoneType, loadZones, isMangaka, saveManualHistory])

  // ── Zoom controls ─────────────────────────────────
  const handleZoomChange = useCallback((newZoomPct: number) => {
    const fc = fabricRef.current
    if (!fc) return
    const z = Math.max(20, Math.min(500, newZoomPct)) / 100
    const center = new Point(fc.getWidth() / 2, fc.getHeight() / 2)
    fc.zoomToPoint(center, z)
    setZoom(Math.round(z * 100))
    fc.requestRenderAll()
  }, [])

  const handleResetView = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    fc.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(100)
    fc.requestRenderAll()
  }, [])

  // ── Undo / Redo controls ──────────────────────────
  const handleUndo = useCallback(async () => {
    if (isRestoring.current || historyStack.current.length === 0) return
    isRestoring.current = true
    
    const record = historyStack.current.pop()!
    redoStack.current.push(record)
    
    if (record.type === 'manual_change') {
      await restoreManualState(record.prevState)
      currentManualState.current = record.prevState
    }
    
    isRestoring.current = false
  }, [])

  const handleRedo = useCallback(async () => {
    if (isRestoring.current || redoStack.current.length === 0) return
    isRestoring.current = true
    
    const record = redoStack.current.pop()!
    historyStack.current.push(record)
    
    if (record.type === 'manual_change') {
      await restoreManualState(record.nextState)
      currentManualState.current = record.nextState
    }
    
    isRestoring.current = false
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    const fc = fabricRef.current
    if (!fc) return
    const activeObjects = fc.getActiveObjects()
    if (activeObjects.length) {
      let manualDeleted = false
      for (const obj of activeObjects) {
        if ((obj as any)._zoneId) {
          try {
            await zonesAPI.delete((obj as any)._zoneId)
          } catch (e) { console.error(e) }
        } else {
          fc.remove(obj)
          manualDeleted = true
        }
      }
      if (manualDeleted) saveManualHistory()
      fc.discardActiveObject()
      loadZones()
      fc.requestRenderAll()
    }
  }, [loadZones, saveManualHistory])

  // ── Create zone API call ──────────────────────────
  const handleCreateZone = async () => {
    if (!currentPage?._id || !pendingZoneRect) return
    try {
      await zonesAPI.create(currentPage._id, {
        name: newZoneName,
        type: newZoneType,
        color: zoneTypeColors[newZoneType] || '#999',
        boundingBox: {
          x: Math.round(pendingZoneRect.x),
          y: Math.round(pendingZoneRect.y),
          width: Math.round(pendingZoneRect.w),
          height: Math.round(pendingZoneRect.h),
        },
      })
      loadZones()
    } catch {}
    setShowNewZoneDialog(false)
    setPendingZoneRect(null)
    setNewZoneName('Background')
    setNewZoneType('background')
  }

  // ── Keyboard shortcuts ────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        const fc = fabricRef.current
        if (fc && fc.getActiveObjects().length > 0) {
          // Allow Backspace/Delete if actively editing text
          const activeObj = fc.getActiveObject() as any
          if (activeObj && activeObj.isEditing) return
          e.preventDefault()
          handleDeleteSelected()
        }
      } else if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault()
          if (e.shiftKey) handleRedo()
          else handleUndo()
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault()
          handleRedo()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleUndo, handleRedo, handleDeleteSelected])

  const handleDeleteZone = async (id: string) => {
    try {
      await zonesAPI.delete(id)
      loadZones()
      if (selectedZoneId === id) setSelectedZoneId(null)
    } catch {}
  }

  // ── Page upload handler ───────────────────────────
  const handlePageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedChapterId) return
    const file = e.target.files[0]
    const formData = new FormData()
    formData.append('image', file)
    formData.append('pageNumber', String(pages.length + 1))
    formData.append('width', '0')
    formData.append('height', '0')
    try {
      await pagesAPI.upload(selectedChapterId, formData)
      const res = await pagesAPI.getByChapter(selectedChapterId)
      setPages(res.data.pages || [])
      setCurrentPageIdx(res.data.pages.length - 1)
    } catch {}
  }

  const handleDeletePage = async (pageId: string) => {
    if (!window.confirm(t('studio.confirmDeletePage', 'Bạn có chắc chắn muốn xóa trang này không? Các zone và công việc trên trang này sẽ bị mất.'))) return
    try {
      await pagesAPI.delete(pageId)
      const res = await pagesAPI.getByChapter(selectedChapterId)
      const newPages = res.data.pages || []
      setPages(newPages)
      if (currentPageIdx >= newPages.length) {
        setCurrentPageIdx(Math.max(0, newPages.length - 1))
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = shareUserQuery.trim()
      if (!q) {
        setShareUserResults([])
        return
      }
      try {
        const res = await authAPI.search(q)
        setShareUserResults(res.data.users || [])
      } catch {
        setShareUserResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [shareUserQuery])

  const handleShareAccess = async () => {
    if (!selectedChapterId || !shareUserId.trim()) return
    try {
      await chaptersAPI.shareAccess(selectedChapterId, {
        userId: shareUserId.trim(),
        role: shareRole,
        canEdit: shareCanEdit,
        canComment: shareCanComment,
        canInvite: shareCanInvite,
      })
      const res = await chaptersAPI.getBySeries(selectedSeriesId)
      setChapters(res.data.chapters || [])
      setShareUserId('')
      setShareUserQuery('')
      setShareUserResults([])
      setShareRole('assistant')
      setShareCanEdit(true)
      setShareCanComment(true)
      setShareCanInvite(false)
    } catch (error) {
      console.error(error)
    }
  }

  const handleRemoveAccess = async (userId: string) => {
    if (!selectedChapterId) return
    try {
      await chaptersAPI.removeAccess(selectedChapterId, userId)
      const res = await chaptersAPI.getBySeries(selectedSeriesId)
      setChapters(res.data.chapters || [])
    } catch (error) {
      console.error(error)
    }
  }

  // ── Computed ──────────────────────────────────────
  const currentSeries = seriesList.find(s => s._id === selectedSeriesId)
  const currentChapter = chapters.find(c => c._id === selectedChapterId)
  const chapterCollaborators = (currentChapter as any)?.collaborators || []

  return (
    <div
      className="flex h-[calc(100vh-1px)] flex-col"
      onMouseMove={(e) => {
        if (!chapterRoom) return
        const rect = canvasContainerRef.current?.getBoundingClientRect()
        if (!rect) return
        socketService.emit('cursor:move', {
          room: chapterRoom,
          payload: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            color: user?.avatarColor || '#ef4444',
            name: user?.displayName || user?.email || 'User',
          },
        })
      }}
    >
      {/* ── Top toolbar ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2 bg-white z-10">
        {/* Tools */}
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

          {/* Color & Size tools */}
          {(activeTool === 'draw' || activeTool === 'text' || activeTool === 'select') && (
            <>
              <div className="mx-2 h-5 w-px bg-neutral-200" />
              <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
                {(['ink', 'marker', 'pencil', 'eraser'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBrushMode(mode)}
                    className={`rounded-md px-2 py-1 text-[10px] font-medium capitalize transition-colors ${
                      brushMode === mode ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-neutral-100 p-1">
                {['#000000', '#ffffff', '#ef4444', '#3b82f6', '#22c55e', '#eab308'].map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDrawColor(c)}
                    className={`size-5 rounded-full border shadow-sm transition-transform hover:scale-110 ${
                      drawColor === c ? 'scale-110 border-neutral-900 ring-1 ring-neutral-900 ring-offset-1' : 'border-neutral-300'
                    }`}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
                <input
                  type="color"
                  title="Tùy chỉnh màu sắc"
                  value={drawColor}
                  onChange={e => setDrawColor(e.target.value)}
                  className="ml-1 h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0 outline-none"
                />
              </div>
              <input
                type="range"
                title="Kích cỡ"
                min="1"
                max="24"
                value={drawSize}
                onChange={e => setDrawSize(Number(e.target.value))}
                className="w-20 cursor-pointer accent-neutral-900"
              />
            </>
          )}

          <div className="mx-2 h-5 w-px bg-neutral-200" />

          <button type="button" title="Undo" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={handleUndo}>
            <Undo2 className="size-4" />
          </button>
          <button type="button" title="Redo" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={handleRedo}>
            <Redo2 className="size-4" />
          </button>

          <div className="mx-2 h-5 w-px bg-neutral-200" />
          <button type="button" title="Delete selected" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-red-100 hover:text-red-600" onClick={handleDeleteSelected}>
            <Trash2 className="size-4" />
          </button>

          {isMangaka && (
            <>
              <div className="mx-2 h-5 w-px bg-neutral-200" />
              <label className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer" title="Upload page">
                <Upload className="size-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handlePageUpload} />
              </label>
            </>
          )}
        </div>

        {/* Series / Chapter selector */}
        <div className="flex items-center gap-2">
          <select
            className="h-7 rounded-lg border border-neutral-200 px-2 text-xs bg-white"
            value={selectedSeriesId}
            onChange={e => setSelectedSeriesId(e.target.value)}
          >
            {seriesList.map(s => <option key={s._id} value={s._id}>{s.title}</option>)}
          </select>
          <select
            className="h-7 rounded-lg border border-neutral-200 px-2 text-xs bg-white"
            value={selectedChapterId}
            onChange={e => setSelectedChapterId(e.target.value)}
          >
            {chapters.map(c => <option key={c._id} value={c._id}>Ch. {c.chapterNumber}</option>)}
          </select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => setCurrentPageIdx(Math.max(0, currentPageIdx - 1))} disabled={currentPageIdx === 0}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-medium text-neutral-700">
            {pages.length > 0 ? `Page ${currentPageIdx + 1} / ${pages.length}` : 'No pages'}
          </span>
          <Button variant="ghost" size="sm" className="size-7 p-0 rounded-lg" onClick={() => setCurrentPageIdx(Math.min(pages.length - 1, currentPageIdx + 1))} disabled={currentPageIdx >= pages.length - 1}>
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button type="button" title="Zoom out" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={() => handleZoomChange(zoom - 25)}>
            <ZoomOut className="size-4" />
          </button>
          <button type="button" className="text-xs text-neutral-500 w-12 text-center hover:text-neutral-900" onClick={() => handleZoomChange(100)}>
            {zoom}%
          </button>
          <button type="button" title="Zoom in" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={() => handleZoomChange(zoom + 25)}>
            <ZoomIn className="size-4" />
          </button>
          <button type="button" title="Reset view" className="grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-100" onClick={handleResetView}>
            <RotateCcw className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Main area: Canvas + Right Panel ──────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Fabric.js Canvas ────────────────────────── */}
        <div ref={canvasContainerRef} className="flex-1 relative overflow-hidden bg-neutral-200">
          {currentPage ? (
            <canvas ref={canvasElRef} />
          ) : (
            /* Empty state */
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="grid size-16 place-items-center rounded-2xl bg-neutral-300 mx-auto">
                  <Layers className="size-6 text-neutral-500" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-700">{t('studio.noPages', 'No Pages')}</h3>
                <p className="text-xs text-neutral-500 max-w-sm">
                  {isMangaka
                    ? t('studio.uploadHint', 'Upload manga pages to get started.')
                    : t('studio.waitHint', 'Waiting for mangaka to upload pages.')}
                </p>
                {isMangaka && (
                  <label className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 text-white px-4 py-2 text-xs font-medium cursor-pointer hover:bg-neutral-800 transition-colors">
                    <Upload className="size-3.5" />
                    {t('studio.uploadPage', 'Upload Page')}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePageUpload} />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Canvas status bar */}
          {currentPage && (
            <div className="absolute left-3 top-3 flex flex-col gap-2 z-10">
              <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium shadow-lg backdrop-blur pointer-events-none">
                <span className="size-1.5 animate-pulse rounded-full bg-[#e7000b]" />
                {activeTool === 'zone'
                  ? t('studio.drawZone', 'Draw Zone — click & drag')
                  : activeTool === 'pan'
                    ? t('studio.panMode', 'Pan — drag to move')
                    : activeTool === 'draw'
                      ? t('studio.drawMode', 'Free Draw')
                      : `Page ${currentPage.pageNumber} · ${zoom}%`}
              </div>
              <div className="rounded-2xl bg-white/95 px-3 py-2 text-[10px] font-medium shadow-lg backdrop-blur pointer-events-none">
                <div className="mb-1 text-neutral-500">Collaborators ({collaboratorCount})</div>
                <div className="flex flex-wrap gap-1.5">
                  {connectedCollaborators.length === 0 ? (
                    <span className="text-neutral-400">No one else online</span>
                  ) : connectedCollaborators.map(member => (
                    <span key={member.userId} className="rounded-full bg-neutral-100 px-2 py-1 text-neutral-700">
                      {member.role} · {member.userId.slice(-4)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {currentPage && Object.entries(remoteCursors).map(([id, cursor]) => (
            <div
              key={id}
              className="absolute z-20 pointer-events-none"
              style={{ left: cursor.x, top: cursor.y, transform: 'translate(8px, 8px)' }}
            >
              <div className="h-3 w-3 rounded-full border-2 border-white shadow" style={{ backgroundColor: cursor.color }} />
              <div className="mt-1 rounded-full px-2 py-0.5 text-[10px] text-white shadow" style={{ backgroundColor: cursor.color }}>
                {cursor.name}
              </div>
            </div>
          ))}

          {currentPage && Object.entries(lockedObjects).map(([objectId, owner]) => (
            <div
              key={objectId}
              className="absolute z-20 rounded-full bg-amber-500/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg pointer-events-none"
              style={{ left: 16, top: 72 + Object.keys(lockedObjects).indexOf(objectId) * 22 }}
            >
              Editing {owner.role} · {owner.userId.slice(-4)}
            </div>
          ))}

          {/* Quick zoom indicator */}
          {currentPage && (
            <div className="absolute left-3 bottom-3 flex items-center gap-2 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium shadow-lg backdrop-blur z-10">
              <span className="text-neutral-500">Scroll to zoom • Middle-click to pan</span>
            </div>
          )}
        </div>

        {/* ── Right Panel ────────────────────────────── */}
        <div className="hidden w-72 flex-col border-l border-neutral-200 bg-white lg:flex">
          <div className="border-b border-neutral-200 px-4 pt-3 pb-0">
            <Tabs
              tabs={[
                { key: 'zones', label: t('studio.zones', 'Zones') },
                { key: 'tasks', label: t('studio.tasks', 'Tasks'), count: pageTasks.filter(t => t.status !== 'done').length },
                { key: 'pages', label: t('studio.pages', 'Pages') },
                { key: 'access', label: 'Access' },
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
                    <span className="text-xs font-semibold text-neutral-700">{t('studio.pageZones', 'Page Zones')}</span>
                  </div>
                  {isMangaka && (
                    <Button
                      variant="ghost" size="sm" className="size-6 p-0 rounded-md"
                      onClick={() => setActiveTool('zone')}
                      title="Draw new zone"
                    >
                      <Plus className="size-3" />
                    </Button>
                  )}
                </div>

                {zones.length === 0 ? (
                  <div className="rounded-xl bg-neutral-50 p-4 text-center">
                    <p className="text-xs text-neutral-500">
                      {activeTool === 'zone'
                        ? t('studio.drawOnCanvas', 'Draw a rectangle on the canvas to create a zone')
                        : t('studio.noZones', 'No zones yet. Select the Zone tool and draw on the canvas.')}
                    </p>
                  </div>
                ) : (
                  zones.map((zone) => (
                    <div
                      key={zone._id}
                      className={`rounded-xl border p-2.5 transition-all cursor-pointer ${
                        selectedZoneId === zone._id ? 'border-neutral-900 shadow-sm' : 'border-neutral-200'
                      }`}
                      onClick={() => setSelectedZoneId(zone._id)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-sm" style={{ backgroundColor: zone.color }} />
                          <span className="text-xs font-medium">{zone.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="grid size-5 place-items-center rounded text-neutral-400 hover:text-neutral-700 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setZoneVisibility(prev => ({ ...prev, [zone._id]: !prev[zone._id] })) }}
                          >
                            {zoneVisibility[zone._id] ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                          </button>
                          {isMangaka && (
                            <button
                              type="button"
                              className="grid size-5 place-items-center rounded text-neutral-400 hover:text-red-500 transition-colors"
                              onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone._id) }}
                            >
                              <Trash2 className="size-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 capitalize">{zone.type}</Badge>
                        <span className="text-[10px] text-neutral-500 capitalize">{zone.status.replace('_', ' ')}</span>
                      </div>
                      {zone.assignedTo && (
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Avatar className="size-4 bg-neutral-200">
                            <AvatarFallback className="text-[6px]">{zone.assignedTo.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] text-neutral-500">{zone.assignedTo.displayName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <Progress value={zone.progress} className="h-1 flex-1" />
                        <span className="text-[10px] text-neutral-500">{zone.progress}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Tasks tab ───────────────────────────── */}
            {rightTab === 'tasks' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-700">{t('studio.activeTasks', 'Active Tasks')}</span>
                </div>

                {pageTasks.length === 0 ? (
                  <div className="rounded-xl bg-neutral-50 p-4 text-center">
                    <p className="text-xs text-neutral-500">{t('studio.noTasks', 'No tasks for this page.')}</p>
                  </div>
                ) : (
                  pageTasks.map((task) => (
                    <Card key={task._id} className="rounded-xl p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{task.title}</p>
                          <p className="text-[10px] text-neutral-500 mt-0.5 capitalize">{task.type}</p>
                        </div>
                        {task.assignedTo && (
                          <Avatar className="size-5 bg-neutral-200 shrink-0">
                            <AvatarFallback className="text-[7px]">{task.assignedTo.displayName?.[0]}</AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] px-1.5 py-0 h-4 ${
                            task.status === 'done' ? 'text-emerald-600' : task.status === 'in_progress' ? 'text-blue-600' : 'text-neutral-500'
                          }`}
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.deadline && (
                          <span className="text-[10px] text-neutral-400">
                            {new Date(task.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* ── Pages tab ───────────────────────────── */}
            {rightTab === 'pages' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-neutral-700">{t('studio.allPages', 'All Pages')}</span>
                  <span className="text-[10px] text-neutral-500">{pages.length} pages</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {pages.map((p, idx) => (
                    <div
                      key={p._id}
                      className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all cursor-pointer group ${
                        idx === currentPageIdx ? 'border-neutral-900 shadow-md scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                      onClick={() => setCurrentPageIdx(idx)}
                    >
                      <img
                        src={p.originalImage.startsWith('http') ? p.originalImage : `${apiBase}${p.originalImage}`}
                        alt={`Page ${p.pageNumber}`}
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[8px] py-0.5 text-center">
                        {p.pageNumber}
                      </span>
                      {isMangaka && (
                        <button
                          type="button"
                          className="absolute right-1 top-1 grid size-5 place-items-center rounded bg-black/50 text-white opacity-0 transition-all hover:bg-red-500 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeletePage(p._id)
                          }}
                          title="Xóa page"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rightTab === 'access' && (
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-neutral-700 mb-2">Share access</div>
                  <div className="space-y-2 rounded-xl border border-neutral-200 p-3">
                    <Input
                      placeholder="Search user by name or email"
                      value={shareUserQuery}
                      onChange={(e) => setShareUserQuery(e.target.value)}
                    />
                    <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-neutral-100 p-1">
                      {shareUserResults.length === 0 ? (
                        <div className="px-2 py-2 text-[10px] text-neutral-400">No users found.</div>
                      ) : shareUserResults.map((u) => (
                        <button
                          key={u._id}
                          type="button"
                          className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-left text-xs hover:bg-neutral-50"
                          onClick={() => {
                            setShareUserId(u._id)
                            setShareUserQuery(`${u.displayName} (${u.email})`)
                          }}
                        >
                          <div className="font-medium">{u.displayName}</div>
                          <div className="text-[10px] text-neutral-500">{u.email} · {u.role}</div>
                        </button>
                      ))}
                    </div>
                    <div className="text-[10px] text-neutral-500">Selected user id: {shareUserId || 'none'}</div>
                    <select
                      className="h-8 w-full rounded-lg border border-neutral-200 px-2 text-xs bg-white"
                      value={shareRole}
                      onChange={(e) => setShareRole(e.target.value as 'assistant' | 'editor')}
                    >
                      <option value="assistant">assistant</option>
                      <option value="editor">editor</option>
                    </select>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <label className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1">
                        <input type="checkbox" checked={shareCanEdit} onChange={(e) => setShareCanEdit(e.target.checked)} /> edit
                      </label>
                      <label className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1">
                        <input type="checkbox" checked={shareCanComment} onChange={(e) => setShareCanComment(e.target.checked)} /> comment
                      </label>
                      <label className="flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1">
                        <input type="checkbox" checked={shareCanInvite} onChange={(e) => setShareCanInvite(e.target.checked)} /> invite
                      </label>
                    </div>
                    <Button size="sm" className="w-full" onClick={handleShareAccess}>Share</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-neutral-700">Collaborators</div>
                  {chapterCollaborators.length === 0 ? (
                    <div className="rounded-xl bg-neutral-50 p-4 text-center text-xs text-neutral-500">No collaborators yet.</div>
                  ) : chapterCollaborators.map((member: any) => (
                    <Card key={String(member.userId?._id || member.userId)} className="rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-medium">
                            {member.userId?.displayName || member.userId?.email || String(member.userId)}
                          </div>
                          <div className="text-[10px] text-neutral-500 capitalize">
                            {member.role} · {member.canEdit ? 'can edit' : 'view only'}
                          </div>
                        </div>
                        {isMangaka && String(member.userId?._id || member.userId) !== String(user?._id) && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => handleRemoveAccess(String(member.userId?._id || member.userId))}>
                            Remove
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom info bar ─────────────────────── */}
          <div className="border-t border-neutral-200 px-4 py-2.5 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400 truncate">
              {currentChapter ? `Ch. ${currentChapter.chapterNumber}` : ''} · {currentSeries?.title || ''}
            </span>
            <div className="flex items-center gap-1">
              <Minus className="size-3 text-neutral-400" />
              <span className="text-[10px] text-neutral-500">{zoom}%</span>
              <Plus className="size-3 text-neutral-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ── New Zone Dialog ────────────────────────────── */}
      {showNewZoneDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-80 rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold">{t('studio.createZone', 'Create Zone')}</h3>
            <div>
              <label className="text-xs font-medium text-neutral-700 mb-1 block">{t('studio.zoneName', 'Name')}</label>
              <Input value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="Zone name" />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-700 mb-1 block">{t('studio.zoneType', 'Type')}</label>
              <div className="grid grid-cols-3 gap-1.5">
                {Object.entries(zoneTypeColors).map(([type, color]) => (
                  <button
                    key={type}
                    type="button"
                    className={`rounded-lg border px-2 py-1.5 text-[10px] font-medium capitalize transition-all ${
                      newZoneType === type ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 hover:border-neutral-400'
                    }`}
                    onClick={() => { setNewZoneType(type); setNewZoneName(type.charAt(0).toUpperCase() + type.slice(1)) }}
                  >
                    <span className="inline-block size-1.5 rounded-full mr-1" style={{ backgroundColor: color }} />
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setShowNewZoneDialog(false); setPendingZoneRect(null) }}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button size="sm" onClick={handleCreateZone}>
                {t('common.create', 'Create')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
