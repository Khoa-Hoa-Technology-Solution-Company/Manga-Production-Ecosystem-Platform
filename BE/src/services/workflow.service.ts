import { Chapter, ChapterStatus } from '../models/Chapter';
import { Series } from '../models/Series';
import { User } from '../models/User';
import { WorkflowEvent } from '../models/WorkflowEvent';
import { notifyNewChapterToSubscribers, notifyChapterSubmittedToEditor } from './notification.service';

/**
 * Valid workflow transitions for chapters.
 * Draft → Reviewing → Approved → Published
 */
const VALID_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  Draft: ['Reviewing'],
  Reviewing: ['Draft', 'Approved'],   // can reject back to Draft
  Approved: ['Published', 'Reviewing'], // can revert to Reviewing
  Published: ['Approved'],             // withdrawal preserves the approval state
};

export async function transitionChapterStatus(
  chapterId: string,
  newStatus: ChapterStatus,
  userId: string,
  userRole: string,
  isEbHead = false
): Promise<typeof Chapter.prototype> {
  const chapter = await Chapter.findById(chapterId);
  if (!chapter) throw new Error('Chapter not found.');

  const currentStatus = chapter.status;
  const allowed = VALID_TRANSITIONS[currentStatus];
  const series = await Series.findById(chapter.seriesId);
  if (!series) throw new Error('Parent series not found.');
  const isOwner = userRole === 'mangaka' && chapter.mangakaId.toString() === userId;
  const isAssignedEditor = userRole === 'editor'
    && series.editorId?.toString() === userId
    && series.editorStatus === 'accepted';

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from "${currentStatus}" to "${newStatus}". Allowed: [${allowed.join(', ')}]`
    );
  }

  // Role-based transition rules
  if (newStatus === 'Reviewing' && currentStatus === 'Draft') {
    if (!isOwner) throw new Error('Only the owning mangaka can submit chapters for review.');
    const canSubmitForReview = series.status === 'Active'
      || (series.status === 'Pending_Editor' && series.editorStatus === 'accepted');
    if (!canSubmitForReview) {
      throw new Error('Chapter review requires an Active series or a Pending Editor series with an accepted editor.');
    }
    if (!series.editorId || series.editorStatus !== 'accepted') {
      throw new Error('An accepted Tantou Editor is required before chapter review can begin.');
    }
  }

  if (
    newStatus === 'Approved'
    || (newStatus === 'Draft' && currentStatus === 'Reviewing')
    || (newStatus === 'Reviewing' && currentStatus === 'Approved')
  ) {
    if (!isAssignedEditor) throw new Error('Only the assigned Tantou Editor can review this chapter.');
  }

  if (newStatus === 'Approved' && currentStatus === 'Published') {
    if (!isAssignedEditor && !(userRole === 'editorial_board' && isEbHead)) {
      throw new Error('Only the assigned editor or Editorial Board Head can withdraw a chapter.');
    }
    chapter.publishedAt = undefined;
  }

  if (newStatus === 'Published') {
    if (!isAssignedEditor) throw new Error('Only the assigned Tantou Editor can publish an approved chapter.');
    if (series.status !== 'Active') throw new Error('A chapter can only be published after the series becomes Active.');
    if (series.publicationMode === 'scheduled') {
      throw new Error('This series uses automatic scheduled publication. The chapter will publish at the next available slot.');
    }
    chapter.publishedAt = new Date();
  }

  if (newStatus === 'Approved' && series.publicationMode === 'scheduled' && series.nextPublicationAt) {
    const alreadyScheduled = await Chapter.exists({
      _id: { $ne: chapter._id },
      seriesId: series._id,
      status: 'Approved',
      scheduledPublishAt: { $exists: true },
    });
    if (!alreadyScheduled) chapter.scheduledPublishAt = series.nextPublicationAt;
  } else if (currentStatus === 'Approved' && newStatus !== 'Published') {
    chapter.scheduledPublishAt = undefined;
  }

  chapter.status = newStatus;
  await chapter.save();

  await WorkflowEvent.create({
    entityType: 'Chapter',
    entityId: chapter._id,
    action: `${currentStatus.toLowerCase()}_to_${newStatus.toLowerCase()}`,
    fromStatus: currentStatus,
    toStatus: newStatus,
    actorId: userId,
    actorRole: userRole,
  });

  if (newStatus === 'Published') {
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
  if (newStatus === 'Reviewing') {
    try {
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

