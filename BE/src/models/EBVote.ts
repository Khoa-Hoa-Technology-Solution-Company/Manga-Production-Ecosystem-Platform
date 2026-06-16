import mongoose, { Schema, Document } from 'mongoose';

export interface IRubric {
  artStyle: number;
  storytelling: number;
  characterDesign: number;
  pacing: number;
  commercialPotential: number;
}

export interface IEBVote extends Document {
  seriesId: mongoose.Types.ObjectId;
  memberId: mongoose.Types.ObjectId;
  decision: 'approved' | 'rejected';
  comments?: string;
  rubric?: IRubric;
  createdAt: Date;
}

const rubricSchema = new Schema<IRubric>(
  {
    artStyle: { type: Number, min: 1, max: 10, default: 5 },
    storytelling: { type: Number, min: 1, max: 10, default: 5 },
    characterDesign: { type: Number, min: 1, max: 10, default: 5 },
    pacing: { type: Number, min: 1, max: 10, default: 5 },
    commercialPotential: { type: Number, min: 1, max: 10, default: 5 },
  },
  { _id: false }
);

const ebVoteSchema = new Schema<IEBVote>(
  {
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    decision: { type: String, enum: ['approved', 'rejected'], required: true },
    comments: { type: String },
    rubric: { type: rubricSchema },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ebVoteSchema.index({ seriesId: 1, memberId: 1 }, { unique: true });
ebVoteSchema.index({ seriesId: 1 });

export const EBVote = mongoose.model<IEBVote>('EBVote', ebVoteSchema);

