import mongoose, { Document, Schema } from 'mongoose';

export interface IReaderActivityEvent extends Document {
  userId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  activityDate: string;
  maxPercentage: number;
  completed: boolean;
  lastReadAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const readerActivityEventSchema = new Schema<IReaderActivityEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    // One document per reader/chapter/day keeps frequent progress autosaves from inflating rankings.
    activityDate: { type: String, required: true },
    maxPercentage: { type: Number, min: 0, max: 100, default: 0 },
    completed: { type: Boolean, default: false },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

readerActivityEventSchema.index(
  { userId: 1, chapterId: 1, activityDate: 1 },
  { unique: true }
);
readerActivityEventSchema.index({ activityDate: 1, userId: 1 });

export const ReaderActivityEvent = mongoose.model<IReaderActivityEvent>(
  'ReaderActivityEvent',
  readerActivityEventSchema
);
