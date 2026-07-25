import mongoose, { Document, Schema } from 'mongoose';

export interface ICancellationVote extends Document {
  meetingId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  decision: 'cancel' | 'continue';
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

const cancellationVoteSchema = new Schema<ICancellationVote>(
  {
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['cancel', 'continue'], required: true },
    comments: { type: String, trim: true },
  },
  { timestamps: true }
);

cancellationVoteSchema.index({ meetingId: 1, seriesId: 1, memberId: 1 }, { unique: true });
cancellationVoteSchema.index({ seriesId: 1, createdAt: -1 });

export const CancellationVote = mongoose.model<ICancellationVote>('CancellationVote', cancellationVoteSchema);
