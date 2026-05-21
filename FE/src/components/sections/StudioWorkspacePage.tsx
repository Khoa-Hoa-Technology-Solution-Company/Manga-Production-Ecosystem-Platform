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
  
  // History for manual tools (draw, text)
  type HistoryRecord = { type: 'manual_change', prevState: string, nextState: string }
  const historyStack = useRef<HistoryRecord[]>([])
  const redoStack = useRef<HistoryRecord[]>([])
  const currentManualState = useRef<string>('[]')
  const isRestoring = useRef(false)
  
  const [drawColor, setDrawColor] = useState('#000000')
  const [drawSize, setDrawSize] = useState(2)
  const drawColorRef = useRef(drawColor)
  const drawSizeRef = useRef(drawSize)
  useEffect(() => {
    drawColorRef.current = drawColor
    drawSizeRef.current = drawSize
  }, [drawColor, drawSize])

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
      if (opt.target && !(opt.target as any)._zoneId && opt.target !== bgImageRef.current) {
        saveManualHistory()
      }
    })
    fc.on('object:removed', (opt) => {
      if (opt.target && !(opt.target as any)._zoneId && opt.target !== bgImageRef.current) {
        saveManualHistory()
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
        saveManualHistory()
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
      })

      // Click on zone rect → select it
      fc.on('mouse:down', (opt) => {
        const target = opt.target as any
        if (target?._zoneId) {
          setSelectedZoneId(target._zoneId)
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
      brush.color = drawColorRef.current
      brush.width = drawSizeRef.current
      fc.freeDrawingBrush = brush

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

  // ── Computed ──────────────────────────────────────
  const currentSeries = seriesList.find(s => s._id === selectedSeriesId)
  const currentChapter = chapters.find(c => c._id === selectedChapterId)

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col">
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
                max="10"
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
            <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[10px] font-medium shadow-lg backdrop-blur pointer-events-none z-10">
              <span className="size-1.5 animate-pulse rounded-full bg-[#e7000b]" />
              {activeTool === 'zone'
                ? t('studio.drawZone', 'Draw Zone — click & drag')
                : activeTool === 'pan'
                  ? t('studio.panMode', 'Pan — drag to move')
                  : activeTool === 'draw'
                    ? t('studio.drawMode', 'Free Draw')
                    : `Page ${currentPage.pageNumber} · ${zoom}%`}
            </div>
          )}

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
