import mongoose, { Schema, Document } from 'mongoose';

export type ChapterStatus = 'Draft' | 'Reviewing' | 'Approved' | 'Published';

export interface IChapterMember {
  userId: mongoose.Types.ObjectId;
  role: 'mangaka' | 'assistant' | 'editor';
  canEdit: boolean;
  canComment: boolean;
  canInvite: boolean;
  invitedBy?: mongoose.Types.ObjectId;
  invitedAt?: Date;
  acceptedAt?: Date;
}

export interface IChapter extends Document {
  seriesId: mongoose.Types.ObjectId;
  chapterNumber: number;
  title: string;
  status: ChapterStatus;
  mangakaId: mongoose.Types.ObjectId;
  editorId?: mongoose.Types.ObjectId;
  collaborators: IChapterMember[];
  totalPages: number;
  progress: number;
  views: number;
  publishedAt?: Date;
  publicationDeadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const chapterSchema = new Schema<IChapter>(
  {
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    chapterNumber: { type: Number, required: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Draft', 'Reviewing', 'Approved', 'Published'], default: 'Draft' },
    mangakaId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    collaborators: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['mangaka', 'assistant', 'editor'], required: true },
        canEdit: { type: Boolean, default: true },
        canComment: { type: Boolean, default: true },
        canInvite: { type: Boolean, default: false },
        invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        invitedAt: { type: Date },
        acceptedAt: { type: Date },
      },
    ],
    totalPages: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date },
    publicationDeadline: { type: Date },
  },
  { timestamps: true }
);

chapterSchema.index({ seriesId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ status: 1 });

export const Chapter = mongoose.model<IChapter>('Chapter', chapterSchema);
