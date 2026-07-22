import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Chapter } from '../models/Chapter';
import { ReadingProgress } from '../models/ReadingProgress';
import { ReaderActivityEvent } from '../models/ReaderActivityEvent';
import { Series } from '../models/Series';
import { createReaderAssistantReply } from '../services/reader-assistant.service';
import { computeSeriesPerformance } from '../services/series-performance.service';
import { getReaderLeaderboard as loadReaderLeaderboard, ReaderRankingPeriod } from '../services/reader-ranking.service';

const publishedSeriesFilter = {
  status: { $in: ['Active', 'Completed'] },
  $or: [
    { publicationMode: { $ne: 'scheduled' } },
    { publicationStartedAt: { $exists: true, $ne: null } },
  ],
};

function clamp(value: unknown, min: number, max: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.min(max, Math.max(min, numeric));
}

function bangkokDateKey(date: Date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mapSeries(series: any) {
  return {
    id: series._id.toString(),
    title: series.title,
    description: series.description,
    genre: series.genre || [],
    coverImage: series.coverImage,
    totalChapters: series.totalChapters || 0,
    averageRating: series.averageRating || 0,
    weeklyVotes: series.weeklyVotes || 0,
  };
}

async function getReaderContext(userId: string) {
  const progressDocs: any[] = await ReadingProgress.find({ userId })
    .sort({ lastReadAt: -1 })
    .limit(6)
    .populate({
      path: 'seriesId',
      match: publishedSeriesFilter,
      select: 'title description genre coverImage totalChapters averageRating weeklyVotes status',
    })
    .populate({ path: 'chapterId', select: 'chapterNumber title status' })
    .lean();

  const validProgress = progressDocs.filter((item) => item.seriesId && item.chapterId);
  const readSeriesIds = validProgress.map((item) => item.seriesId._id);
  const preferredGenres = new Set<string>();
  validProgress.forEach((item) => {
    (item.seriesId.genre || []).forEach((genre: string) => preferredGenres.add(genre));
  });

  const candidates: any[] = await Series.find({
    ...publishedSeriesFilter,
    ...(readSeriesIds.length ? { _id: { $nin: readSeriesIds } } : {}),
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const recommendations = candidates
    .map((series) => ({
      series,
      score:
        (series.genre || []).filter((genre: string) => preferredGenres.has(genre)).length * 1000 +
        Math.min(series.weeklyVotes || 0, 999) +
        Math.min(series.averageRating || 0, 5) * 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ series }) => mapSeries(series));

  const continueReading = validProgress.filter((progress) => !progress.completed).map((progress) => ({
    ...mapSeries(progress.seriesId),
    chapterId: progress.chapterId._id.toString(),
    chapterNumber: progress.chapterId.chapterNumber,
    chapterTitle: progress.chapterId.title,
    chapterIndex: progress.chapterIndex,
    pageIndex: progress.pageIndex,
    percentage: progress.percentage,
    completed: progress.completed,
    lastReadAt: progress.lastReadAt,
  }));

  return { continueReading, recommendations };
}

export async function updateProgress(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId, chapterId } = req.body;
    if (!Types.ObjectId.isValid(seriesId) || !Types.ObjectId.isValid(chapterId)) {
      res.status(400).json({ error: 'seriesId and chapterId must be valid IDs.' });
      return;
    }

    const chapter = await Chapter.findOne({ _id: chapterId, seriesId, status: 'Published' });
    if (!chapter) {
      res.status(404).json({ error: 'Published chapter not found in this series.' });
      return;
    }

    const percentage = clamp(req.body.percentage, 0, 100);
    const completed = Boolean(req.body.completed);
    const now = new Date();
    const progress = await ReadingProgress.findOneAndUpdate(
      { userId: req.user!._id, seriesId },
      {
        $set: {
          chapterId,
          chapterIndex: Math.floor(clamp(req.body.chapterIndex, 0, 100000)),
          pageIndex: Math.floor(clamp(req.body.pageIndex, 0, 100000)),
          percentage,
          completed,
          lastReadAt: now,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    const activityDate = bangkokDateKey(now);
    const existingActivity = await ReaderActivityEvent.findOne({
      userId: req.user!._id,
      chapterId,
      activityDate,
    }).select('completed');
    await ReaderActivityEvent.findOneAndUpdate(
      { userId: req.user!._id, chapterId, activityDate },
      {
        $set: {
          seriesId,
          lastReadAt: now,
          completed: Boolean(existingActivity?.completed) || completed,
        },
        $max: { maxPercentage: percentage },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ progress });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getReaderLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const period: ReaderRankingPeriod = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
    res.json(await loadReaderLeaderboard(period, new Date(), limit));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getSeriesRankings(req: Request, res: Response): Promise<void> {
  try {
    const period = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const rankings = await computeSeriesPerformance(period, new Date(), false);
    const now = new Date();
    const visibleRankings = rankings
      .filter((item: any) => item.publishedChapterCount > 0)
      .filter((item: any) => item.series.publicationMode !== 'scheduled' || !!item.series.publicationStartedAt && new Date(item.series.publicationStartedAt) <= now)
      .sort((a: any, b: any) => b.score - a.score)
      .map((item: any, index: number) => ({
        ...item.series,
        _id: item.series._id,
        totalChapters: item.publishedChapterCount,
        performanceScore: item.score,
        weightedRating: item.weightedRating,
        ratingCount: item.ratingCount,
        reactionCount: item.reactionCount,
        rank: index + 1,
      }));
    res.json({ period, rankings: visibleRankings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getProgress(req: Request, res: Response): Promise<void> {
  try {
    const context = await getReaderContext(req.user!._id);
    res.json({ continueReading: context.continueReading });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getHome(req: Request, res: Response): Promise<void> {
  try {
    const context = await getReaderContext(req.user!._id);
    const current = context.continueReading[0];
    const firstSuggestion = context.recommendations[0];

    let greeting = `Chào ${req.user!.displayName}! Mình là Emi Fujiwara, trợ lý đọc truyện của bạn.`;
    if (current) {
      greeting += ` Bạn đang đọc dở “${current.title}” ở chương ${current.chapterNumber}. Mình đưa bạn quay lại ngay nhé?`;
    } else if (firstSuggestion) {
      greeting += ` Mình đã chọn một vài bộ truyện mới để bạn bắt đầu, nổi bật là “${firstSuggestion.title}”.`;
    } else {
      greeting += 'Hãy khám phá thư viện và mình sẽ học sở thích của bạn từ những bộ truyện bạn đọc.';
    }

    res.json({
      assistant: { name: 'Emi Fujiwara', greeting },
      continueReading: context.continueReading,
      recommendations: context.recommendations,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const message = String(req.body.message || '').trim();
    if (!message || message.length > 1000) {
      res.status(400).json({ error: 'Message must contain between 1 and 1000 characters.' });
      return;
    }

    const history = Array.isArray(req.body.history)
      ? req.body.history
        .filter((item: any) => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
        .slice(-6)
      : [];
    const context = await getReaderContext(req.user!._id);
    const assistantResult = await createReaderAssistantReply(message, {
      displayName: req.user!.displayName,
      currentReads: context.continueReading.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        genre: item.genre,
        chapterNumber: item.chapterNumber,
        percentage: item.percentage,
      })),
      recommendations: context.recommendations,
      history,
    });

    const normalizedMessage = message.toLocaleLowerCase('vi-VN');
    const wantsContinueReading = /đọc tiếp|đang đọc|đọc dở|dang doc|doc do/.test(normalizedMessage);
    const wantsRecommendations = /gợi ý|đề xuất|nên đọc|muốn đọc|tìm.*truyện|truyện.*nào|recommend|goi y|muon doc/.test(normalizedMessage);
    const currentRead = context.continueReading[0];
    const resultSeries = wantsContinueReading
      ? context.continueReading.slice(0, 1)
      : wantsRecommendations
        ? context.recommendations.slice(0, 3)
        : [];

    let reply = assistantResult.reply;
    if (wantsContinueReading) {
      reply = currentRead
        ? `Bạn đang đọc dở “${currentRead.title}” ở chương ${currentRead.chapterNumber}. Chạm vào thẻ bên dưới để đọc tiếp nhé.`
        : 'Bạn chưa có bộ truyện nào đang đọc dở. Hãy chọn một bộ trong thư viện để bắt đầu nhé.';
    } else if (wantsRecommendations) {
      reply = resultSeries.length > 0
        ? `Mình tìm thấy ${resultSeries.length} bộ trong thư viện MangaFlow phù hợp để bạn khám phá: ${resultSeries.map((item) => `“${item.title}”`).join(', ')}. Chạm vào từng thẻ để xem chi tiết nhé.`
        : 'Hiện mình chưa tìm thấy bộ truyện phù hợp trong thư viện MangaFlow. Bạn thử mô tả thể loại hoặc phong cách muốn đọc nhé.';
    }

    res.json({
      ...assistantResult,
      reply,
      recommendations: resultSeries,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
