import { useEffect, useMemo, useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { Plus, RefreshCw, Sparkles, Users } from 'lucide-react'
import { Button, Tabs } from '../ui'
import { seriesAPI, chaptersAPI, authAPI } from '../../lib/api'
import { useAuth } from '../../lib/auth'

import {
  type SeriesData,
  type ChapterData,
  type UserData,
  type DedicatedAssistantData,
} from './series-manager/utils'
import { SeriesListPanel } from './series-manager/SeriesListPanel'
import { SeriesDetailPanel } from './series-manager/SeriesDetailPanel'
import { SeriesFormDrawer } from './series-manager/SeriesFormDrawer'
import { ChapterFormDrawer } from './series-manager/ChapterFormDrawer'
import { EditorSubmitModal } from './series-manager/EditorSubmitModal'
import { AssistantsPanel } from './series-manager/AssistantsPanel'

export function MangakaSeriesManagerPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const isMountedRef = useRef(true)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // State Management
  const [seriesList, setSeriesList] = useState<SeriesData[]>([])
  const [chapters, setChapters] = useState<ChapterData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Derived state from URL search params (Single Source of Truth)
  const selectedSeriesId = searchParams.get('seriesId') || (seriesList[0]?._id || '')
  const tab = searchParams.get('tab') || 'series'

  // Submit Editor Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitSeriesId, setSubmitSeriesId] = useState('')

  // Drawers trigger
  const [isSeriesDrawerOpen, setIsSeriesDrawerOpen] = useState(false)
  const [editingSeries, setEditingSeries] = useState<SeriesData | null>(null)
  
  const [isChapterDrawerOpen, setIsChapterDrawerOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<ChapterData | null>(null)

  // Dedicated Assistant Management
  const [dedicatedAssistants, setDedicatedAssistants] = useState<DedicatedAssistantData[]>([])
  const [assistantSearchQuery, setAssistantSearchQuery] = useState('')
  const [assistantSearchResults, setAssistantSearchResults] = useState<UserData[]>([])
  const [addingAssistant, setAddingAssistant] = useState(false)
  const [loadingAssistants, setLoadingAssistants] = useState(false)

  const handleSelectSeries = (id: string) => {
    setSearchParams(
      (prev) => {
        if (id) prev.set('seriesId', id)
        else prev.delete('seriesId')
        return prev
      },
      { replace: true }
    )
  }

  const handleTabChange = (key: string) => {
    setSearchParams(
      (prev) => {
        if (key) prev.set('tab', key)
        else prev.delete('tab')
        return prev
      },
      { replace: true }
    )
  }

  const selectedSeries = useMemo(() => {
    return seriesList.find((s) => s._id === selectedSeriesId) || null
  }, [seriesList, selectedSeriesId])

  const selectedChapters = useMemo(() => {
    return chapters.filter((chapter) => {
      const sId =
        chapter.seriesId && typeof chapter.seriesId === 'object'
          ? (chapter.seriesId as { _id: string })._id
          : chapter.seriesId
      return String(sId) === String(selectedSeriesId)
    })
  }, [chapters, selectedSeriesId])

  const nextChapterNumber = useMemo(() => {
    return selectedChapters.length > 0 ? Math.max(...selectedChapters.map((c) => c.chapterNumber || 0)) + 1 : 1
  }, [selectedChapters])

  // Data Fetching
  const loadData = async (preferredSeriesId?: string) => {
    setLoading(true)
    try {
      const res = await seriesAPI.getAll()
      if (!isMountedRef.current) return
      
      const list = (res.data.series || []).filter((s: SeriesData) => {
        const mId = s.mangakaId && typeof s.mangakaId === 'object' ? s.mangakaId._id : s.mangakaId
        return String(mId) === String(user?._id)
      })
      setSeriesList(list)

      const urlSeriesId = searchParams.get('seriesId')
      const nextSeriesId =
        preferredSeriesId && list.some((s: SeriesData) => s._id === preferredSeriesId)
          ? preferredSeriesId
          : urlSeriesId && list.some((s: SeriesData) => s._id === urlSeriesId)
          ? urlSeriesId
          : list[0]?._id || ''

      if (nextSeriesId && urlSeriesId !== nextSeriesId) {
        setSearchParams(
          (prev) => {
            prev.set('seriesId', nextSeriesId)
            return prev
          },
          { replace: true }
        )
      }

      if (nextSeriesId) {
        const chapterRes = await chaptersAPI.getBySeries(nextSeriesId)
        if (!isMountedRef.current) return
        setChapters(chapterRes.data.chapters || [])
      } else {
        setChapters([])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    if (user?._id) {
      Promise.resolve().then(() => {
        loadData().catch(() => {})
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id])



  // Load chapters on series switch
  useEffect(() => {
    if (!selectedSeriesId) return
    chaptersAPI
      .getBySeries(selectedSeriesId)
      .then((res) => {
        if (isMountedRef.current) {
          setChapters(res.data.chapters || [])
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setChapters([])
        }
      })
  }, [selectedSeriesId])

  // Load dedicated assistants when series changes and is Active
  useEffect(() => {
    if (!selectedSeriesId || selectedSeries?.status !== 'Active') {
      Promise.resolve().then(() => {
        if (isMountedRef.current) {
          setDedicatedAssistants([])
        }
      })
      return
    }
    Promise.resolve().then(() => {
      if (isMountedRef.current) {
        setLoadingAssistants(true)
      }
    })
    seriesAPI
      .getDedicatedAssistants(selectedSeriesId)
      .then((res) => {
        if (isMountedRef.current) {
          setDedicatedAssistants(res.data.dedicatedAssistants || [])
        }
      })
      .catch(() => {
        if (isMountedRef.current) {
          setDedicatedAssistants([])
        }
      })
      .finally(() => {
        if (isMountedRef.current) {
          setLoadingAssistants(false)
        }
      })
  }, [selectedSeriesId, selectedSeries?.status])

  // Form actions: Series
  const handleOpenNewSeries = () => {
    setEditingSeries(null)
    setIsSeriesDrawerOpen(true)
  }

  const handleOpenEditSeries = () => {
    if (!selectedSeries) return
    setEditingSeries(selectedSeries)
    setIsSeriesDrawerOpen(true)
  }

  const handleSaveSeries = async (data: {
    title: string
    description: string
    genre: string
    coverFile: File | null
    coverUrl: string
    script?: string
    scriptFile?: string
    characterDesigns?: {
      name: string
      role: string
      description?: string
      image?: string
    }[]
  }) => {
    setSaving(true)
    try {
      const genreArray = data.genre.split(',').map((g) => g.trim()).filter(Boolean)
      const formData = new FormData()
      formData.append('title', data.title)
      formData.append('description', data.description)
      formData.append('genre', genreArray.join(', '))
      if (data.coverFile) formData.append('coverImageFile', data.coverFile)
      if (data.coverUrl) formData.append('coverImage', data.coverUrl)
      if (data.script !== undefined) formData.append('script', data.script)
      if (data.scriptFile !== undefined) formData.append('scriptFile', data.scriptFile)
      if (data.characterDesigns !== undefined) {
        formData.append('characterDesigns', JSON.stringify(data.characterDesigns))
      }

      if (editingSeries) {
        await seriesAPI.update(editingSeries._id, formData)
        setIsSeriesDrawerOpen(false)
        await loadData(editingSeries._id)
      } else {
        const res = await seriesAPI.create(formData)
        setIsSeriesDrawerOpen(false)
        await loadData(res.data.series?._id)
      }
    } catch (err) {
      console.error(err)
      alert(t('seriesManager.saveFailed', 'Failed to save series details.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSeries = async () => {
    if (!selectedSeriesId) return
    setSaving(true)
    try {
      await seriesAPI.delete(selectedSeriesId)
      handleSelectSeries('')
      await loadData()
    } catch (err) {
      console.error(err)
      alert(t('seriesManager.deleteFailed', 'Failed to delete series.'))
    } finally {
      setSaving(false)
    }
  }

  // Form actions: Chapters
  const handleOpenNewChapter = () => {
    setEditingChapter(null)
    setIsChapterDrawerOpen(true)
  }

  const handleOpenEditChapter = (chapter: ChapterData) => {
    setEditingChapter(chapter)
    setIsChapterDrawerOpen(true)
  }

  const handleSaveChapter = async (data: { chapterNumber: number; title: string }) => {
    if (!selectedSeriesId) return
    setSaving(true)
    try {
      if (editingChapter) {
        await chaptersAPI.update(editingChapter._id, {
          chapterNumber: data.chapterNumber,
          title: data.title,
        })
        setIsChapterDrawerOpen(false)
        await loadData(selectedSeriesId)
      } else {
        await chaptersAPI.create(selectedSeriesId, {
          chapterNumber: data.chapterNumber,
          title: data.title,
        })
        setIsChapterDrawerOpen(false)
        await loadData(selectedSeriesId)
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || t('seriesManager.chapterSaveFailed', 'Failed to save chapter.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteChapter = async (chapterId: string) => {
    setSaving(true)
    try {
      await chaptersAPI.delete(chapterId)
      await loadData(selectedSeriesId)
    } catch (err) {
      console.error(err)
      alert(t('seriesManager.chapterDeleteFailed', 'Failed to delete chapter.'))
    } finally {
      setSaving(false)
    }
  }

  // Assistant management
  const handleSearchAssistants = async (query: string) => {
    setAssistantSearchQuery(query)
    if (query.trim().length < 2) {
      setAssistantSearchResults([])
      return
    }
    try {
      const res = await authAPI.search(query)
      const results = (res.data.users || []).filter((u: UserData) => u.role === 'assistant')
      setAssistantSearchResults(results)
    } catch {
      setAssistantSearchResults([])
    }
  }

  const handleAddDedicatedAssistant = async (userId: string) => {
    if (!selectedSeriesId) return
    setAddingAssistant(true)
    try {
      const res = await seriesAPI.addDedicatedAssistant(selectedSeriesId, userId)
      setDedicatedAssistants(res.data.dedicatedAssistants || [])
      setAssistantSearchQuery('')
      setAssistantSearchResults([])
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || t('seriesManager.addAssistantFailed', 'Failed to add dedicated assistant.'))
    } finally {
      setAddingAssistant(false)
    }
  }

  const handleRemoveDedicatedAssistant = async (userId: string) => {
    if (!selectedSeriesId) return
    try {
      await seriesAPI.removeDedicatedAssistant(selectedSeriesId, userId)
      setDedicatedAssistants((prev) =>
        prev.filter((a) => {
          const aId = typeof a.userId === 'object' && a.userId ? a.userId._id : a.userId
          return aId !== userId
        })
      )
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || t('seriesManager.removeAssistantFailed', 'Failed to remove dedicated assistant.'))
    }
  }

  // Manuscript submission
  const handleOpenSubmitModal = () => {
    if (!selectedSeries) return
    setSubmitSeriesId(selectedSeries._id)
    setShowSubmitModal(true)
  }

  const handleSubmitToEditor = async () => {
    if (!submitSeriesId) return
    setSaving(true)
    try {
      await seriesAPI.submitToEditor(submitSeriesId)
      alert(t('seriesManager.submitSuccess', 'Draft manuscript submitted successfully!'))
      setShowSubmitModal(false)
      await loadData(selectedSeriesId)
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } }
      alert(error.response?.data?.error || t('seriesManager.editorActionFailed', 'Operation failed.'))
    } finally {
      setSaving(false)
    }
  }

  if (loading && seriesList.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-neutral-500 gap-2 font-medium">
        <div className="size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        {t('common.loading', 'Loading...')}
      </div>
    )
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Premium Dashboard Header Card */}
      <div className="rounded-[32px] border border-neutral-200 bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-800 p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-16 -mr-16 size-64 bg-radial from-white/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between relative z-10">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/55 flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              {t('seriesManager.workspaceLabel', 'Mangaka Workspace')}
            </p>
            <h1 className="mt-2.5 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {t('seriesManager.title', 'Series Manager')}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              {t('seriesManager.subtitle', 'Create series, add chapters, and manage your production structure.')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="ghost"
              className="bg-white/10 text-white hover:bg-white/15 border-none h-10 px-4 rounded-xl text-xs font-semibold transition-all"
              onClick={() => loadData().catch(() => {})}
            >
              <RefreshCw className="mr-2 size-4" /> {t('common.refresh', 'Refresh')}
            </Button>
            <Button
              variant="secondary"
              className="bg-white hover:bg-neutral-100 border-none text-neutral-950 h-10 px-4 rounded-xl text-xs font-semibold shadow-md transition-all"
              onClick={handleOpenNewSeries}
            >
              <Plus className="mr-2 size-4" /> {t('seriesManager.newSeries', 'New Series')}
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <Tabs
        tabs={[
          { key: 'series', label: t('seriesManager.seriesTab', 'Series'), count: seriesList.length },
          ...(selectedSeries?.status === 'Active'
            ? [
                {
                  key: 'assistants',
                  label: t('seriesManager.assistantsTab', 'Assistants'),
                  icon: <Users className="size-3.5" />,
                  count: dedicatedAssistants.length,
                },
              ]
            : []),
        ]}
        active={tab}
        onChange={handleTabChange}
      />

      {/* Tab content rendering */}
      {tab === 'series' && (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr] items-start">
          {/* Series list */}
          <SeriesListPanel
            seriesList={seriesList}
            selectedSeriesId={selectedSeriesId}
            onSelectSeries={handleSelectSeries}
            onNewSeriesClick={handleOpenNewSeries}
          />

          {/* Series details */}
          <SeriesDetailPanel
            selectedSeries={selectedSeries}
            selectedChapters={selectedChapters}
            saving={saving}
            onEditSeries={handleOpenEditSeries}
            onDeleteSeries={handleDeleteSeries}
            onSubmitForApprovalClick={handleOpenSubmitModal}
            onNewChapterClick={handleOpenNewChapter}
            onEditChapter={handleOpenEditChapter}
            onDeleteChapter={handleDeleteChapter}
          />
        </div>
      )}

      {tab === 'assistants' && selectedSeries?.status === 'Active' && (
        <AssistantsPanel
          selectedSeriesId={selectedSeriesId}
          selectedSeries={selectedSeries}
          dedicatedAssistants={dedicatedAssistants}
          assistantSearchQuery={assistantSearchQuery}
          assistantSearchResults={assistantSearchResults}
          addingAssistant={addingAssistant}
          loadingAssistants={loadingAssistants}
          onSearchAssistants={handleSearchAssistants}
          onAddAssistant={handleAddDedicatedAssistant}
          onRemoveAssistant={handleRemoveDedicatedAssistant}
        />
      )}

      {/* Drawer: Create/Edit Series */}
      <SeriesFormDrawer
        isOpen={isSeriesDrawerOpen}
        onClose={() => setIsSeriesDrawerOpen(false)}
        onSave={handleSaveSeries}
        initialSeries={editingSeries}
        saving={saving}
      />

      {/* Drawer: Create/Edit Chapter */}
      <ChapterFormDrawer
        isOpen={isChapterDrawerOpen}
        onClose={() => setIsChapterDrawerOpen(false)}
        onSave={handleSaveChapter}
        saving={saving}
        initialChapter={editingChapter}
        nextChapterNumber={nextChapterNumber}
      />

      {/* Modal: Tantou Editor submit/invite */}
      <EditorSubmitModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleSubmitToEditor}
        selectedSeries={selectedSeries}
        saving={saving}
      />
    </div>
  )
}
