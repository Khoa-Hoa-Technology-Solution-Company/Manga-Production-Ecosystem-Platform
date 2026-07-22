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
] as const;

export type SeriesTag = typeof SERIES_TAG_OPTIONS[number];

export function normalizeSeriesTags(value: unknown): string[] {
  let values: unknown[] = [];
  if (Array.isArray(value)) values = value;
  else if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        values = Array.isArray(parsed) ? parsed : [];
      } catch {
        values = [];
      }
    } else {
      values = trimmed.split(',');
    }
  }

  const allowed = new Set<string>(SERIES_TAG_OPTIONS);
  return [...new Set(values
    .map((item) => String(item).trim().toLowerCase())
    .filter((item): item is SeriesTag => allowed.has(item)))];
}
