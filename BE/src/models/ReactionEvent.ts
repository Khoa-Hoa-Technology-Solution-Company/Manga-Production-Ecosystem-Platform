import mongoose, { Document, Schema } from 'mongoose';

export interface IReactionEvent extends Document {
  userId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  action: 'set' | 'removed';
  emoji?: string;
  previousEmoji?: string;
  createdAt: Date;
}

const reactionEventSchema = new Schema<IReactionEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    action: { type: String, enum: ['set', 'removed'], required: true },
    emoji: { type: String, trim: true },
    previousEmoji: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reactionEventSchema.index({ seriesId: 1, createdAt: -1 });
reactionEventSchema.index({ chapterId: 1, createdAt: -1 });

export const ReactionEvent = mongoose.model<IReactionEvent>('ReactionEvent', reactionEventSchema);
