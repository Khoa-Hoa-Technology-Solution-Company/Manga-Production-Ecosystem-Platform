export const SERIES_TAG_OPTIONS = [
  'action',
  'adventure',
  'comedy',
  'drama',
  'fantasy',
  'historical',
  'horror',
  'mystery',
  'psychological',
  'romance',
  'school',
  'sci-fi',
  'seinen',
  'shoujo',
  'shounen',
  'slice of life',
  'sports',
  'supernatural',
  'thriller',
] as const

export type SeriesTag = typeof SERIES_TAG_OPTIONS[number]

export const formatSeriesTag = (tag: string) =>
  tag.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

export function toTagArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map(item => item.trim().toLowerCase()).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
  return []
}
