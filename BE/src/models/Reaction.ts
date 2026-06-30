import mongoose, { Schema, Document } from 'mongoose';

export interface IReaction extends Document {
  userId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId; // optional, can react to chapter or series
  emoji: string;
  createdAt: Date;
}

const reactionSchema = new Schema<IReaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter' },
    emoji: { type: String, required: true, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Ensure a user can only have one emoji reaction per target (series or series+chapter)
reactionSchema.index({ userId: 1, seriesId: 1, chapterId: 1 }, { unique: true });
reactionSchema.index({ seriesId: 1, chapterId: 1 });

export const Reaction = mongoose.model<IReaction>('Reaction', reactionSchema);
