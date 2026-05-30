import { useEffect, useState, useRef, type MouseEvent, } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pagesAPI, annotationsAPI, chaptersAPI } from '../../lib/api'
import { Badge } from '../ui'
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Pin,
  CheckCircle,
  HelpCircle,
  Eye,
  EyeOff,
  PenTool,
  Trash2
} from 'lucide-react'
import { DraftReviewCanvas, type AnnotationData as DraftAnnotationData } from './DraftReviewCanvas'

interface PageData {
  _id: string
  pageNumber: number
  originalImage: string
  processedImage?: string
  width: number
  height: number
}


interface AnnotationData {
  _id: string
  chapterId: string
  pageId: string
  authorId: { _id: string; displayName: string; avatar?: string }
  x: number
  y: number
  note: string
  status: 'open' | 'resolved'
  createdAt: string
}

interface ChapterReviewData {
  _id: string
  chapterNumber: number
  title: string
}

export function ManuscriptReviewPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [chapter, setChapter] = useState<ChapterReviewData | null>(null)
  const [pages, setPages] = useState<PageData[]>([])
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [loading, setLoading] = useState(true)
  const [showFeedbackPins, setShowFeedbackPins] = useState(true)
  const [annotationVisibility, setAnnotationVisibility] = useState<Record<string, boolean>>({})

  // Draft Canvas
  const [showCanvas, setShowCanvas] = useState(false)
  const [draftAnnotations, setDraftAnnotations] = useState<DraftAnnotationData[]>([])

  // Interactive Pin Placement states
  const [showAddModal, setShowAddModal] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [activeClickCoords, setActiveClickCoords] = useState<{ x: number; y: number } | null>(null)
  const [submittingPin, setSubmittingPin] = useState(false)

  const imageContainerRef = useRef<HTMLDivElement>(null)

  const currentPage = pages[currentPageIdx]

  const mediaUrl = (path?: string) => {
    if (!path) return ''
    if (path.startsWith('http')) return path
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    return `${base}${path}`
  }

  // Load Chapter & Pages
  useEffect(() => {
    if (!chapterId) return
    Promise.resolve().then(() => {
      setLoading(true)
    })

    Promise.all([
      chaptersAPI.getById(chapterId).catch(() => null),
      pagesAPI.getByChapter(chapterId),
      annotationsAPI.getByChapter(chapterId)
    ]).then(([chapterRes, pagesRes, annRes]) => {
      if (chapterRes?.data?.chapter) {
        setChapter(chapterRes.data.chapter)
      }
      setPages(pagesRes.data.pages || [])
      
      const rawAnns = annRes.data.annotations || []
      setAnnotations(rawAnns)

      // Parse and initialize canvas annotations
      const parsedAnns: DraftAnnotationData[] = []
      rawAnns.forEach((a: AnnotationData) => {
        if (a.note.startsWith('[CANVAS]')) {
          try {
            const data = JSON.parse(a.note.slice(8))
            parsedAnns.push(data)
          } catch {
            // Ignore parse errors
          }
        }
      })
      setDraftAnnotations(parsedAnns)
    })
      .catch(console.error)
      .finally(() => {
        Promise.resolve().then(() => {
          setLoading(false)
        })
      })
  }, [chapterId])

  // Load annotations
  const refreshAnnotations = async () => {
    if (!chapterId) return
    try {
      const res = await annotationsAPI.getByChapter(chapterId)
      setAnnotations(res.data.annotations || [])
      
      // Parse canvas annotations
      const parsedAnns: DraftAnnotationData[] = []
      ;(res.data.annotations || []).forEach((a: AnnotationData) => {
        if (a.note.startsWith('[CANVAS]')) {
          try {
            const data = JSON.parse(a.note.slice(8))
            parsedAnns.push(data)
          } catch {
            // Ignore parse errors
          }
        }
      })
      setDraftAnnotations(parsedAnns)
    } catch (err) {
      console.error(err)
    }
  }

  // Handle Canvas Sync
  const handleDraftAnnotationsChange = async (newAnns: DraftAnnotationData[]) => {
    const added = newAnns.filter(a => !draftAnnotations.find(d => d.id === a.id));
    const removed = draftAnnotations.filter(d => !newAnns.find(a => a.id === d.id));

    setDraftAnnotations(newAnns);

    if (added.length > 0) {
      for (const ann of added) {
        const pageId = pages[ann.pageIndex]?._id;
        if (pageId && chapterId) {
          try {
            await annotationsAPI.create({
              chapterId,
              pageId,
              x: ann.x,
              y: ann.y,
              note: `[CANVAS]${JSON.stringify(ann)}`,
              source: 'review'
            });
          } catch (err) {
            console.error('Failed to create canvas annotation', err);
          }
        }
      }
      refreshAnnotations();
    }

    if (removed.length > 0) {
      for (const ann of removed) {
        const backendAnn = annotations.find(a => a.note.startsWith('[CANVAS]') && a.note.includes(ann.id));
        if (backendAnn) {
          try {
            await annotationsAPI.delete(backendAnn._id);
          } catch (err) {
            console.error('Failed to remove canvas annotation', err);
          }
        }
      }
      refreshAnnotations();
    }
  }

  // Handle Canvas/Image Click
  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!currentPage) return

    const rect = e.currentTarget.getBoundingClientRect()

    // Compute dynamic percentage-based coordinates (X & Y from 0 to 100)
    const clickX = ((e.clientX - rect.left) / rect.width) * 100
    const clickY = ((e.clientY - rect.top) / rect.height) * 100

    setActiveClickCoords({ x: clickX, y: clickY })
    setNoteInput('')
    setShowAddModal(true)
  }

  // Handle Pin Submit
  const handlePinSubmit = async () => {
    if (!chapterId || !currentPage || !activeClickCoords || !noteInput.trim()) return
    setSubmittingPin(true)
    try {
      await annotationsAPI.create({
        chapterId,
        pageId: currentPage._id,
        x: activeClickCoords.x,
        y: activeClickCoords.y,
        note: noteInput.trim(),
        source: 'review'
      })
      setShowAddModal(false)
      setActiveClickCoords(null)
      await refreshAnnotations()
    } catch (err) {
      console.error('Failed to create annotation pin', err)
    } finally {
      setSubmittingPin(false)
    }
  }

  // Handle resolving annotation
  const handleResolveAnnotation = async (id: string) => {
    try {
      await annotationsAPI.resolve(id)
      await refreshAnnotations()
    } catch (err) {
      console.error('Failed to resolve annotation', err)
    }
  }

  // Handle deleting annotation
  const handleDeleteAnnotation = async (id: string) => {
    try {
      await annotationsAPI.delete(id)
      await refreshAnnotations()
    } catch (err) {
      console.error('Failed to delete annotation', err)
    }
  }

  // Filter annotations for active page
  const pageAnnotations = annotations.filter(
    (ann) => ann.pageId === currentPage?._id
  )

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-neutral-900 text-white">
      {/* ── Top Audit Toolbar ────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-6 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/editor')}
            className="size-9 p-0 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors border-none bg-transparent cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Manuscript Review</span>
              {chapter && (
                <Badge className="bg-white/10 text-white border-none py-0 px-2 h-4 text-[9px] font-semibold uppercase">
                  Ch. {chapter.chapterNumber}
                </Badge>
              )}
            </div>
            <h1 className="text-sm font-semibold truncate leading-tight">
              {chapter ? chapter.title : 'Manuscript Audit workbench'}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mr-2">
          <button
            onClick={() => setShowCanvas(true)}
            className="h-8 px-3 text-xs font-semibold border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-xl flex items-center gap-2 transition-colors bg-transparent cursor-pointer"
          >
            <PenTool className="size-3.5" />
            <span>Draw on Canvas</span>
          </button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-850 px-3 py-1 rounded-xl">
          <button
            onClick={() => setCurrentPageIdx(Math.max(0, currentPageIdx - 1))}
            disabled={currentPageIdx === 0}
            className="size-7 p-0 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-xs font-semibold select-none text-neutral-200">
            {pages.length > 0 ? `Page ${currentPageIdx + 1} / ${pages.length}` : 'No Pages'}
          </span>
          <button
            onClick={() => setCurrentPageIdx(Math.min(pages.length - 1, currentPageIdx + 1))}
            disabled={currentPageIdx >= pages.length - 1}
            className="size-7 p-0 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 disabled:pointer-events-none transition-colors border-none bg-transparent cursor-pointer"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-neutral-400">
          <HelpCircle className="size-3.5 text-neutral-500" />
          <span>Click anywhere on manuscript to place correction pin.</span>
        </div>
      </div>

      {/* ── Main Workspace Panel ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Thumbnails List Sidebar */}
        <div className="w-56 shrink-0 border-r border-neutral-850 bg-neutral-950 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-850">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Page List</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {pages.map((p, idx) => {
              const isActive = idx === currentPageIdx
              const pageAnnsCount = annotations.filter(ann => ann.pageId === p._id && ann.status === 'open').length

              return (
                <button
                  key={p._id}
                  onClick={() => setCurrentPageIdx(idx)}
                  className={`w-full text-left rounded-xl overflow-hidden border transition-all flex flex-col relative ${isActive ? 'border-white bg-white/5 ring-1 ring-white/10' : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-700'
                    }`}
                >
                  <div className="aspect-[3/4] w-full relative overflow-hidden bg-neutral-950 flex items-center justify-center">
                    <img src={mediaUrl(p.originalImage)} alt={`Page ${idx + 1}`} className="h-full w-full object-cover opacity-60" />
                    <span className="absolute left-2 top-2 bg-black/60 rounded-lg px-1.5 py-0.5 text-[9px] font-bold">
                      Page {p.pageNumber}
                    </span>

                    {pageAnnsCount > 0 && (
                      <span className="absolute right-2 top-2 bg-red-600 rounded-full h-4 min-w-4 flex items-center justify-center text-[9px] font-bold px-1 ring-2 ring-neutral-950 animate-pulse">
                        {pageAnnsCount}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Large Manuscript Canvas Area */}
        <div className="flex-1 relative overflow-y-auto bg-neutral-900 p-6 flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="size-8 animate-spin rounded-full border-4 border-neutral-750 border-t-white" />
              <span className="text-xs text-neutral-400">Loading drawing canvas...</span>
            </div>
          ) : currentPage ? (
            <div
              ref={imageContainerRef}
              onClick={handleImageClick}
              className="relative aspect-[3/4] max-h-[80vh] bg-white rounded-xl shadow-2xl cursor-crosshair overflow-hidden border border-neutral-800 select-none"
            >
              <img
                src={mediaUrl(currentPage.originalImage)}
                alt={`Page ${currentPage.pageNumber}`}
                className="h-full w-full object-contain pointer-events-none"
              />

              {/* Glowing Coordinate Annotation Pins Overlay */}
              {showFeedbackPins && pageAnnotations.map((ann) => {
                if (ann.note.startsWith('[CANVAS]')) return null;
                const isOpen = ann.status === 'open'
                const isAnnVisible = annotationVisibility[ann._id] !== false
                if (!isAnnVisible) return null

                return (
                  <div
                    key={ann._id}
                    onClick={(e) => {
                      e.stopPropagation() // prevent placing a pin on top
                    }}
                    style={{
                      left: `${ann.x}%`,
                      top: `${ann.y}%`,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group size-5 flex items-center justify-center transition-all ${isOpen ? 'z-20' : 'z-10'
                      }`}
                  >
                    {/* Pulsing visual core */}
                    <span className={`absolute size-4 rounded-full border-2 ring-2 ring-neutral-950 ${isOpen ? 'bg-red-500 border-white ring-red-500/20 animate-pulse' : 'bg-neutral-600 border-neutral-400 ring-neutral-500/20 opacity-70'
                      }`} />

                    {/* Hover tooltip displaying correction content */}
                    <div className="absolute bottom-full pb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 w-48 text-left select-text">
                      <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl shadow-xl space-y-2">
                        <div className="flex items-center justify-between gap-1 text-[8px] font-bold uppercase tracking-wider text-red-400">
                          <div className="flex items-center gap-1">
                            <Pin className="size-2.5 shrink-0" />
                            <span>{isOpen ? 'Correction Note' : 'Resolved'}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {isOpen && (
                              <button
                                type="button"
                                onClick={() => handleResolveAnnotation(ann._id)}
                                className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-emerald-400 transition-colors border-none bg-transparent cursor-pointer"
                                title="Resolve Pin"
                              >
                                <CheckCircle className="size-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Delete this pin?')) {
                                  handleDeleteAnnotation(ann._id)
                                }
                              }}
                              className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                              title="Delete Pin"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] leading-normal text-white break-words">{ann.note}</p>

                        <div className="flex items-center gap-1.5 mt-2 border-t border-neutral-900 pt-1.5 text-[8px] text-neutral-500">
                          <span>{ann.authorId?.displayName || 'Tantou Editor'}</span>
                          <span>·</span>
                          <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center text-xs text-neutral-400">
              Chưa có trang bản thảo nào được tải lên cho Chapter này.
            </div>
          )}
        </div>

        {/* Right Feedback & Corrections Panel */}
        <div className="w-64 shrink-0 border-l border-neutral-850 bg-neutral-950 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-neutral-850 flex items-center justify-between">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Active Corrections</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowFeedbackPins(!showFeedbackPins)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-neutral-800 text-[8px] font-semibold text-neutral-400 hover:bg-neutral-900 hover:text-white transition-all bg-transparent"
                title={showFeedbackPins ? "Hide all pins on canvas" : "Show all pins on canvas"}
              >
                {showFeedbackPins ? <Eye className="size-2.5 text-neutral-300" /> : <EyeOff className="size-2.5 text-neutral-500" />}
                <span>{showFeedbackPins ? t('common.visible', 'Visible') : t('common.hidden', 'Hidden')}</span>
              </button>
              <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-none px-2 py-0 text-[9px]">
                {pageAnnotations.filter(ann => ann.status === 'open' && !ann.note.startsWith('[CANVAS]')).length} Pins
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {pageAnnotations.filter(ann => !ann.note.startsWith('[CANVAS]')).length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <div className="grid size-10 place-items-center rounded-2xl bg-neutral-900 mx-auto text-neutral-500">
                  <CheckCircle className="size-4" />
                </div>
                <p className="text-[10px] text-neutral-400">Clean Slate!</p>
                <p className="text-[8px] text-neutral-500 max-w-[120px] mx-auto leading-normal">
                  No open correction annotations placed on this page.
                </p>
              </div>
            ) : (
              pageAnnotations.filter(ann => !ann.note.startsWith('[CANVAS]')).map((ann) => {
                const isOpen = ann.status === 'open'
                const isAnnVisible = annotationVisibility[ann._id] !== false
                return (
                  <div
                    key={ann._id}
                    className={`p-3 rounded-xl border leading-normal space-y-2 relative transition-all ${!isAnnVisible ? 'opacity-40 border-neutral-900 bg-neutral-950/20' :
                        isOpen ? 'border-red-950 bg-red-950/20' : 'border-neutral-900 bg-neutral-900/30 opacity-60'
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${!isAnnVisible ? 'text-neutral-600' :
                          isOpen ? 'text-red-400' : 'text-neutral-500'
                        }`}>
                        {isOpen ? 'Open Correction' : 'Resolved'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="grid size-4 place-items-center rounded text-neutral-500 hover:text-white hover:bg-neutral-800 transition-all cursor-pointer border-none bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAnnotationVisibility(prev => ({
                              ...prev,
                              [ann._id]: prev[ann._id] === false
                            }))
                          }}
                          title={isAnnVisible ? "Hide pin on canvas" : "Show pin on canvas"}
                        >
                          {isAnnVisible ? <Eye className="size-2.5 text-neutral-400" /> : <EyeOff className="size-2.5 text-neutral-600" />}
                        </button>
                        {isOpen && (
                          <button
                            type="button"
                            className="grid size-4 place-items-center rounded text-neutral-500 hover:text-emerald-400 hover:bg-neutral-800 transition-all cursor-pointer border-none bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleResolveAnnotation(ann._id)
                            }}
                            title="Resolve pin"
                          >
                            <CheckCircle className="size-2.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="grid size-4 place-items-center rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-all cursor-pointer border-none bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to delete this feedback pin?')) {
                              handleDeleteAnnotation(ann._id)
                            }
                          }}
                          title="Delete pin"
                        >
                          <Trash2 className="size-2.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10px] text-neutral-300 leading-normal break-words">{ann.note}</p>

                    <div className="flex items-center justify-between gap-1.5 text-[8px] text-neutral-500">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="size-2.5 shrink-0" />
                        <span>{ann.authorId?.displayName || 'Tantou Editor'}</span>
                      </div>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Add Annotation Pin popover dialog ────────────── */}
      {showAddModal && activeClickCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-neutral-950 border border-neutral-850 p-5 shadow-2xl space-y-4">
            <div>
              <div className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-red-500 mb-1">
                <Sparkles className="size-3" />
                <span>Place Correction Marker Pin</span>
              </div>
              <h3 className="text-sm font-semibold text-white">
                Add Annotation Note
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Placed at percentage coordinates ({Math.round(activeClickCoords.x)}%, {Math.round(activeClickCoords.y)}%) of the manuscript page.
              </p>
            </div>

            <textarea
              className="w-full min-h-24 rounded-xl border border-neutral-800 p-3 text-xs outline-none bg-neutral-900 text-white focus:border-neutral-700 transition-all shadow-xs"
              placeholder="Describe what needs to be changed (e.g. Character eye is looking the wrong way, SFX needs a larger outline, improve background lines...)"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />

            <div className="rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-2">
              <p className="text-[10px] text-amber-400 leading-normal">
                {t('studio.reviewWarning', '⚠️ This feedback pin will only be visible to the Mangaka after you REJECT the manuscript from the Editor Portal. If you Approve, this pin will remain hidden.')}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setActiveClickCoords(null) }}
                disabled={submittingPin}
                className="rounded-xl px-4 py-2 text-xs font-semibold border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 disabled:opacity-50 transition-colors bg-transparent cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={!noteInput.trim() || submittingPin}
                className="rounded-xl px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white disabled:opacity-50 transition-colors border-none cursor-pointer"
              >
                {submittingPin ? 'Saving...' : 'Place Pin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Advanced Drawing Canvas Overlay ────────────── */}
      {showCanvas && chapter && pages.length > 0 && (
        <DraftReviewCanvas
          pages={pages}
          annotations={draftAnnotations}
          onAnnotationsChange={handleDraftAnnotationsChange}
          onClose={() => setShowCanvas(false)}
          seriesTitle="Series Review"
          chapterTitle={chapter.title}
        />
      )}
    </div>
  )
}
