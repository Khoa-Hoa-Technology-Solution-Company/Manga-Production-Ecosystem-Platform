import { Chapter } from '../models/Chapter';
import { Series } from '../models/Series';
import { WorkflowEvent } from '../models/WorkflowEvent';
import {
  notifyNewChapterToSubscribers,
  notifyNewSeriesToSubscribers,
  notifySeriesPublished,
} from './notification.service';

function advanceSchedule(from: Date, schedule: 'weekly' | 'monthly'): Date {
  const next = new Date(from);
  if (schedule === 'weekly') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }

  const day = next.getUTCDate();
  const currentLastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  const preserveMonthEnd = day === currentLastDay;
  const targetYear = next.getUTCMonth() === 11 ? next.getUTCFullYear() + 1 : next.getUTCFullYear();
  const targetMonth = (next.getUTCMonth() + 1) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  next.setUTCFullYear(targetYear, targetMonth, preserveMonthEnd ? lastDay : Math.min(day, lastDay));
  return next;
}

function nextFutureSlot(from: Date, schedule: 'weekly' | 'monthly', now: Date): Date {
  let next = advanceSchedule(from, schedule);
  while (next.getTime() <= now.getTime()) next = advanceSchedule(next, schedule);
  return next;
}

let isRunning = false;

/**
 * Checks for approved chapters that have reached their publication deadline
 * and publishes them.
 */
export async function checkAndPublishScheduledChapters(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const now = new Date();

    const dueSeries = await Series.find({
      status: 'Active',
      publicationMode: 'scheduled',
      publicationSchedule: { $in: ['weekly', 'monthly'] },
      nextPublicationAt: { $ne: null, $lte: now },
    });

    for (const series of dueSeries) {
      const chapter = await Chapter.findOne({ seriesId: series._id, status: 'Approved' })
        .sort({ chapterNumber: 1 });
      if (!chapter || !series.nextPublicationAt || !series.publicationSchedule) continue;

      const scheduledSlot = series.nextPublicationAt;
      const firstLaunch = !series.publicationStartedAt;
      chapter.status = 'Published';
      chapter.publishedAt = now;
      chapter.scheduledPublishAt = scheduledSlot;
      await chapter.save();

      series.publicationStartedAt = series.publicationStartedAt || now;
      series.lastPublishedAt = now;
      series.nextPublicationAt = nextFutureSlot(scheduledSlot, series.publicationSchedule, now);
      await series.save();

      await WorkflowEvent.create({
        entityType: 'Chapter',
        entityId: chapter._id,
        action: firstLaunch ? 'scheduled_launch_publication' : 'scheduled_chapter_publication',
        fromStatus: 'Approved',
        toStatus: 'Published',
        actorId: series.publicationApprovedBy || series.mangakaId,
        actorRole: series.publicationApprovedBy ? 'editorial_board' : 'system',
        reason: `${series.publicationSchedule} schedule at ${scheduledSlot.toISOString()}`,
      });

      const nextChapter = await Chapter.findOne({ seriesId: series._id, status: 'Approved' })
        .sort({ chapterNumber: 1 });
      if (nextChapter) {
        nextChapter.scheduledPublishAt = series.nextPublicationAt;
        await nextChapter.save();
      }

      try {
        await notifyNewChapterToSubscribers(
          series._id.toString(),
          chapter._id.toString(),
          chapter.title,
          chapter.chapterNumber
        );
        if (firstLaunch) {
          await notifySeriesPublished(
            series.mangakaId.toString(),
            series.editorId?.toString(),
            series.title,
            series._id.toString()
          );
          await notifyNewSeriesToSubscribers(series._id.toString(), series.title);
        }
      } catch (error) {
        console.error(`[Scheduler] Failed to dispatch notifications for chapter ${chapter._id}:`, error);
      }

      console.log(`[Scheduler] Published Ch. ${chapter.chapterNumber} of "${series.title}" on its ${series.publicationSchedule} schedule.`);
    }

    // Preserve legacy one-off chapter deadlines created before recurring series schedules.
    const scheduledSeriesIds = await Series.find({ publicationMode: 'scheduled' }).distinct('_id');
    const deadlineChapters = await Chapter.find({
      status: 'Approved',
      seriesId: { $nin: scheduledSeriesIds },
      scheduledPublishAt: { $exists: false },
      publicationDeadline: { $ne: null, $lte: now },
    });

    for (const chapter of deadlineChapters) {
      chapter.status = 'Published';
      chapter.publishedAt = now;
      await chapter.save();
      try {
        await notifyNewChapterToSubscribers(
          chapter.seriesId.toString(),
          chapter._id.toString(),
          chapter.title,
          chapter.chapterNumber
        );
      } catch (err) {
        console.error(`[Scheduler] Failed to dispatch publication notification for chapter ${chapter._id}:`, err);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error running scheduled chapter publisher:', error);
  } finally {
    isRunning = false;
  }
}

let intervalId: NodeJS.Timeout | null = null;

export function startScheduler(intervalMs: number = 30000): void {
  if (intervalId) {
    return;
  }
  console.log(`[Scheduler] Starting scheduled chapter publisher with interval ${intervalMs}ms...`);
  // Run immediately on start, then periodically
  checkAndPublishScheduledChapters();
  intervalId = setInterval(checkAndPublishScheduledChapters, intervalMs);
}

export function stopScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Stopped scheduled chapter publisher.');
  }
}
