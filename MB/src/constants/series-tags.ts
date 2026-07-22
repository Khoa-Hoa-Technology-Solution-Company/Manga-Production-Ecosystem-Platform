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

export const formatSeriesTag = (tag: string) =>
  tag.replace(/\b\w/g, (char) => char.toUpperCase());
