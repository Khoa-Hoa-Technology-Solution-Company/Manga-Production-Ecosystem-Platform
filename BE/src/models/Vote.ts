import mongoose, { Schema, Document } from 'mongoose';

export interface IVote extends Document {
  userId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  rating?: number;
  reaction?: string;
  createdAt: Date;
}

const voteSchema = new Schema<IVote>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    rating: { type: Number, min: 1, max: 5 },
    reaction: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

voteSchema.index({ userId: 1, chapterId: 1 }, { unique: true });
voteSchema.index({ seriesId: 1 });

export const Vote = mongoose.model<IVote>('Vote', voteSchema);
