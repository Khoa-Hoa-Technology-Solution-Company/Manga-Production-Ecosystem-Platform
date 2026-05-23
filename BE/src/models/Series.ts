import mongoose, { Schema, Document } from 'mongoose';

export interface ISeries extends Document {
  title: string;
  description: string;
  genre: string[];
  coverImage?: string;
  mangakaId: mongoose.Types.ObjectId;
  editorId?: mongoose.Types.ObjectId;
  status: 'Draft' | 'Submitted' | 'Needs Revision' | 'Approved by Editor' | 'Board Review' | 'Published' | 'Rejected' | 'Active' | 'Completed' | 'Hiatus';
  submissionNotes?: string;
  reviewNotes?: string;
  totalChapters: number;
  totalVotes: number;
  weeklyVotes: number;
  readerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const seriesSchema = new Schema<ISeries>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    genre: [{ type: String, required: true }],
    coverImage: { type: String },
    mangakaId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Draft', 'Submitted', 'Needs Revision', 'Approved by Editor', 'Board Review', 'Published', 'Rejected', 'Active', 'Completed', 'Hiatus'], default: 'Draft' },
    submissionNotes: { type: String },
    reviewNotes: { type: String },
    totalChapters: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    weeklyVotes: { type: Number, default: 0 },
    readerCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

seriesSchema.index({ mangakaId: 1 });
seriesSchema.index({ status: 1 });
seriesSchema.index({ weeklyVotes: -1 });

export const Series = mongoose.model<ISeries>('Series', seriesSchema);
