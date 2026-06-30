import mongoose, { Schema, Document } from 'mongoose';

export interface IEBVote extends Document {
  seriesId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  decision: 'approved' | 'rejected';
  comments?: string;
  rubric?: Record<string, number>;
  createdAt: Date;
}

const ebVoteSchema = new Schema<IEBVote>(
  {
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['approved', 'rejected'], required: true },
    comments: { type: String },
    rubric: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ebVoteSchema.index({ seriesId: 1, memberId: 1 }, { unique: true });
ebVoteSchema.index({ seriesId: 1 });

export const EBVote = mongoose.model<IEBVote>('EBVote', ebVoteSchema);

