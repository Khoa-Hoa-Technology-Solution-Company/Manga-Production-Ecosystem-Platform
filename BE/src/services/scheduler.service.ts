import { Chapter } from '../models/Chapter';
import { notifyNewChapterToSubscribers } from './notification.service';

/**
 * Checks for approved chapters that have reached their publication deadline
 * and publishes them.
 */
export async function checkAndPublishScheduledChapters(): Promise<void> {
  try {
    const now = new Date();
    // Find all chapters that are Approved and have a publicationDeadline in the past or present
    const scheduledChapters = await Chapter.find({
      status: 'Approved',
      publicationDeadline: { $ne: null, $lte: now }
    });

    if (scheduledChapters.length === 0) {
      return;
    }

    console.log(`[Scheduler] Found ${scheduledChapters.length} scheduled chapter(s) to publish.`);

    for (const chapter of scheduledChapters) {
      chapter.status = 'Published';
      chapter.publishedAt = now;
      await chapter.save();

      console.log(`[Scheduler] Published Chapter Ch. ${chapter.chapterNumber} ("${chapter.title}") for series ${chapter.seriesId}`);

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
