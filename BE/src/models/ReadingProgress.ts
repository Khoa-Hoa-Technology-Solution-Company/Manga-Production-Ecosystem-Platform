import mongoose, { Document, Schema } from 'mongoose';

export interface IReadingProgress extends Document {
  userId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  chapterIndex: number;
  pageIndex: number;
  percentage: number;
  completed: boolean;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const readingProgressSchema = new Schema<IReadingProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    chapterIndex: { type: Number, required: true, min: 0 },
    pageIndex: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    completed: { type: Boolean, default: false },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

readingProgressSchema.index({ userId: 1, seriesId: 1 }, { unique: true });
readingProgressSchema.index({ userId: 1, lastReadAt: -1 });

export const ReadingProgress = mongoose.model<IReadingProgress>(
  'ReadingProgress',
  readingProgressSchema
);
