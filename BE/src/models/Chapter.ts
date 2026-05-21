import mongoose, { Schema, Document } from 'mongoose';

export type ChapterStatus = 'Draft' | 'Reviewing' | 'Approved' | 'Published';

export interface IChapter extends Document {
  seriesId: mongoose.Types.ObjectId;
  chapterNumber: number;
  title: string;
  status: ChapterStatus;
  mangakaId: mongoose.Types.ObjectId;
  editorId?: mongoose.Types.ObjectId;
  totalPages: number;
  progress: number;
  publishedAt?: Date;
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
    totalPages: { type: Number, default: 0 },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

chapterSchema.index({ seriesId: 1, chapterNumber: 1 }, { unique: true });
chapterSchema.index({ status: 1 });

export const Chapter = mongoose.model<IChapter>('Chapter', chapterSchema);
