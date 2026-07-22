import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'task_assigned' | 'task_submitted' | 'task_declined' | 'task_revision' | 'task_cancelled' | 'chapter_status' | 'vote' | 'comment' | 'deadline' | 'system';
export type NotificationTarget =
  | 'tasks'
  | 'mangaka_task_review'
  | 'chapter_context'
  | 'editor_chapter_review'
  | 'mangaka_series'
  | 'assistant_series'
  | 'editor_portfolio'
  | 'editor_approvals'
  | 'eb_assign_editor'
  | 'eb_votes'
  | 'eb_meetings'
  | 'reader_series'
  | 'reader_chapter';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: mongoose.Types.ObjectId;
  relatedType?: string;
  target?: NotificationTarget;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['task_assigned', 'task_submitted', 'task_declined', 'task_revision', 'task_cancelled', 'chapter_status', 'vote', 'comment', 'deadline', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: { type: Schema.Types.ObjectId },
    relatedType: { type: String },
    target: {
      type: String,
      enum: [
        'tasks', 'mangaka_task_review', 'chapter_context', 'editor_chapter_review',
        'mangaka_series', 'assistant_series', 'editor_portfolio', 'editor_approvals',
        'eb_assign_editor', 'eb_votes', 'eb_meetings', 'reader_series', 'reader_chapter',
      ],
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);
