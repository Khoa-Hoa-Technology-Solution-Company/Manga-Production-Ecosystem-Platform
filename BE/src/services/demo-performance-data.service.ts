import { Chapter } from '../models/Chapter';
import { Series } from '../models/Series';
import { SeriesRating } from '../models/SeriesRating';
import { SeriesRatingEvent } from '../models/SeriesRatingEvent';
import { SeriesPerformance } from '../models/SeriesPerformance';
import { User } from '../models/User';
import { recalculateSeriesRating } from './series-rating.service';
import { getPeriodBounds, refreshCurrentPerformance } from './series-performance.service';

const MIN_RATINGS = 20;
const MIN_PUBLISHED_CHAPTERS = 3;
const DEMO_ACTIVE_DAYS = 45;
const DEMO_READER_COUNT = 24;

export type DemoRiskScenario = 'healthy' | 'closure_review';

/**
 * Seeds a selected Risk scenario for manual demos.
 *
 * The endpoint intentionally makes the selected series deterministic. It
 * creates missing evidence, then changes ratings/snapshots only for the
 * explicitly selected demo series.
 */
export async function seedDemoPerformanceScenario(
  scenario: DemoRiskScenario,
  requestedSeriesIds?: string[],
): Promise<{ scenario: DemoRiskScenario; seriesIds: string[]; weekly: any[]; monthly: any[] }> {
  try {
    const activeSeries = await Series.find({
      status: 'Active',
      ...(requestedSeriesIds?.length ? { _id: { $in: requestedSeriesIds } } : {}),
    })
      .select('_id title mangakaId editorId publicationStartedAt createdAt')
      .lean();
    if (activeSeries.length === 0) {
      throw new Error('No active series found for the requested demo scenario.');
    }

    const demoReaders = [];
    for (let index = 1; index <= DEMO_READER_COUNT; index += 1) {
      const email = `demo.reader.${String(index).padStart(2, '0')}@mangaflow.local`;
      let reader = await User.findOne({ email });
      if (!reader) {
        reader = await User.create({
          email,
          password: 'password123',
          displayName: `Demo Reader ${index}`,
          role: 'reader',
          subscribedToNewSeries: true,
        });
      }
      demoReaders.push(reader);
    }

    const demoStart = new Date(Date.now() - DEMO_ACTIVE_DAYS * 24 * 60 * 60 * 1000);

    for (const series of activeSeries) {
      const seriesDoc = await Series.findById(series._id);
      if (!seriesDoc) continue;

      const currentStart = seriesDoc.publicationStartedAt || seriesDoc.createdAt;
      if (!seriesDoc.publicationStartedAt || currentStart.getTime() > demoStart.getTime()) {
        seriesDoc.publicationStartedAt = demoStart;
        await seriesDoc.save();
      }

      const publishedChapters = await Chapter.find({
        seriesId: series._id,
        status: 'Published',
      }).sort({ chapterNumber: 1 });
      const missingChapterCount = Math.max(0, MIN_PUBLISHED_CHAPTERS - publishedChapters.length);
      if (missingChapterCount > 0) {
        const latestChapter = await Chapter.findOne({ seriesId: series._id }).sort({ chapterNumber: -1 });
        const firstNumber = (latestChapter?.chapterNumber || 0) + 1;
        const chapters = Array.from({ length: missingChapterCount }, (_, offset) => ({
          seriesId: series._id,
          chapterNumber: firstNumber + offset,
          title: `Demo Performance Chapter ${firstNumber + offset}`,
          status: 'Published' as const,
          mangakaId: series.mangakaId,
          editorId: series.editorId,
          totalPages: 3,
          progress: 100,
          views: 100 + offset * 25,
          publishedAt: new Date(demoStart.getTime() + (offset + 1) * 24 * 60 * 60 * 1000),
        }));
        await Chapter.create(chapters);
      }

      const existingRatings = await SeriesRating.find({ seriesId: series._id })
        .select('userId')
        .lean();
      const ratedUsers = new Set(existingRatings.map((rating) => rating.userId.toString()));
      const ratingsToCreate = demoReaders
        .filter((reader) => !ratedUsers.has(reader._id.toString()))
        .slice(0, Math.max(0, MIN_RATINGS - existingRatings.length))
        .map((reader, index) => ({
          userId: reader._id,
          seriesId: series._id,
          rating: index % 5 === 0 ? 5 : 4,
          source: 'reader' as const,
        }));

      if (ratingsToCreate.length > 0) {
        await SeriesRating.create(ratingsToCreate);
        await SeriesRatingEvent.create(
          ratingsToCreate.map((rating) => ({
            userId: rating.userId,
            seriesId: rating.seriesId,
            rating: rating.rating,
            action: 'created' as const,
          }))
        );
      }

      await SeriesRating.updateMany(
        { seriesId: series._id },
        { $set: { rating: scenario === 'closure_review' ? 1 + (Math.random() > 0.65 ? 1 : 0) : 4 + (Math.random() > 0.7 ? 1 : 0) } }
      );
      await recalculateSeriesRating(series._id);

      await SeriesPerformance.deleteMany({ seriesId: series._id });
      if (scenario === 'closure_review') {
        const { start } = getPeriodBounds('weekly');
        const historicalSnapshots = Array.from({ length: 4 }, (_, index) => {
          const periodStart = new Date(start.getTime() - (4 - index) * 7 * 24 * 60 * 60 * 1000);
          const periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
          return {
            seriesId: series._id,
            periodType: 'weekly' as const,
            periodStart,
            periodEnd,
            averageRating: 1.5,
            weightedRating: 2.4,
            ratingCount: MIN_RATINGS,
            newRatingCount: 5,
            reactionCount: 2,
            uniqueReactors: 2,
            reactionBreakdown: { '💬': 2 },
            publishedChapterCount: MIN_PUBLISHED_CHAPTERS,
            activeDays: DEMO_ACTIVE_DAYS,
            score: 48,
            previousScore: 52,
            trendPercent: -7.7,
            eligibleForRisk: true,
            poorPerformance: true,
            consecutivePoorPeriods: index + 1,
            riskLevel: index >= 3 ? 'closure_review' as const : 'at_risk' as const,
            computedAt: new Date(),
          };
        });
        const { start: monthlyStart } = getPeriodBounds('monthly');
        const monthlySnapshots = Array.from({ length: 2 }, (_, index) => {
          const periodStart = new Date(monthlyStart);
          periodStart.setUTCMonth(periodStart.getUTCMonth() - (2 - index));
          const periodEnd = new Date(periodStart);
          periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
          return {
            ...historicalSnapshots[0],
            periodType: 'monthly' as const,
            periodStart,
            periodEnd,
            consecutivePoorPeriods: index + 1,
            riskLevel: index >= 1 ? 'closure_review' as const : 'watch' as const,
          };
        });
        await SeriesPerformance.create([...historicalSnapshots, ...monthlySnapshots]);
      }
    }

    const refreshed = await refreshCurrentPerformance();
    const seriesIds = activeSeries.map((series) => series._id.toString());
    return {
      scenario,
      seriesIds,
      weekly: refreshed.weekly.filter((item: any) => seriesIds.includes(item.seriesId.toString())),
      monthly: refreshed.monthly.filter((item: any) => seriesIds.includes(item.seriesId.toString())),
    };
  } catch (error) {
    throw error;
  }
}
