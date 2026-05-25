import { Notification, NotificationType } from '../models/Notification';
import { emitToUser } from '../socket';

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
