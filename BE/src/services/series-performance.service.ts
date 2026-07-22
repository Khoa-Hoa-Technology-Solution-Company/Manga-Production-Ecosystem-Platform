import { Types } from 'mongoose';
import { Chapter } from '../models/Chapter';
import { ReactionEvent } from '../models/ReactionEvent';
import { Series } from '../models/Series';
import { SeriesPerformance, PerformancePeriod, PerformanceRiskLevel } from '../models/SeriesPerformance';
import { SeriesRating } from '../models/SeriesRating';
import { SeriesRatingEvent } from '../models/SeriesRatingEvent';

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const MIN_RATINGS_FOR_RISK = 20;
const MIN_PUBLISHED_CHAPTERS_FOR_RISK = 3;
const MIN_ACTIVE_DAYS_FOR_RISK = 30;
const LOW_WEIGHTED_RATING = 3;

export function getPeriodBounds(periodType: PerformancePeriod, referenceDate = new Date()) {
  const local = new Date(referenceDate.getTime() + BANGKOK_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const date = local.getUTCDate();

  let startLocal: number;
  if (periodType === 'monthly') {
    startLocal = Date.UTC(year, month, 1);
  } else {
    const day = local.getUTCDay();
    const daysFromMonday = (day + 6) % 7;
    startLocal = Date.UTC(year, month, date - daysFromMonday);
  }

  const start = new Date(startLocal - BANGKOK_OFFSET_MS);
  const end = periodType === 'monthly'
    ? new Date(Date.UTC(year, month + 1, 1) - BANGKOK_OFFSET_MS)
    : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { start, end };
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function riskFor(consecutivePoorPeriods: number, periodType: PerformancePeriod, eligible: boolean): PerformanceRiskLevel {
  if (!eligible) return 'insufficient_data';
  if (consecutivePoorPeriods === 0) return 'healthy';
  if (periodType === 'weekly') {
    if (consecutivePoorPeriods >= 4) return 'closure_review';
    if (consecutivePoorPeriods >= 2) return 'at_risk';
    return 'watch';
  }
  if (consecutivePoorPeriods >= 2) return 'closure_review';
  return 'watch';
}

export async function computeSeriesPerformance(
  periodType: PerformancePeriod,
  referenceDate = new Date(),
  persist = true,
) {
  const { start, end } = getPeriodBounds(periodType, referenceDate);
  const activeSeries = await Series.find({ status: 'Active' })
    .select('_id title description genre coverImage status mangakaId averageRating ratingCount totalVotes weeklyVotes readerCount subscribers createdAt publicationStartedAt publicationSchedule publicationMode nextPublicationAt')
    .lean();
  if (activeSeries.length === 0) return [];

  const seriesIds = activeSeries.map((series) => series._id);
  const [globalAverageResult, ratingAgg, ratingEventAgg, reactionAgg, chapterAgg, previousSnapshots] = await Promise.all([
    SeriesRating.aggregate([{ $match: { seriesId: { $in: seriesIds } } }, { $group: { _id: null, average: { $avg: '$rating' } } }]),
    SeriesRating.aggregate([
      { $match: { seriesId: { $in: seriesIds } } },
      {
        $group: {
          _id: '$seriesId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
          newRatingCount: {
            $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', start] }, { $lt: ['$createdAt', end] }] }, 1, 0] },
          },
        },
      },
    ]),
    SeriesRatingEvent.aggregate([
      { $match: { seriesId: { $in: seriesIds }, createdAt: { $gte: start, $lt: end }, action: { $in: ['created', 'updated'] } } },
      { $group: { _id: '$seriesId', count: { $sum: 1 } } },
    ]),
    ReactionEvent.aggregate([
      { $match: { seriesId: { $in: seriesIds }, createdAt: { $gte: start, $lt: end }, action: 'set' } },
      {
        $group: {
          _id: { seriesId: '$seriesId', emoji: '$emoji' },
          count: { $sum: 1 },
          users: { $addToSet: '$userId' },
        },
      },
    ]),
    Chapter.aggregate([
      { $match: { seriesId: { $in: seriesIds }, status: 'Published' } },
      { $group: { _id: '$seriesId', count: { $sum: 1 } } },
    ]),
    SeriesPerformance.find({
      seriesId: { $in: seriesIds },
      periodType,
      periodEnd: { $lte: start },
    }).sort({ periodStart: -1 }).lean(),
  ]);

  const globalAverage = globalAverageResult[0]?.average || 3;
  const ratingBySeries = new Map(ratingAgg.map((item: any) => [item._id.toString(), item]));
  const ratingEventsBySeries = new Map(ratingEventAgg.map((item: any) => [item._id.toString(), item.count]));
  const chaptersBySeries = new Map(chapterAgg.map((item: any) => [item._id.toString(), item.count]));
  const reactionsBySeries = new Map<string, { count: number; users: Set<string>; breakdown: Record<string, number> }>();
  for (const item of reactionAgg as any[]) {
    const seriesKey = item._id.seriesId.toString();
    const current = reactionsBySeries.get(seriesKey) || { count: 0, users: new Set<string>(), breakdown: {} };
    current.count += item.count;
    for (const userId of item.users || []) current.users.add(userId.toString());
    current.breakdown[item._id.emoji || 'unknown'] = item.count;
    reactionsBySeries.set(seriesKey, current);
  }
  const previousBySeries = new Map<string, any>();
  for (const snapshot of previousSnapshots) {
    const key = snapshot.seriesId.toString();
    if (!previousBySeries.has(key)) previousBySeries.set(key, snapshot);
  }

  const results: any[] = [];
  for (const series of activeSeries) {
    const key = series._id.toString();
    const rating = ratingBySeries.get(key) || {
      averageRating: Number(series.averageRating || 0),
      ratingCount: Number(series.ratingCount || 0),
      newRatingCount: 0,
    };
    const ratingCount = Number(rating.ratingCount || 0);
    const averageRating = Number(rating.averageRating || 0);
    const priorWeight = 20;
    const weightedRating = ratingCount > 0
      ? ((ratingCount / (ratingCount + priorWeight)) * averageRating) + ((priorWeight / (ratingCount + priorWeight)) * globalAverage)
      : 0;
    const score = round(weightedRating * 20, 2);
    const reaction = reactionsBySeries.get(key) || { count: 0, users: new Set<string>(), breakdown: {} };
    const publishedChapterCount = chaptersBySeries.get(key) || 0;
    const activeSince = series.publicationStartedAt || series.createdAt;
    const activeDays = (Date.now() - new Date(activeSince).getTime()) / (24 * 60 * 60 * 1000);
    const eligibleForRisk = activeDays >= MIN_ACTIVE_DAYS_FOR_RISK
      && publishedChapterCount >= MIN_PUBLISHED_CHAPTERS_FOR_RISK
      && ratingCount >= MIN_RATINGS_FOR_RISK;
    const poorPerformance = eligibleForRisk && weightedRating < LOW_WEIGHTED_RATING;
    const previous = previousBySeries.get(key);
    const consecutivePoorPeriods = poorPerformance ? Number(previous?.poorPerformance ? previous.consecutivePoorPeriods + 1 : 1) : 0;
    const riskLevel = riskFor(consecutivePoorPeriods, periodType, eligibleForRisk);
    const trendPercent = previous?.score
      ? round(((score - previous.score) / previous.score) * 100, 1)
      : 0;
    const payload = {
      seriesId: series._id,
      periodType,
      periodStart: start,
      periodEnd: end,
      averageRating: round(averageRating, 1),
      weightedRating: round(weightedRating, 2),
      ratingCount,
      newRatingCount: Number(ratingEventsBySeries.get(key) ?? rating.newRatingCount ?? 0),
      reactionCount: reaction.count,
      uniqueReactors: reaction.users.size,
      reactionBreakdown: reaction.breakdown,
      publishedChapterCount,
      score,
      previousScore: previous?.score,
      trendPercent,
      eligibleForRisk,
      poorPerformance,
      consecutivePoorPeriods,
      riskLevel,
      computedAt: new Date(),
    };
    const snapshot = persist
      ? await SeriesPerformance.findOneAndUpdate(
          { seriesId: series._id, periodType, periodStart: start },
          { $set: payload },
          { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
        ).lean()
      : payload;
    results.push({ ...snapshot, series });
  }

  return results.sort((a, b) => b.score - a.score);
}

export async function refreshCurrentPerformance() {
  const [weekly, monthly] = await Promise.all([
    computeSeriesPerformance('weekly'),
    computeSeriesPerformance('monthly'),
  ]);
  const riskyIds = [...weekly, ...monthly]
    .filter((item) => ['at_risk', 'closure_review'].includes(item.riskLevel))
    .map((item) => item.seriesId);
  await Series.updateMany({ status: 'Active' }, { $set: { cancellationRisk: false } });
  if (riskyIds.length) {
    await Series.updateMany({ _id: { $in: riskyIds }, status: 'Active' }, { $set: { cancellationRisk: true } });
  }
  return { weekly, monthly };
}
