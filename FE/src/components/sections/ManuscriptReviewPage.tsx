/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef, type MouseEvent, } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { pagesAPI, annotationsAPI, chaptersAPI, seriesAPI, ebAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'
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
  Trash2,
  BookOpen,
  Gavel,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  X,
} from 'lucide-react'
import { DraftReviewCanvas, type AnnotationData as DraftAnnotationData } from './DraftReviewCanvas'

const DEFAULT_CRITERIA = [
  { key: 'artStyle', label: 'Art Style' },
  { key: 'storytelling', label: 'Storytelling' },
  { key: 'characterDesign', label: 'Character Design' },
  { key: 'pacing', label: 'Pacing & Layout' },
  { key: 'commercialPotential', label: 'Commercial Potential' }
]

interface PageData {
  _id: string
  pageNumber: number
  originalImage: string
  processedImage?: string
  compositeImage?: string
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
  seriesId?: string
  status: 'Draft' | 'Reviewing' | 'Approved' | 'Published'
}

interface SeriesReviewData {
  _id: string
  title: string
  description?: string
  genre?: string[] | string
  coverImage?: string
  status?: string
  publicationSchedule?: string
  rejectionNotes?: string
  mangakaId?: { _id: string; displayName: string; avatar?: string }
}

interface EbMeetingInfo {
  _id: string
  title: string
  isParticipant: boolean
  votesCount: number
  participantsCount: number
}

interface EbMemberVote {
  member?: { _id: string; displayName: string } | string
  comments?: string
}

interface EbSeriesInfo {
  _id: string
  userVote?: string | null
  userVoteRubric?: {
    artStyle?: number
    storytelling?: number
    characterDesign?: number
    pacing?: number
    commercialPotential?: number
  } | null
  memberVotes?: EbMemberVote[]
  meeting?: EbMeetingInfo | null
}

export function ManuscriptReviewPage() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()

  const [chapter, setChapter] = useState<ChapterReviewData | null>(null)
  const [series, setSeries] = useState<SeriesReviewData | null>(null)
  const [showSeriesDetails, setShowSeriesDetails] = useState(false)
  const [pages, setPages] = useState<PageData[]>([])
  const [currentPageIdx, setCurrentPageIdx] = useState(0)
  const [annotations, setAnnotations] = useState<AnnotationData[]>([])
  const [loading, setLoading] = useState(true)
  const [showFeedbackPins, setShowFeedbackPins] = useState(true)
  const [annotationVisibility, setAnnotationVisibility] = useState<Record<string, boolean>>({})
  const [showOriginal, setShowOriginal] = useState(false)

  // Draft Canvas
  const [showCanvas, setShowCanvas] = useState(false)
  const [draftAnnotations, setDraftAnnotations] = useState<DraftAnnotationData[]>([])

  // Interactive Pin Placement states
  const [showAddModal, setShowAddModal] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [activeClickCoords, setActiveClickCoords] = useState<{ x: number; y: number } | null>(null)
  const [submittingPin, setSubmittingPin] = useState(false)
  const [submittingAction, setSubmittingAction] = useState(false)

  // Editorial Board Rubric States
  const [ebSeriesInfo, setEbSeriesInfo] = useState<EbSeriesInfo | null>(null)
  const [activeTemplate, setActiveTemplate] = useState<any>(null)
  const [rubricScores, setRubricScores] = useState<Record<string, number>>({})
  const [voteComments, setVoteComments] = useState('')
  const [submittingVote, setSubmittingVote] = useState(false)

  const handleVote = async (seriesId: string, decision: 'approved' | 'rejected') => {
    setSubmittingVote(true)
    try {
      await ebAPI.castVote(seriesId, {
        decision,
        comments: voteComments,
        rubric: rubricScores,
      })
      alert('Vote submitted successfully!')
      const ebPendingRes = await ebAPI.getPending()
      const matched = ebPendingRes.data.series?.find((s: EbSeriesInfo) => s._id === seriesId)
      if (matched) {
        setEbSeriesInfo(matched)
      }
    } catch (err) {
      console.error('Failed to cast vote:', err)
      alert('Failed to cast vote')
    } finally {
      setSubmittingVote(false)
    }
  }

  const handleApproveChapter = async () => {
    if (!chapter?._id) return
    setSubmittingAction(true)
    try {
      await chaptersAPI.updateStatus(chapter._id, 'Approved')
      alert('Chapter approved successfully!')
      navigate('/editor')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to approve chapter')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleRejectChapter = async () => {
    if (!chapter?._id) return
    if (!window.confirm('Are you sure you want to request revisions for this chapter? It will be sent back to the Mangaka as a Draft.')) return
    setSubmittingAction(true)
    try {
      await chaptersAPI.updateStatus(chapter._id, 'Draft')
      alert('Chapter revision requested successfully!')
      navigate('/editor')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to request revisions')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handlePublishChapter = async () => {
    if (!chapter?._id) return
    setSubmittingAction(true)
    try {
      await chaptersAPI.updateStatus(chapter._id, 'Published')
      alert(t('studio.publishSuccess', 'Chapter published successfully!'))
      navigate('/editor')
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to publish chapter')
    } finally {
      setSubmittingAction(false)
    }
  }

  const handleUnpublishChapter = async () => {
    if (!chapter?._id) return
    if (!window.confirm(t('studio.unpublishConfirm', 'Withdraw this chapter from readers while preserving its approved state?'))) return

    setSubmittingAction(true)
    try {
      await chaptersAPI.updateStatus(chapter._id, 'Approved')
      alert(t('studio.unpublishSuccess', 'Chapter withdrawn successfully. It remains approved and can be republished.'))
      if (user?.role?.toLowerCase() === 'editorial_board') {
        navigate('/editorial-board')
      } else {
        navigate('/editor')
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || 'Failed to unpublish chapter')
    } finally {
      setSubmittingAction(false)
    }
  }

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
    ]).then(async ([chapterRes, pagesRes, annRes]) => {
      if (chapterRes?.data?.chapter) {
        const ch = chapterRes.data.chapter
        setChapter(ch)

        // Fetch series details
        if (ch.seriesId) {
          try {
            const seriesRes = await seriesAPI.getById(ch.seriesId)
            setSeries(seriesRes.data.series || null)
          } catch (err) {
            console.error('Failed to load series details in review page:', err)
          }

          if (user?.role?.toLowerCase() === 'editorial_board') {
            try {
              const ebPendingRes = await ebAPI.getPending()
              const matched = ebPendingRes.data.series?.find((s: EbSeriesInfo) => s._id === ch.seriesId)
              if (matched) {
                setEbSeriesInfo(matched)
                const activeTpl = (matched as any).rubricTemplate || ebPendingRes.data.activeTemplate
                setActiveTemplate(activeTpl || null)

                const initialScores: Record<string, number> = {}
                const criteria = activeTpl ? activeTpl.criteria : DEFAULT_CRITERIA
                criteria.forEach((c: any) => {
                  initialScores[c.key] = matched.userVoteRubric?.[c.key] || 5
                })
                setRubricScores(initialScores)

                if (matched.userVote) {
                  const myVoteComment = matched.memberVotes?.find((mv: EbMemberVote) => {
                    const memberId = typeof mv.member === 'object' ? mv.member?._id : mv.member;
                    return memberId === user?._id;
                  })?.comments;
                  setVoteComments(myVoteComment || '');
                }
              }
            } catch (err) {
              console.error('Failed to load EB series info in review page:', err)
            }
          }
        }
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
  }, [chapterId, user?._id, user?.role])

  // Load annotations
  const refreshAnnotations = async () => {
    if (!chapterId) return
    try {
      const res = await annotationsAPI.getByChapter(chapterId)
      setAnnotations(res.data.annotations || [])

      // Parse canvas annotations
      const parsedAnns: DraftAnnotationData[] = []
        ; (res.data.annotations || []).forEach((a: AnnotationData) => {
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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#0B0D16] text-[#E2E8F0] antialiased">
      {/* ── Top Audit Toolbar ────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-[#0E111E]/90 backdrop-blur-md px-6 py-3.5 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (user?.role?.toLowerCase() === 'editorial_board') {
                navigate('/editorial-board')
              } else {
                navigate('/editor')
              }
            }}
            className="size-9 p-0 rounded-xl flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.06] hover:scale-105 active:scale-95 transition-all border border-white/[0.04] bg-transparent cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded-md">Manuscript Review</span>
              {chapter && (
                <Badge className="bg-white/10 text-white border-none py-0 px-2 h-4 text-[9px] font-semibold uppercase rounded-md">
                  Ch. {chapter.chapterNumber}
                </Badge>
              )}
            </div>
            <h1 className="text-sm font-semibold truncate leading-tight mt-0.5 text-white">
              {chapter ? chapter.title : 'Manuscript Audit workbench'}
            </h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {series && (
            <button
              onClick={() => setShowSeriesDetails(!showSeriesDetails)}
              className={`h-8 px-3.5 text-xs font-semibold border rounded-xl flex items-center gap-2 transition-all duration-300 hover:scale-102 active:scale-98 cursor-pointer bg-transparent ${showSeriesDetails
                  ? 'border-indigo-500/50 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.2)]'
                  : 'border-white/[0.08] text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                }`}
            >
              <BookOpen className="size-3.5" />
              <span>{showSeriesDetails ? 'Hide Details' : 'Series Details'}</span>
            </button>
          )}
          {user?.role?.toLowerCase() === 'editor' && chapter && chapter.status === 'Reviewing' && (
            <>
              <button
                onClick={handleApproveChapter}
                disabled={submittingAction}
                className="h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-102 active:scale-98 rounded-xl flex items-center gap-1.5 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                <CheckCircle className="size-3.5" />
                <span>{t('editor.approve', 'Approve')}</span>
              </button>
              <button
                onClick={handleRejectChapter}
                disabled={submittingAction}
                className="h-8 px-3.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white hover:scale-102 active:scale-98 rounded-xl flex items-center gap-1.5 transition-all border-none cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="size-3.5" />
                <span>{t('editor.reject', 'Reject')}</span>
              </button>
            </>
          )}
          {user?.role?.toLowerCase() === 'editor' && chapter?.status === 'Approved' && (
            <button
              onClick={handlePublishChapter}
              disabled={submittingAction}
              className="h-8 px-3.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-102 active:scale-98 rounded-xl flex items-center gap-1.5 transition-all border-none cursor-pointer disabled:opacity-50"
            >
              <CheckCircle className="size-3.5" />
              <span>{t('studio.publish', 'Publish')}</span>
            </button>
          )}
          {chapter?.status === 'Published' && (user?.role?.toLowerCase() === 'editor' || user?.isEbHead) && (
            <button
              onClick={handleUnpublishChapter}
              disabled={submittingAction}
              className="h-8 px-3.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white hover:scale-102 active:scale-98 rounded-xl flex items-center gap-1.5 transition-all border-none cursor-pointer disabled:opacity-50"
            >
              <AlertTriangle className="size-3.5" />
              <span>{t('studio.unpublish', 'Unpublish')}</span>
            </button>
          )}
          <button
            onClick={() => setShowCanvas(true)}
            className="h-8 px-3.5 text-xs font-semibold border border-white/[0.08] text-neutral-300 hover:text-white hover:bg-white/[0.06] hover:scale-102 active:scale-98 rounded-xl flex items-center gap-2 transition-all bg-transparent cursor-pointer"
          >
            <PenTool className="size-3.5" />
            <span>Draw on Canvas</span>
          </button>

          {currentPage?.compositeImage && (
            <div className="flex items-center gap-1 bg-[#131627] border border-white/[0.05] p-0.5 rounded-xl ml-2">
              <button
                type="button"
                onClick={() => setShowOriginal(false)}
                className={`h-7 px-3 text-[10px] font-bold rounded-lg border-none cursor-pointer transition-colors ${
                  !showOriginal
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white bg-transparent'
                }`}
              >
                Composite
              </button>
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                className={`h-7 px-3 text-[10px] font-bold rounded-lg border-none cursor-pointer transition-colors ${
                  showOriginal
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-neutral-400 hover:text-white bg-transparent'
                }`}
              >
                Original
              </button>
            </div>
          )}

          {/* Page navigation */}
          <div className="flex items-center gap-1 bg-[#131627] border border-white/[0.05] p-0.5 rounded-xl ml-2">
            <button
              onClick={() => setCurrentPageIdx(Math.max(0, currentPageIdx - 1))}
              disabled={currentPageIdx === 0}
              className="size-7 p-0 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:pointer-events-none transition-all border-none bg-transparent cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-xs font-semibold select-none text-neutral-300 px-2 min-w-20 text-center">
              {pages.length > 0 ? `Page ${currentPageIdx + 1} / ${pages.length}` : 'No Pages'}
            </span>
            <button
              onClick={() => setCurrentPageIdx(Math.min(pages.length - 1, currentPageIdx + 1))}
              disabled={currentPageIdx >= pages.length - 1}
              className="size-7 p-0 rounded-lg flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-25 disabled:pointer-events-none transition-all border-none bg-transparent cursor-pointer"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden lg:flex items-center gap-1.5 text-[10px] text-neutral-400">
          <HelpCircle className="size-3.5 text-indigo-400" />
          <span>Click anywhere on manuscript to place correction pin.</span>
        </div>
      </div>

      {/* ── Main Workspace Panel ─────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Thumbnails List Sidebar */}
        <div className="w-56 shrink-0 border-r border-white/[0.06] bg-[#0E111F]/70 backdrop-blur-md flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/[0.06] bg-[#0E111F]/40">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Page List</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {pages.map((p, idx) => {
              const isActive = idx === currentPageIdx
              const pageAnnsCount = annotations.filter(ann => ann.pageId === p._id && ann.status === 'open').length

              return (
                <button
                  key={p._id}
                  onClick={() => setCurrentPageIdx(idx)}
                  className={`w-full text-left rounded-2xl overflow-hidden border transition-all duration-300 flex flex-col relative group ${isActive
                      ? 'border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/5'
                      : 'border-white/[0.06] bg-[#141829]/50 hover:border-white/20 hover:scale-[1.02]'
                    }`}
                >
                  <div className="aspect-[3/4] w-full relative overflow-hidden bg-[#07090F] flex items-center justify-center">
                    <img
                      src={mediaUrl(p.compositeImage || p.processedImage || p.originalImage)}
                      alt={`Page ${idx + 1}`}
                      className={`h-full w-full object-cover transition-opacity duration-300 ${isActive ? 'opacity-85' : 'opacity-50 group-hover:opacity-70'}`}
                    />
                    <span className="absolute left-2.5 top-2.5 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-0.5 text-[9px] font-bold text-white border border-white/[0.05]">
                      Page {p.pageNumber}
                    </span>

                    {pageAnnsCount > 0 && (
                      <span className="absolute right-2.5 top-2.5 bg-gradient-to-r from-rose-600 to-red-500 rounded-full h-5 min-w-5 flex items-center justify-center text-[9px] font-bold px-1 ring-2 ring-[#0B0D16] animate-pulse text-white shadow-md">
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
        <div className="flex-1 relative overflow-auto bg-[#07090F] p-8 flex items-start justify-center">
          {loading ? (
            <div className="flex flex-col items-center gap-3 m-auto">
              <div className="size-9 animate-spin rounded-full border-4 border-white/10 border-t-indigo-500" />
              <span className="text-xs text-neutral-400">Loading drawing canvas...</span>
            </div>
          ) : currentPage ? (
            <div
              ref={imageContainerRef}
              onClick={handleImageClick}
              className="relative shrink-0 bg-white rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] cursor-crosshair border border-white/[0.08] select-none transition-all duration-300 hover:shadow-indigo-500/[0.02] hover:border-white/[0.12]"
            >


              <img
                src={mediaUrl(
                  currentPage.compositeImage
                    ? (showOriginal ? currentPage.originalImage : currentPage.compositeImage)
                    : (currentPage.processedImage || currentPage.originalImage)
                )}
                alt={`Page ${currentPage.pageNumber}`}
                className="block rounded-2xl max-h-[80vh] pointer-events-none"
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
                    className={`absolute -translate-x-1/2 -translate-y-1/2 group size-6 flex items-center justify-center transition-all ${isOpen ? 'z-20' : 'z-10'}`}
                  >
                    {/* Pulsing visual core */}
                    {isOpen ? (
                      <>
                        <span className="absolute size-4.5 bg-rose-500/40 rounded-full animate-ping" />
                        <span className="absolute size-3 bg-rose-600 border-2 border-white rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] cursor-pointer hover:scale-125 transition-transform" />
                      </>
                    ) : (
                      <span className="absolute size-3 bg-neutral-600 border border-neutral-300 rounded-full opacity-65 cursor-pointer hover:scale-125 transition-transform" />
                    )}

                    {/* Hover tooltip displaying correction content */}
                    <div className="absolute bottom-full pb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-30 w-56 text-left select-text">
                      <div className="bg-[#0E111E]/95 backdrop-blur-md border border-white/10 p-3.5 rounded-2xl shadow-2xl space-y-2">
                        <div className="flex items-center justify-between gap-1 text-[8px] font-bold uppercase tracking-wider text-rose-400">
                          <div className="flex items-center gap-1.5">
                            <Pin className="size-2.5 shrink-0" />
                            <span>{isOpen ? 'Correction Note' : 'Resolved'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isOpen && (
                              <button
                                type="button"
                                onClick={() => handleResolveAnnotation(ann._id)}
                                className="p-1 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-emerald-400 transition-colors border-none bg-transparent cursor-pointer"
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
                              className="p-1 rounded-md hover:bg-white/[0.08] text-neutral-400 hover:text-red-400 transition-colors border-none bg-transparent cursor-pointer"
                              title="Delete Pin"
                            >
                              <Trash2 className="size-3" />
                            </button>
                          </div>
                        </div>
                        <p className="text-[10.5px] leading-normal text-white break-words whitespace-pre-wrap">{ann.note}</p>

                        <div className="flex items-center gap-1.5 mt-2 border-t border-white/[0.06] pt-1.5 text-[8px] text-neutral-400">
                          <span className="font-semibold text-neutral-300">{ann.authorId?.displayName || 'Tantou Editor'}</span>
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

        {/* Right Panel: Feedback & Corrections */}
        <div className="w-72 shrink-0 border-l border-white/[0.06] bg-[#0E111F]/70 backdrop-blur-md flex flex-col overflow-hidden">
          {/* Series & Chapter Details Panel */}
          {series && showSeriesDetails && (
            <div className="border-b border-white/[0.06] p-4 space-y-3.5 bg-[#0E111F]/30 text-xs shrink-0 select-text overflow-y-auto max-h-[45%]">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                  <BookOpen className="size-3" />
                  Series Details
                </span>
                <button
                  onClick={() => setShowSeriesDetails(false)}
                  className="text-neutral-400 hover:text-white text-xs bg-transparent border-none cursor-pointer p-0.5 rounded hover:bg-white/[0.05]"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              {series.coverImage && (
                <img
                  src={mediaUrl(series.coverImage)}
                  alt={series.title}
                  className="w-full h-32 object-cover rounded-xl border border-white/[0.08]"
                />
              )}

              <div>
                <h4 className="font-bold text-white text-sm leading-snug">{series.title}</h4>
                <p className="text-[10px] text-neutral-400 mt-0.5">by {series.mangakaId?.displayName || 'Unknown'}</p>
              </div>

              {series.description && (
                <p className="text-[10px] leading-relaxed text-neutral-300 max-h-24 overflow-y-auto pr-1">
                  {series.description}
                </p>
              )}

              <div className="flex flex-wrap gap-1">
                {series.genre && (Array.isArray(series.genre) ? series.genre : String(series.genre).split(',')).map((g: string) => {
                  const cleaned = g.trim().replaceAll('[', '').replaceAll(']', '').replaceAll('"', '')
                  if (!cleaned) return null
                  return (
                    <span key={cleaned} className="bg-white/[0.06] border border-white/[0.05] text-neutral-200 text-[8px] px-1.5 py-0.5 rounded-md font-semibold">
                      {cleaned}
                    </span>
                  )
                })}
              </div>

              <div className="border-t border-white/[0.06] pt-2.5 space-y-1.5 text-[10px] text-neutral-400">
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className="font-semibold text-white">{series.status}</span>
                </div>
                {series.publicationSchedule && (
                  <div className="flex justify-between">
                    <span>Schedule:</span>
                    <span className="font-semibold text-white capitalize">{series.publicationSchedule}</span>
                  </div>
                )}
                {series.rejectionNotes && (
                  <div className="bg-red-950/20 border border-red-500/20 rounded-xl p-2.5 mt-2 text-[9px] text-red-300 leading-normal">
                    <strong className="text-red-400 font-bold block mb-0.5">Rejection Notes:</strong>
                    {series.rejectionNotes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Editorial Board Rubric Scoring */}
          {user?.role?.toLowerCase() === 'editorial_board' && ebSeriesInfo && (
            <div className="border-b border-white/[0.06] p-4 space-y-3 bg-[#131627]/60 text-xs shrink-0 select-text overflow-y-auto max-h-[50%]">
              <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                <Gavel className="size-3" />
                {t('editorialBoard.title', 'Editorial Evaluation')}
              </span>

              {(() => {
                const canVote = ebSeriesInfo.meeting && ebSeriesInfo.meeting.isParticipant;
                return (
                  <>
                    {!ebSeriesInfo.meeting ? (
                      <div className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl text-center font-medium my-2 leading-normal flex items-center justify-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                        <span>Awaiting scheduled review meeting before voting can start.</span>
                      </div>
                    ) : !ebSeriesInfo.meeting.isParticipant ? (
                      <div className="text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-xl text-center font-medium my-2 leading-normal flex items-center justify-center gap-1.5">
                        <AlertTriangle className="size-3.5 text-rose-450 shrink-0" />
                        <span>Only meeting participants are allowed to vote.</span>
                      </div>
                    ) : null}

                    <div className="space-y-2.5 mt-2">
                      {(activeTemplate?.criteria || DEFAULT_CRITERIA).map((c: any) => {
                        const score = rubricScores[c.key] ?? 5
                        return (
                          <div key={c.key} className="space-y-1">
                            <div className="flex justify-between text-[10px] text-neutral-300">
                              <span>{c.label}</span>
                              <span className="font-bold text-indigo-400">{score}/10</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={score}
                              onChange={(e) => {
                                const val = parseInt(e.target.value)
                                setRubricScores((prev) => ({ ...prev, [c.key]: val }))
                              }}
                              disabled={!canVote}
                              className="w-full accent-indigo-500 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none disabled:opacity-40"
                            />
                          </div>
                        )
                      })}
                    </div>

                    <textarea
                      value={voteComments}
                      onChange={(e) => setVoteComments(e.target.value)}
                      placeholder={canVote ? "Evaluation comments..." : "Voting is view-only."}
                      disabled={!canVote}
                      className="w-full mt-2 min-h-12 rounded-xl border border-white/[0.08] p-2.5 text-xs outline-none bg-[#171B2F] text-white focus:border-indigo-500 transition-all disabled:opacity-50"
                    />

                    {/* Dynamic Auto-decision & Submit */}
                    {(() => {
                      const criteria = activeTemplate?.criteria || DEFAULT_CRITERIA
                      let sum = 0
                      criteria.forEach((c: any) => {
                        sum += rubricScores[c.key] ?? 5
                      })
                      const currentAverage = criteria.length > 0 ? sum / criteria.length : 5
                      const autoDecision = currentAverage >= 5 ? 'approved' : 'rejected'

                      return (
                        <div className="space-y-2 mt-2 pt-2 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400">Avg: <strong className="text-white">{currentAverage.toFixed(1)}/10</strong></span>
                            <span className="flex items-center gap-1">
                              <span className="text-neutral-500 text-[8px] uppercase font-bold">Decision:</span>
                              {autoDecision === 'approved' ? (
                                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Approve</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">Reject</span>
                              )}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={submittingVote || !canVote}
                            onClick={() => handleVote(ebSeriesInfo._id, autoDecision)}
                            className={`w-full py-2 px-3 text-xs font-semibold rounded-xl text-white transition-all border-none cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 ${autoDecision === 'approved'
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/20'
                                : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-rose-500 shadow-md shadow-rose-950/20'
                              }`}
                          >
                            {submittingVote ? (
                              <div className="size-3.5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                            ) : autoDecision === 'approved' ? (
                              <ThumbsUp className="size-3.5" />
                            ) : (
                              <ThumbsDown className="size-3.5" />
                            )}
                            <span>
                              {ebSeriesInfo.userVote
                                ? 'Update Evaluation Vote'
                                : 'Submit Evaluation Vote'
                              }
                            </span>
                          </button>
                          {ebSeriesInfo.userVote && (
                            <div className="text-center text-[9px] text-neutral-400">
                              You voted: <strong className={ebSeriesInfo.userVote === 'approved' ? 'text-emerald-400' : 'text-rose-400'}>{ebSeriesInfo.userVote.toUpperCase()}</strong>
                            </div>
                          )}

                          {ebSeriesInfo.meeting && (
                            <div className="mt-2 bg-white/[0.02] border border-white/[0.05] p-2 rounded-xl text-[9px] text-left leading-normal space-y-0.5">
                              <div className="text-neutral-300 font-semibold truncate">Meeting: {ebSeriesInfo.meeting.title}</div>
                              <div className="text-neutral-400">Votes Cast: {ebSeriesInfo.meeting.votesCount} / {ebSeriesInfo.meeting.participantsCount} ({Math.round((ebSeriesInfo.meeting.votesCount / ebSeriesInfo.meeting.participantsCount) * 100)}%)</div>
                            </div>
                          )}
                        </div>
                      )
                    })()}
                  </>
                );
              })()}
            </div>
          )}

          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-[#0E111F]/40">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Active Corrections</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowFeedbackPins(!showFeedbackPins)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-white/[0.08] text-[9px] font-semibold text-neutral-400 hover:bg-white/[0.05] hover:text-white transition-all bg-transparent cursor-pointer"
                title={showFeedbackPins ? "Hide all pins on canvas" : "Show all pins on canvas"}
              >
                {showFeedbackPins ? <Eye className="size-3 text-neutral-300" /> : <EyeOff className="size-3 text-neutral-500" />}
                <span>{showFeedbackPins ? t('common.visible', 'Visible') : t('common.hidden', 'Hidden')}</span>
              </button>
              <Badge variant="secondary" className="bg-rose-500/10 text-rose-400 border border-rose-500/10 px-2 py-0 h-5 text-[9px] rounded-lg">
                {pageAnnotations.filter(ann => ann.status === 'open' && !ann.note.startsWith('[CANVAS]')).length} Pins
              </Badge>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {pageAnnotations.filter(ann => !ann.note.startsWith('[CANVAS]')).length === 0 ? (
              <div className="text-center py-14 space-y-2.5">
                <div className="grid size-11 place-items-center rounded-2xl bg-white/[0.04] border border-white/[0.04] mx-auto text-emerald-400 shadow-sm">
                  <CheckCircle className="size-4.5" />
                </div>
                <p className="text-[11px] font-semibold text-neutral-300">Clean Slate!</p>
                <p className="text-[9px] text-neutral-500 max-w-[150px] mx-auto leading-normal">
                  No open correction annotations placed on this page yet.
                </p>
              </div>
            ) : (
              pageAnnotations.filter(ann => !ann.note.startsWith('[CANVAS]')).map((ann) => {
                const isOpen = ann.status === 'open'
                const isAnnVisible = annotationVisibility[ann._id] !== false
                return (
                  <div
                    key={ann._id}
                    className={`p-3.5 rounded-2xl border leading-normal space-y-2 relative transition-all duration-300 hover:shadow-md ${!isAnnVisible
                        ? 'opacity-35 border-white/[0.02] bg-[#0E111F]/10'
                        : isOpen
                          ? 'border-rose-500/25 bg-gradient-to-r from-rose-500/[0.06] via-rose-500/[0.02] to-transparent shadow-[inset_0_1px_1px_rgba(244,63,94,0.05)]'
                          : 'border-white/[0.06] bg-white/[0.02] opacity-65'
                      }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[8px] font-bold uppercase tracking-wider ${!isAnnVisible
                          ? 'text-neutral-500'
                          : isOpen
                            ? 'text-rose-400'
                            : 'text-neutral-400'
                        }`}>
                        {isOpen ? 'Open Correction' : 'Resolved'}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          className="grid size-5 place-items-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer border-none bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            setAnnotationVisibility(prev => ({
                              ...prev,
                              [ann._id]: prev[ann._id] === false
                            }))
                          }}
                          title={isAnnVisible ? "Hide pin on canvas" : "Show pin on canvas"}
                        >
                          {isAnnVisible ? <Eye className="size-3 text-neutral-300" /> : <EyeOff className="size-3 text-neutral-500" />}
                        </button>
                        {isOpen && (
                          <button
                            type="button"
                            className="grid size-5 place-items-center rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-white/[0.06] transition-all cursor-pointer border-none bg-transparent"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleResolveAnnotation(ann._id)
                            }}
                            title="Resolve pin"
                          >
                            <CheckCircle className="size-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="grid size-5 place-items-center rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-white/[0.06] transition-all cursor-pointer border-none bg-transparent"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Are you sure you want to delete this feedback pin?')) {
                              handleDeleteAnnotation(ann._id)
                            }
                          }}
                          title="Delete pin"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    </div>

                    <p className="text-[10.5px] text-neutral-200 leading-normal break-words whitespace-pre-wrap">{ann.note}</p>

                    <div className="flex items-center justify-between gap-1.5 text-[8px] text-neutral-400 border-t border-white/[0.04] pt-2 mt-1">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="size-2.5 text-indigo-400 shrink-0" />
                        <span className="font-semibold text-neutral-300">{ann.authorId?.displayName || 'Tantou Editor'}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-[#0F1221] border border-white/10 p-6 shadow-2xl space-y-4">
            <div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-indigo-400 mb-1 bg-indigo-500/10 px-2 py-0.5 rounded-md w-fit">
                <Sparkles className="size-3" />
                <span>Place Correction Marker Pin</span>
              </div>
              <h3 className="text-base font-semibold text-white">
                Add Annotation Note
              </h3>
              <p className="text-[10px] text-neutral-400 mt-1">
                Placed at percentage coordinates ({Math.round(activeClickCoords.x)}%, {Math.round(activeClickCoords.y)}%) of the manuscript page.
              </p>
            </div>

            <textarea
              className="w-full min-h-24 rounded-2xl border border-white/[0.08] p-3 text-xs outline-none bg-[#171B2F] text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-inner"
              placeholder="Describe what needs to be changed (e.g. Character eye is looking the wrong way, SFX needs a larger outline, improve background lines...)"
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
            />

            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[10px] text-amber-400/90 leading-relaxed font-medium">
                {t('studio.reviewWarning', 'This feedback pin will only be visible to the Mangaka after you REJECT the manuscript from the Editor Portal. If you Approve, this pin will remain hidden.')}
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => { setShowAddModal(false); setActiveClickCoords(null) }}
                disabled={submittingPin}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold border border-white/[0.08] text-neutral-400 hover:text-white hover:bg-white/[0.05] disabled:opacity-50 transition-all bg-transparent cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                disabled={!noteInput.trim() || submittingPin}
                className="rounded-xl px-4 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all border-none cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98"
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
