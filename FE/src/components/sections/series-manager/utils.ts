export function toGenreText(value: unknown): string {
  if (Array.isArray(value)) {
    const mapped = value.map(item => {
      if (typeof item === 'string') {
        const trimmed = item.trim()
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed)
            if (Array.isArray(parsed)) return parsed.join(', ')
          } catch {
            // ignore parse errors
          }
        }
      }
      return String(item)
    })
    const joined = mapped.join(', ')
    if (joined.startsWith('[') && joined.endsWith(']')) {
      try {
        const parsed = JSON.parse(joined)
        if (Array.isArray(parsed)) return parsed.join(', ')
      } catch {
        // ignore parse errors
      }
    }
    return joined
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map(item => toGenreText(item)).join(', ')
        }
      } catch {
        // Fallback
      }
    }
    return trimmed
  }
  return ''
}

export function seriesCoverUrl(coverImage?: string) {
  if (!coverImage) return ''
  if (coverImage.startsWith('http')) return coverImage
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  return `${base}${coverImage}`
}

export interface SeriesData {
  _id: string
  title: string
  description?: string
  genre?: string
  coverImage?: string
  mangakaId?: string | { _id: string }
  status?: string
  totalChapters?: number
  rejectionNotes?: string
  editorId?: string | { _id: string; displayName?: string }
  editorStatus?: 'pending' | 'accepted' | 'rejected' | 'none'
}

export interface ChapterData {
  _id: string
  seriesId?: string | { _id: string }
  chapterNumber: number
  title: string
  status: string
  totalPages?: number
  progress?: number
  collaborators?: { userId: { _id: string; displayName: string; avatar?: string } }[]
}

export interface EditorUserData {
  _id: string
  displayName?: string
  username: string
  email: string
}

export interface UserData {
  _id: string
  displayName?: string
  username: string
  email: string
  role: string
}

export interface DedicatedAssistantData {
  userId: string | {
    _id: string
    displayName?: string
    email?: string
    skills?: string[]
  }
}
