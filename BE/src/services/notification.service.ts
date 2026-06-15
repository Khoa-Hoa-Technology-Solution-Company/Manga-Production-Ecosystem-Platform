import { Notification, NotificationType } from '../models/Notification';
import { emitToUser } from '../socket';
import { User } from '../models/User';
import { Series } from '../models/Series';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const notification = await Notification.create(input);

    // Emit real-time notification via Socket.io
    try {
      emitToUser(input.userId, 'notification:new', notification);
    } catch {
      // Socket may not be initialized in seed/test
    }
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyTaskAssigned(
  assistantId: string,
  taskTitle: string,
  seriesTitle: string,
  taskId: string
): Promise<void> {
  await createNotification({
    userId: assistantId,
    type: 'task_assigned',
    title: 'New Task Available',
    message: `You have been assigned "${taskTitle}" for ${seriesTitle}.`,
    relatedId: taskId,
    relatedType: 'Task',
  });
}

export async function notifyTaskCancelled(
  assistantId: string,
  taskTitle: string,
  seriesTitle: string,
  taskId: string
): Promise<void> {
  await createNotification({
    userId: assistantId,
    type: 'task_cancelled',
    title: 'Task Cancelled',
    message: `The task "${taskTitle}" for series "${seriesTitle}" has been cancelled by the Mangaka.`,
    relatedId: taskId,
    relatedType: 'Task',
  });
}

export async function notifyTaskSubmitted(
  mangakaId: string,
  assistantName: string,
  taskTitle: string,
  taskId: string
): Promise<void> {
  await createNotification({
    userId: mangakaId,
    type: 'task_submitted',
    title: 'Task Submitted',
    message: `${assistantName} submitted work for "${taskTitle}". Please review.`,
    relatedId: taskId,
    relatedType: 'Task',
  });
}

export async function notifyChapterStatusChange(
  userId: string,
  chapterTitle: string,
  newStatus: string,
  chapterId: string
): Promise<void> {
  await createNotification({
    userId,
    type: 'chapter_status',
    title: 'Chapter Status Updated',
    message: `"${chapterTitle}" has been moved to ${newStatus}.`,
    relatedId: chapterId,
    relatedType: 'Chapter',
  });
}

export async function notifyTaskDeclined(
  mangakaId: string,
  assistantName: string,
  taskTitle: string,
  taskId: string
): Promise<void> {
  await createNotification({
    userId: mangakaId,
    type: 'task_declined',
    title: 'Task Declined',
    message: `${assistantName} declined your designated task "${taskTitle}".`,
    relatedId: taskId,
    relatedType: 'Task',
  });
}

export async function notifyTaskRevision(
  assistantId: string,
  taskTitle: string,
  reviewNotes: string,
  taskId: string
): Promise<void> {
  await createNotification({
    userId: assistantId,
    type: 'task_revision',
    title: 'Revision Required',
    message: `Mangaka requested revision on task "${taskTitle}". Feedback: ${reviewNotes || 'No additional feedback.'}`,
    relatedId: taskId,
    relatedType: 'Task',
  });
}

export async function notifySeriesSubmitted(
  editorId: string,
  mangakaName: string,
  seriesTitle: string,
  seriesId: string
): Promise<void> {
  await createNotification({
    userId: editorId,
    type: 'system',
    title: 'Series Submitted for Review',
    message: `Mangaka ${mangakaName} submitted the series "${seriesTitle}" for your Tantou review.`,
    relatedId: seriesId,
    relatedType: 'Series',
  });
}

export async function notifySeriesApproved(
  mangakaId: string,
  seriesTitle: string,
  seriesId: string
): Promise<void> {
  await createNotification({
    userId: mangakaId,
    type: 'system',
    title: 'Series Approved by Editor',
    message: `Tantou Editor approved and submitted your series "${seriesTitle}" to the Editorial Board.`,
    relatedId: seriesId,
    relatedType: 'Series',
  });
}

export async function notifySeriesRejected(
  mangakaId: string,
  seriesTitle: string,
  rejectionNotes: string,
  seriesId: string
): Promise<void> {
  await createNotification({
    userId: mangakaId,
    type: 'system',
    title: 'Series Revision Required',
    message: `Tantou Editor sent back your series "${seriesTitle}" for revision. Feedback: ${rejectionNotes || 'No comments.'}`,
    relatedId: seriesId,
    relatedType: 'Series',
  });
}

export async function notifySeriesPublished(
  mangakaId: string,
  editorId: string | undefined,
  seriesTitle: string,
  seriesId: string
): Promise<void> {
  await createNotification({
    userId: mangakaId,
    type: 'system',
    title: 'Series Published!',
    message: `Editorial Board approved and published your series "${seriesTitle}".`,
    relatedId: seriesId,
    relatedType: 'Series',
  });

  if (editorId) {
    await createNotification({
      userId: editorId,
      type: 'system',
      title: 'Series Published!',
      message: `Editorial Board approved and published your assigned series "${seriesTitle}".`,
      relatedId: seriesId,
      relatedType: 'Series',
    });
  }
}

export async function notifySeriesEBRejected(
  mangakaId: string,
  seriesTitle: string,
  rejectionNotes: string,
  seriesId: string
): Promise<void> {
  await createNotification({
    userId: mangakaId,
    type: 'system',
    title: 'Series Rejected by Board',
    message: `Editorial Board sent back your series "${seriesTitle}" for revision. Feedback: ${rejectionNotes || 'No comments.'}`,
    relatedId: seriesId,
    relatedType: 'Series',
  });
}

export async function notifyNewSeriesToSubscribers(
  seriesId: string,
  seriesTitle: string
): Promise<void> {
  try {
    const subscribers = await User.find({ subscribedToNewSeries: true, isActive: true });
    for (const sub of subscribers) {
      await createNotification({
        userId: sub._id.toString(),
        type: 'system',
        title: 'New Series Released!',
        message: `A brand new series "${seriesTitle}" has just been published! Check it out now.`,
        relatedId: seriesId,
        relatedType: 'Series',
      });
    }
  } catch (err) {
    console.error('Failed to notify subscribers of new series:', err);
  }
}

export async function notifyNewChapterToSubscribers(
  seriesId: string,
  chapterId: string,
  chapterTitle: string,
  chapterNumber: number
): Promise<void> {
  try {
    const series = await Series.findById(seriesId);
    if (!series) return;

    const subscriberIds = series.subscribers || [];
    if (subscriberIds.length === 0) return;

    for (const subId of subscriberIds) {
      await createNotification({
        userId: subId.toString(),
        type: 'chapter_status',
        title: 'New Chapter Released!',
        message: `Chapter ${chapterNumber} - "${chapterTitle}" of series "${series.title}" has just been published!`,
        relatedId: chapterId,
        relatedType: 'Chapter',
      });
    }
  } catch (err) {
    console.error('Failed to notify subscribers of new chapter:', err);
  }
}

export async function notifyChapterSubmittedToEditor(
  editorId: string,
  mangakaName: string,
  chapterTitle: string,
  chapterNumber: number,
  seriesTitle: string,
  chapterId: string
): Promise<void> {
  await createNotification({
    userId: editorId,
    type: 'chapter_status',
    title: 'Chapter Submitted for Review',
    message: `Mangaka ${mangakaName} submitted Chapter ${chapterNumber} – "${chapterTitle}" of "${seriesTitle}" for your review.`,
    relatedId: chapterId,
    relatedType: 'Chapter',
  });
}
