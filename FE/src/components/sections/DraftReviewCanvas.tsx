/* eslint-disable */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Canvas as FabricCanvas, FabricImage, Rect, Circle, IText, PencilBrush, Point } from 'fabric'
import {
  ChevronLeft, ChevronRight, Hand, Minus, MousePointer2,
  Pen, Plus, Square, Type, X, ZoomIn, ZoomOut, RotateCcw,
  MessageCircle, Trash2, CircleDot, Loader2
} from 'lucide-react'
import { Badge, Button } from '../ui'

/* ────────────────── Types ────────────────── */
export type AnnotationData = {
  id: string
  type: 'rect' | 'circle' | 'text' | 'freehand'
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  text?: string
  color: string
  pageIndex: number
  createdAt: string
}

type PageData = {
  _id: string
  pageNumber: number
  originalImage: string
  width: number
  height: number
}

type DraftReviewCanvasProps = {
  pages: PageData[]
  annotations: AnnotationData[]
  onAnnotationsChange: (annotations: AnnotationData[]) => void
  onClose: () => void
  seriesTitle: string
  chapterTitle: string
  readOnly?: boolean
}

/* ────────── Annotation Tools ────────── */
type AnnotationTool = 'select' | 'pan' | 'rect' | 'circle' | 'text' | 'freehand'

const annotationTools: Array<{ icon: typeof MousePointer2; label: string; key: AnnotationTool }> = [
  { icon: MousePointer2, label: 'Select', key: 'select' },
  { icon: Hand, label: 'Pan', key: 'pan' },
  { icon: Square, label: 'Rectangle', key: 'rect' },
  { icon: CircleDot, label: 'Circle', key: 'circle' },
  { icon: Pen, label: 'Freehand', key: 'freehand' },
  { icon: Type, label: 'Text', key: 'text' },
]

const annotationColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
]

/* ────────────── Component ────────────── */
export function DraftReviewCanvas({
  pages,
  annotations,
  onAnnotationsChange,
  onClose,
  seriesTitle,
  chapterTitle,
  readOnly = false,
}: DraftReviewCanvasProps) {
  const { t } = useTranslation()

  // State
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [activeTool, setActiveTool] = useState<AnnotationTool>('select')
  const [activeColor, setActiveColor] = useState('#ef4444')
  const [zoom, setZoom] = useState(100)
  const [imageLoading, setImageLoading] = useState(true)

  // Refs
  const canvasContainerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<FabricCanvas | null>(null)
  const bgImageRef = useRef<FabricImage | null>(null)
  const isPanning = useRef(false)
  const lastPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

  const currentPage = pages[currentPageIdx]
  const pageAnnotations = annotations.filter(a => a.pageIndex === currentPageIdx)
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

  /* ──── Canvas setup ──── */
  const resizeCanvas = useCallback(() => {
    const fc = fabricRef.current
    const container = canvasContainerRef.current
    if (!fc || !container) return
    const { width, height } = container.getBoundingClientRect()
    fc.setDimensions({ width, height })
  }, [])

  // Initialize canvas
  useEffect(() => {
    if (!canvasElRef.current || fabricRef.current) return
    const fc = new FabricCanvas(canvasElRef.current, {
      selection: !readOnly,
      preserveObjectStacking: true,
      backgroundColor: '#1a1a2e',
    })
    fabricRef.current = fc
    resizeCanvas()

    return () => {
      fc.dispose()
      fabricRef.current = null
    }
  }, [resizeCanvas, readOnly])

  // Window resize
  useEffect(() => {
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  // Load background image when page changes
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || !currentPage) return

    setImageLoading(true)
    const imgUrl = currentPage.originalImage.startsWith('http')
      ? currentPage.originalImage
      : `${apiBase}${currentPage.originalImage}`

    FabricImage.fromURL(imgUrl, { crossOrigin: 'anonymous' }).then((img) => {
      // Remove old background
      if (bgImageRef.current) {
        fc.remove(bgImageRef.current)
      }
      // Remove old annotation objects
      const toRemove = fc.getObjects().filter((o: any) => o._annotationId)
      toRemove.forEach(o => fc.remove(o))

      // Scale image to fit
      const canvasW = fc.getWidth()
      const canvasH = fc.getHeight()
      const imgW = img.width || 800
      const imgH = img.height || 1200
      const scale = Math.min(canvasW * 0.85 / imgW, canvasH * 0.9 / imgH)

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
      fc.setViewportTransform([1, 0, 0, 1, 0, 0])
      setZoom(100)

      // Render existing annotations for this page
      renderAnnotations(fc, img)

      fc.requestRenderAll()
      setImageLoading(false)
    }).catch((err) => {
      console.error('Failed to load page image:', err)
      setImageLoading(false)
    })
  }, [currentPageIdx, currentPage?._id, currentPage?.originalImage, apiBase])

  /* ──── Render annotation objects on canvas ──── */
  const renderAnnotations = useCallback((fc: FabricCanvas, bg: FabricImage) => {
    // Clear existing annotation objects
    const toRemove = fc.getObjects().filter((o: any) => o._annotationId)
    toRemove.forEach(o => fc.remove(o))

    const bgLeft = bg.left || 0
    const bgTop = bg.top || 0
    const bgScaleX = bg.scaleX || 1
    const bgScaleY = bg.scaleY || 1

    pageAnnotations.forEach((ann) => {
      let obj: any = null

      if (ann.type === 'rect') {
        obj = new Rect({
          left: bgLeft + ann.x * bgScaleX,
          top: bgTop + ann.y * bgScaleY,
          width: (ann.width || 100) * bgScaleX,
          height: (ann.height || 60) * bgScaleY,
          fill: ann.color + '15',
          stroke: ann.color,
          strokeWidth: 3,
          selectable: !readOnly && activeTool === 'select',
          hasControls: !readOnly,
          cornerColor: ann.color,
          cornerStrokeColor: '#fff',
          cornerStyle: 'circle' as const,
          transparentCorners: false,
        })
      } else if (ann.type === 'circle') {
        obj = new Circle({
          left: bgLeft + ann.x * bgScaleX,
          top: bgTop + ann.y * bgScaleY,
          radius: (ann.radius || 30) * bgScaleX,
          fill: ann.color + '15',
          stroke: ann.color,
          strokeWidth: 3,
          selectable: !readOnly && activeTool === 'select',
          hasControls: !readOnly,
          cornerColor: ann.color,
          cornerStrokeColor: '#fff',
          cornerStyle: 'circle' as const,
          transparentCorners: false,
        })
      } else if (ann.type === 'text') {
        obj = new IText(ann.text || 'Note', {
          left: bgLeft + ann.x * bgScaleX,
          top: bgTop + ann.y * bgScaleY,
          fontSize: 16 * bgScaleX,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          fill: ann.color,
          backgroundColor: '#fff',
          padding: 6,
          selectable: !readOnly && activeTool === 'select',
          editable: !readOnly,
          hasControls: !readOnly,
        })
      }

      if (obj) {
        (obj as any)._annotationId = ann.id
        fc.add(obj)
      }
    })

    fc.requestRenderAll()
  }, [pageAnnotations, readOnly, activeTool])

  // Re-render annotations when they change
  useEffect(() => {
    const fc = fabricRef.current
    const bg = bgImageRef.current
    if (!fc || !bg) return
    renderAnnotations(fc, bg)
  }, [annotations, currentPageIdx, renderAnnotations])

  /* ──── Tool handling ──── */
  useEffect(() => {
    const fc = fabricRef.current
    if (!fc || readOnly) return

    // Reset
    fc.isDrawingMode = false
    fc.selection = false
    fc.defaultCursor = 'default'
    fc.hoverCursor = 'default'

    // Clean up old listeners
    fc.off('mouse:down')
    fc.off('mouse:move')
    fc.off('mouse:up')
    fc.off('mouse:wheel')

    // Wheel zoom (always)
    fc.on('mouse:wheel', (opt) => {
      const e = opt.e as WheelEvent
      e.preventDefault()
      e.stopPropagation()
      let newZoom = fc.getZoom() * (1 - e.deltaY / 500)
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
        if (obj._annotationId) {
          obj.selectable = true
          obj.hasControls = true
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
    } else if (activeTool === 'rect') {
      fc.defaultCursor = 'crosshair'
      fc.forEachObject((obj: any) => { obj.selectable = false })

      let drawingRect: Rect | null = null
      let startX = 0, startY = 0

      fc.on('mouse:down', (opt) => {
        if (opt.target) return
        const pointer = fc.getScenePoint(opt.e)
        startX = pointer.x
        startY = pointer.y
        drawingRect = new Rect({
          left: startX, top: startY, width: 0, height: 0,
          fill: activeColor + '15', stroke: activeColor, strokeWidth: 3,
          strokeDashArray: [6, 3], selectable: false, evented: false,
        })
        fc.add(drawingRect)
      })
      fc.on('mouse:move', (opt) => {
        if (!drawingRect) return
        const pointer = fc.getScenePoint(opt.e)
        drawingRect.set({
          left: pointer.x >= startX ? startX : pointer.x,
          top: pointer.y >= startY ? startY : pointer.y,
          width: Math.abs(pointer.x - startX),
          height: Math.abs(pointer.y - startY),
        })
        fc.requestRenderAll()
      })
      fc.on('mouse:up', () => {
        if (!drawingRect) return
        const w = drawingRect.width || 0
        const h = drawingRect.height || 0
        fc.remove(drawingRect)

        if (w < 10 || h < 10) { drawingRect = null; return }

        const bg = bgImageRef.current
        if (bg) {
          const bgLeft = bg.left || 0
          const bgTop = bg.top || 0
          const bgScaleX = bg.scaleX || 1
          const bgScaleY = bg.scaleY || 1

          const newAnnotation: AnnotationData = {
            id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'rect',
            x: ((drawingRect.left || 0) - bgLeft) / bgScaleX,
            y: ((drawingRect.top || 0) - bgTop) / bgScaleY,
            width: w / bgScaleX,
            height: h / bgScaleY,
            color: activeColor,
            pageIndex: currentPageIdx,
            createdAt: new Date().toISOString(),
          }
          onAnnotationsChange([...annotations, newAnnotation])
        }
        drawingRect = null
      })
    } else if (activeTool === 'circle') {
      fc.defaultCursor = 'crosshair'
      fc.forEachObject((obj: any) => { obj.selectable = false })

      let drawingCircle: Circle | null = null
      let centerX = 0, centerY = 0

      fc.on('mouse:down', (opt) => {
        if (opt.target) return
        const pointer = fc.getScenePoint(opt.e)
        centerX = pointer.x
        centerY = pointer.y
        drawingCircle = new Circle({
          left: centerX, top: centerY, radius: 1, originX: 'center', originY: 'center',
          fill: activeColor + '15', stroke: activeColor, strokeWidth: 3,
          strokeDashArray: [6, 3], selectable: false, evented: false,
        })
        fc.add(drawingCircle)
      })
      fc.on('mouse:move', (opt) => {
        if (!drawingCircle) return
        const pointer = fc.getScenePoint(opt.e)
        const r = Math.sqrt(Math.pow(pointer.x - centerX, 2) + Math.pow(pointer.y - centerY, 2))
        drawingCircle.set({ radius: r })
        fc.requestRenderAll()
      })
      fc.on('mouse:up', () => {
        if (!drawingCircle) return
        const r = drawingCircle.radius || 0
        fc.remove(drawingCircle)

        if (r < 5) { drawingCircle = null; return }

        const bg = bgImageRef.current
        if (bg) {
          const bgLeft = bg.left || 0
          const bgTop = bg.top || 0
          const bgScaleX = bg.scaleX || 1

          const newAnnotation: AnnotationData = {
            id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: 'circle',
            x: (centerX - bgLeft) / bgScaleX,
            y: (centerY - (bg.top || 0)) / (bg.scaleY || 1),
            radius: r / bgScaleX,
            color: activeColor,
            pageIndex: currentPageIdx,
            createdAt: new Date().toISOString(),
          }
          onAnnotationsChange([...annotations, newAnnotation])
        }
        drawingCircle = null
      })
    } else if (activeTool === 'freehand') {
      fc.isDrawingMode = true
      const brush = new PencilBrush(fc)
      brush.color = activeColor
      brush.width = 3
      brush.strokeLineCap = 'round'
      brush.strokeLineJoin = 'round'
      fc.freeDrawingBrush = brush

      fc.on('path:created', (opt: any) => {
        const path = opt.path
        if (path) {
          const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
          ;(path as any)._annotationId = id
          // Save freehand as annotation for persistence
          const bg = bgImageRef.current
          if (bg) {
            const newAnnotation: AnnotationData = {
              id,
              type: 'freehand',
              x: ((path.left || 0) - (bg.left || 0)) / (bg.scaleX || 1),
              y: ((path.top || 0) - (bg.top || 0)) / (bg.scaleY || 1),
              width: (path.width || 0) / (bg.scaleX || 1),
              height: (path.height || 0) / (bg.scaleY || 1),
              color: activeColor,
              pageIndex: currentPageIdx,
              createdAt: new Date().toISOString(),
            }
            onAnnotationsChange([...annotations, newAnnotation])
          }
        }
      })
    } else if (activeTool === 'text') {
      fc.defaultCursor = 'text'
      fc.forEachObject((obj: any) => { obj.selectable = false })

      fc.on('mouse:down', (opt) => {
        if (opt.target && opt.target.type === 'i-text') return
        const pointer = fc.getScenePoint(opt.e)
        const bg = bgImageRef.current
        if (!bg) return

        const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const text = new IText('Edit note...', {
          left: pointer.x, top: pointer.y,
          fontSize: 16 * (bg.scaleX || 1),
          fontFamily: 'Inter, sans-serif',
          fontWeight: 'bold',
          fill: activeColor,
          backgroundColor: '#fff',
          padding: 6,
          editable: true,
          selectable: true,
          hasControls: true,
        })
        ;(text as any)._annotationId = id
        fc.add(text)
        fc.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        fc.requestRenderAll()

        // Save annotation
        const newAnnotation: AnnotationData = {
          id,
          type: 'text',
          x: (pointer.x - (bg.left || 0)) / (bg.scaleX || 1),
          y: (pointer.y - (bg.top || 0)) / (bg.scaleY || 1),
          text: 'Edit note...',
          color: activeColor,
          pageIndex: currentPageIdx,
          createdAt: new Date().toISOString(),
        }
        onAnnotationsChange([...annotations, newAnnotation])
      })
    }

    return () => {
      fc.off('mouse:down')
      fc.off('mouse:move')
      fc.off('mouse:up')
      fc.off('mouse:wheel')
      fc.off('path:created')
    }
  }, [activeTool, activeColor, readOnly, currentPageIdx, annotations, onAnnotationsChange])

  /* ──── Zoom ──── */
  const handleZoom = useCallback((delta: number) => {
    const fc = fabricRef.current
    if (!fc) return
    const newZ = Math.max(20, Math.min(500, zoom + delta)) / 100
    const center = new Point(fc.getWidth() / 2, fc.getHeight() / 2)
    fc.zoomToPoint(center, newZ)
    setZoom(Math.round(newZ * 100))
    fc.requestRenderAll()
  }, [zoom])

  const handleResetView = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    fc.setViewportTransform([1, 0, 0, 1, 0, 0])
    setZoom(100)
    fc.requestRenderAll()
  }, [])

  /* ──── Delete selected annotation ──── */
  const handleDeleteSelected = useCallback(() => {
    const fc = fabricRef.current
    if (!fc) return
    const active = fc.getActiveObjects()
    active.forEach((obj: any) => {
      if (obj._annotationId) {
        onAnnotationsChange(annotations.filter(a => a.id !== obj._annotationId))
        fc.remove(obj)
      }
    })
    fc.discardActiveObject()
    fc.requestRenderAll()
  }, [annotations, onAnnotationsChange])

  /* ──── Delete specific annotation ──── */
  const handleDeleteAnnotation = useCallback((annId: string) => {
    const fc = fabricRef.current
    if (fc) {
      const obj = fc.getObjects().find((o: any) => (o as any)._annotationId === annId)
      if (obj) fc.remove(obj)
      fc.requestRenderAll()
    }
    onAnnotationsChange(annotations.filter(a => a.id !== annId))
  }, [annotations, onAnnotationsChange])

  /* ──── Page navigation ──── */
  const goToPage = (idx: number) => {
    if (idx >= 0 && idx < pages.length) setCurrentPageIdx(idx)
  }

  /* ──── Keyboard shortcuts ──── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if editing text
        const activeObj = fabricRef.current?.getActiveObject()
        if (activeObj && (activeObj as any).isEditing) return
        handleDeleteSelected()
      }
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPage(currentPageIdx - 1)
      if (e.key === 'ArrowRight') goToPage(currentPageIdx + 1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleDeleteSelected, currentPageIdx, onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f23]">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between border-b border-white/10 bg-[#16162a] px-4 py-2">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="rounded-lg text-white/60 hover:text-white hover:bg-white/10" onClick={onClose}>
            <X className="size-4" />
          </Button>
          <div>
            <h2 className="text-sm font-semibold text-white">{seriesTitle}</h2>
            <p className="text-xs text-white/40">{chapterTitle} · {t('studio.page')} {currentPage?.pageNumber || currentPageIdx + 1}</p>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            className="rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            disabled={currentPageIdx === 0}
            onClick={() => goToPage(currentPageIdx - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs font-medium text-white/80">
            {currentPageIdx + 1} / {pages.length}
          </span>
          <Button
            variant="ghost" size="sm"
            className="rounded-lg text-white/60 hover:text-white hover:bg-white/10"
            disabled={currentPageIdx === pages.length - 1}
            onClick={() => goToPage(currentPageIdx + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="size-7 rounded-lg p-0 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleZoom(-20)}>
            <Minus className="size-3.5" />
          </Button>
          <span className="w-12 text-center text-xs font-medium text-white/80">{zoom}%</span>
          <Button variant="ghost" size="sm" className="size-7 rounded-lg p-0 text-white/60 hover:text-white hover:bg-white/10" onClick={() => handleZoom(20)}>
            <Plus className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="size-7 rounded-lg p-0 text-white/60 hover:text-white hover:bg-white/10" onClick={handleResetView}>
            <RotateCcw className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Main Area ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Tool Panel */}
        {!readOnly && (
          <div className="flex w-14 flex-col items-center gap-1 border-r border-white/10 bg-[#16162a] py-3">
            {annotationTools.map(({ icon: Icon, label, key }) => (
              <button
                key={key}
                title={label}
                onClick={() => setActiveTool(key)}
                className={`grid size-10 place-items-center rounded-xl transition-all ${
                  activeTool === key
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'text-white/40 hover:bg-white/10 hover:text-white/80'
                }`}
              >
                <Icon className="size-4" />
              </button>
            ))}

            <div className="my-2 h-px w-8 bg-white/10" />

            {/* Delete button */}
            <button
              title="Delete selected"
              onClick={handleDeleteSelected}
              className="grid size-10 place-items-center rounded-xl text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all"
            >
              <Trash2 className="size-4" />
            </button>

            <div className="my-2 h-px w-8 bg-white/10" />

            {/* Color palette */}
            <div className="flex flex-col gap-1.5">
              {annotationColors.map((color) => (
                <button
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={`size-6 rounded-full border-2 transition-transform ${
                    activeColor === color ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div ref={canvasContainerRef} className="relative flex-1 overflow-hidden">
          <canvas ref={canvasElRef} />
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f23]/80">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-violet-400" />
                <span className="text-sm text-white/40">Loading page...</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Annotations List */}
        <div className="flex w-72 flex-col border-l border-white/10 bg-[#16162a]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-violet-400" />
              <span className="text-xs font-semibold text-white">{t('editor.annotations')}</span>
            </div>
            <Badge className="border-violet-400/30 bg-violet-500/10 text-violet-300 text-[10px]">
              {pageAnnotations.length}
            </Badge>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2">
            {pageAnnotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="mb-3 size-8 text-white/10" />
                <p className="text-xs text-white/30">{t('editor.noAnnotations')}</p>
                {!readOnly && (
                  <p className="mt-1 text-[10px] text-white/20">
                    Use the tools to annotate pages
                  </p>
                )}
              </div>
            ) : (
              pageAnnotations.map((ann) => (
                <div
                  key={ann.id}
                  className="group flex items-start gap-2 rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/10"
                >
                  <div
                    className="mt-0.5 size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: ann.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium capitalize text-white/80">
                      {ann.type === 'freehand' ? 'Freehand' : ann.type === 'rect' ? 'Rectangle' : ann.type === 'circle' ? 'Circle' : 'Text Note'}
                    </p>
                    {ann.text && (
                      <p className="mt-0.5 truncate text-[10px] text-white/40">{ann.text}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-white/20">
                      {new Date(ann.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteAnnotation(ann.id)}
                      className="shrink-0 rounded-lg p-1 text-white/20 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Page thumbnails */}
          <div className="border-t border-white/10 p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/30">Pages</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {pages.map((page, idx) => {
                const pageAnnCount = annotations.filter(a => a.pageIndex === idx).length
                return (
                  <button
                    key={page._id}
                    onClick={() => goToPage(idx)}
                    className={`relative shrink-0 rounded-lg border-2 p-0.5 transition-all ${
                      idx === currentPageIdx
                        ? 'border-violet-500 shadow-lg shadow-violet-500/30'
                        : 'border-transparent hover:border-white/20'
                    }`}
                  >
                    <div className="grid size-10 place-items-center rounded bg-white/5 text-[10px] font-bold text-white/60">
                      {page.pageNumber || idx + 1}
                    </div>
                    {pageAnnCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-violet-500 text-[8px] font-bold text-white">
                        {pageAnnCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
