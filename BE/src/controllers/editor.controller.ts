import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { Annotation } from '../models/Annotation';
import { User } from '../models/User';

export async function getPortfolio(req: Request, res: Response): Promise<void> {
  try {
    const editorId = req.user?._id;
    if (!editorId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const activeSeriesList = await Series.find({ editorId, editorStatus: 'accepted' })
      .populate('mangakaId', 'displayName avatar')
      .sort({ updatedAt: -1 });

    const invites = await Series.find({ editorId, editorStatus: 'pending' })
      .populate('mangakaId', 'displayName avatar')
      .sort({ createdAt: -1 });

    const portfolio = await Promise.all(
      activeSeriesList.map(async (series) => {
        const chapters = await Chapter.find({ seriesId: series._id });
        const totalChaptersCount = chapters.length;
        const totalProgress = totalChaptersCount > 0
          ? Math.round(chapters.reduce((sum, ch) => sum + ch.progress, 0) / totalChaptersCount)
          : 0;

        let daysRemaining: number | null = null;
        let healthStatus: 'green' | 'yellow' | 'red' = 'green';

        if (series.deadline) {
          const now = new Date();
          const deadlineDate = new Date(series.deadline);
          const diffTime = deadlineDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (totalProgress < 60) {
            if (daysRemaining < 3) {
              healthStatus = 'red';
            } else if (daysRemaining <= 7) {
              healthStatus = 'yellow';
            } else {
              healthStatus = 'green';
            }
          } else {
            healthStatus = 'green';
          }
        }

        const latestChapter = chapters.length > 0
          ? chapters.reduce((prev, curr) => (prev.chapterNumber > curr.chapterNumber ? prev : curr))
          : null;

        const activeChaptersCount = chapters.filter(c => c.status !== 'Approved' && c.status !== 'Published').length;

        return {
          series,
          totalProgress,
          daysRemaining,
          healthStatus,
          totalChaptersCount,
          activeChaptersCount,
          latestChapter,
        };
      })
    );

    res.json({ portfolio, invites });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/editor/milestones/:seriesId
 * Groups chapters of a series into 3 stages (Name, Draft/Inking, Final)
 */
export async function getMilestones(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId } = req.params;
    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    const chapters = await Chapter.find({ seriesId });

    // Group chapters
    const nameChapters = chapters.filter(c => c.progress <= 33);
    const draftChapters = chapters.filter(c => c.progress > 33 && c.progress <= 66);
    const finalChapters = chapters.filter(c => c.progress > 66);

    const totalPagesName = nameChapters.reduce((sum, c) => sum + c.totalPages, 0);
    const totalPagesDraft = draftChapters.reduce((sum, c) => sum + c.totalPages, 0);
    const totalPagesFinal = finalChapters.reduce((sum, c) => sum + c.totalPages, 0);

    res.json({
      series,
      milestones: {
        name: {
          title: 'Name/Storyboard',
          range: '0-33%',
          chapters: nameChapters.map(c => ({
            _id: c._id,
            title: c.title,
            chapterNumber: c.chapterNumber,
            progress: c.progress,
            totalPages: c.totalPages,
            status: c.status,
          })),
          totalPages: totalPagesName,
          percentage: chapters.length > 0 ? Math.round((nameChapters.length / chapters.length) * 100) : 0,
        },
        draft: {
          title: 'Draft/Inking',
          range: '34-66%',
          chapters: draftChapters.map(c => ({
            _id: c._id,
            title: c.title,
            chapterNumber: c.chapterNumber,
            progress: c.progress,
            totalPages: c.totalPages,
            status: c.status,
          })),
          totalPages: totalPagesDraft,
          percentage: chapters.length > 0 ? Math.round((draftChapters.length / chapters.length) * 100) : 0,
        },
        final: {
          title: 'Final',
          range: '67-100%',
          chapters: finalChapters.map(c => ({
            _id: c._id,
            title: c.title,
            chapterNumber: c.chapterNumber,
            progress: c.progress,
            totalPages: c.totalPages,
            status: c.status,
          })),
          totalPages: totalPagesFinal,
          percentage: chapters.length > 0 ? Math.round((finalChapters.length / chapters.length) * 100) : 0,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/editor/warnings
 * Returns early warning bottleneck, overdue, and excessive rejection alerts
 */
export async function getWarnings(req: Request, res: Response): Promise<void> {
  try {
    const editorId = req.user?._id;
    if (!editorId) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const seriesList = await Series.find({ editorId, editorStatus: 'accepted' });
    const seriesIds = seriesList.map(s => s._id);

    const activeChapters = await Chapter.find({
      seriesId: { $in: seriesIds },
      status: { $nin: ['Approved', 'Published'] },
    }).populate('seriesId');

    const warnings: any[] = [];

    for (const chapter of activeChapters) {
      const series: any = chapter.seriesId;
      if (!series) continue;

      // 1. Bottleneck check
      if (series.deadline && series.createdAt) {
        const totalWindow = new Date(series.deadline).getTime() - new Date(series.createdAt).getTime();
        const elapsed = Date.now() - new Date(series.createdAt).getTime();
        if (totalWindow > 0) {
          const elapsedRatio = elapsed / totalWindow;
          if (elapsedRatio > 0.5 && chapter.progress < 50) {
            warnings.push({
              type: 'BOTTLENECK',
              severity: 'yellow',
              chapterId: chapter._id,
              chapterTitle: chapter.title,
              chapterNumber: chapter.chapterNumber,
              seriesId: series._id,
              seriesTitle: series.title,
              progress: chapter.progress,
              message: `Chapter progress is only ${chapter.progress}% despite 50%+ of series timeframe having elapsed.`,
            });
          }
        }
      }

      // 2. Deadline approaching check
      if (series.deadline) {
        const diffDays = (new Date(series.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (diffDays < 2 && chapter.progress < 80) {
          warnings.push({
            type: 'DEADLINE_APPROACHING',
            severity: 'red',
            chapterId: chapter._id,
            chapterTitle: chapter.title,
            chapterNumber: chapter.chapterNumber,
            seriesId: series._id,
            seriesTitle: series.title,
            progress: chapter.progress,
            daysRemaining: Math.ceil(diffDays),
            message: `Deadline is approaching in ${Math.ceil(diffDays)} days, but chapter progress is only ${chapter.progress}%.`,
          });
        }
      }

      // 3. Excessive rejections check
      const reviewAnnotationsCount = await Annotation.countDocuments({
        chapterId: chapter._id,
        source: 'review',
      });
      if (reviewAnnotationsCount > 3) {
        warnings.push({
          type: 'EXCESSIVE_REJECTIONS',
          severity: 'red',
          chapterId: chapter._id,
          chapterTitle: chapter.title,
          chapterNumber: chapter.chapterNumber,
          seriesId: series._id,
          seriesTitle: series.title,
          progress: chapter.progress,
          rejectionCount: reviewAnnotationsCount,
          message: `Chapter has received ${reviewAnnotationsCount} review annotations, indicating potential quality bottlenecks or excessive rejection cycles.`,
        });
      }
    }

    res.json({ warnings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/editor/analytics/:mangakaId
 * Returns reliability, velocity, and rejection analytics for a specific mangaka
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  try {
    const { mangakaId } = req.params;
    const mangaka = await User.findById(mangakaId, 'displayName avatar');
    if (!mangaka) {
      res.status(404).json({ error: 'Mangaka not found.' });
      return;
    }

    const seriesList = await Series.find({ mangakaId });
    const chapters = await Chapter.find({ mangakaId });

    // 1. Reliability (on-time vs late chapters)
    let onTimeCount = 0;
    let lateCount = 0;

    for (const chapter of chapters) {
      if (chapter.status === 'Approved' || chapter.status === 'Published') {
        const series = seriesList.find(s => s._id.toString() === chapter.seriesId.toString());
        if (series && series.deadline) {
          const deadlineTime = new Date(series.deadline).getTime();
          const completionTime = new Date(chapter.updatedAt).getTime();
          if (completionTime > deadlineTime) {
            lateCount++;
          } else {
            onTimeCount++;
          }
        } else {
          onTimeCount++;
        }
      }
    }

    // 2. Velocity (average days to approve/publish)
    const completedChapters = chapters.filter(c => c.status === 'Approved' || c.status === 'Published');
    let totalDaysToComplete = 0;
    completedChapters.forEach(c => {
      const diffTime = new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime();
      totalDaysToComplete += diffTime / (1000 * 60 * 60 * 24);
    });
    const averageDaysToComplete = completedChapters.length > 0
      ? parseFloat((totalDaysToComplete / completedChapters.length).toFixed(1))
      : 0;

    // 3. Rejection history/counts
    const seriesRejectionsCount = seriesList.filter(s => s.rejectionNotes).length;
    const totalAnnotationsCount = await Annotation.countDocuments({
      chapterId: { $in: chapters.map(c => c._id) },
      source: 'review',
    });

    const rejectionHistory = seriesList
      .filter(s => s.rejectionNotes)
      .map(s => ({
        seriesId: s._id,
        seriesTitle: s.title,
        rejectionNotes: s.rejectionNotes,
        date: s.updatedAt,
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    res.json({
      mangaka,
      reliability: {
        onTime: onTimeCount,
        late: lateCount,
        total: onTimeCount + lateCount,
      },
      velocity: {
        averageDays: averageDaysToComplete,
        completedChaptersCount: completedChapters.length,
      },
      rejections: {
        seriesRejections: seriesRejectionsCount,
        totalReviewAnnotations: totalAnnotationsCount,
        rejectionHistory,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
