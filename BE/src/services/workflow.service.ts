import { Chapter, ChapterStatus } from '../models/Chapter';
import { Series } from '../models/Series';
import { User } from '../models/User';
import { notifyNewChapterToSubscribers, notifyChapterSubmittedToEditor } from './notification.service';

/**
 * Valid workflow transitions for chapters.
 * Draft → Reviewing → Approved → Published
 */
const VALID_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  Draft: ['Reviewing'],
  Reviewing: ['Draft', 'Approved'],   // can reject back to Draft
  Approved: ['Published', 'Reviewing'], // can revert to Reviewing
  Published: [],                       // final state
};

export async function transitionChapterStatus(
  chapterId: string,
  newStatus: ChapterStatus,
  userId: string,
  userRole: string
): Promise<typeof Chapter.prototype> {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw new Error('Chapter not found.');

  const currentStatus = chapter.status;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: [${allowed.join(', ')}]`
    );
  }

  // Role-based transition rules
  if (newStatus === 'Reviewing' && currentStatus === 'Draft') {
    // Only mangaka can submit for review
    if (userRole !== 'mangaka') throw new Error('Only mangaka can submit chapters for review.');
  }

  if (newStatus === 'Approved' || (newStatus === 'Draft' && currentStatus === 'Reviewing')) {
    // Only editor can approve or reject
    if (userRole !== 'editor' && userRole !== 'editorial_board') {
      throw new Error('Only editors can approve or reject chapters.');
    }
  }

  if (newStatus === 'Published') {
    // Only editorial board can publish
    if (userRole !== 'editorial_board') {
      throw new Error('Only editorial board can publish chapters.');
    }
    chapter.publishedAt = new Date();
  }

  // Auto-publishing logic if series is already approved (Active/Completed)
  let targetStatus = newStatus;
  if (newStatus === 'Approved') {
    const series = await Series.findById(chapter.seriesId);
    if (series && (series.status === 'Active' || series.status === 'Completed')) {
      targetStatus = 'Published';
      chapter.publishedAt = new Date();
    }
  }

  chapter.status = targetStatus;
  await chapter.save();

  if (targetStatus === 'Published') {
    try {
      await notifyNewChapterToSubscribers(
        chapter.seriesId.toString(),
        chapter._id.toString(),
        chapter.title,
        chapter.chapterNumber
      );
    } catch (err) {
      console.error('Failed to dispatch chapter publication notification:', err);
    }
  }

  // Notify editor when Mangaka submits a chapter for review
  if (targetStatus === 'Reviewing') {
    try {
      const series = await Series.findById(chapter.seriesId);
      if (series?.editorId && series.editorStatus === 'accepted') {
        const mangaka = await User.findById(chapter.mangakaId).select('displayName');
        await notifyChapterSubmittedToEditor(
          series.editorId.toString(),
          mangaka?.displayName || 'Mangaka',
          chapter.title,
          chapter.chapterNumber,
          series.title,
          chapter._id.toString()
        );
      }
    } catch (err) {
      console.error('Failed to send chapter-submitted notification to editor:', err);
    }
  }

  return chapter;
}

