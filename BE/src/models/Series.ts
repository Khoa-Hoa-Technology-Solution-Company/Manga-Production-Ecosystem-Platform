import mongoose, { Schema, Document } from 'mongoose';

export interface IDedicatedAssistant {
  userId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface ISeries extends Document {
  title: string;
  description: string;
  genre: string[];
  coverImage?: string;
  mangakaId: mongoose.Types.ObjectId;
  editorId?: mongoose.Types.ObjectId;
  status: 'Draft' | 'Pending_Editor' | 'Pending_EB' | 'Active' | 'Rejected' | 'Completed' | 'Hiatus' | 'Cancelled';
  rejectionNotes?: string;
  totalChapters: number;
  totalVotes: number;
  weeklyVotes: number;
  readerCount: number;
  publicationSchedule?: 'weekly' | 'monthly';
  cancellationRisk: boolean;
  deadline?: Date;
  editorStatus?: 'pending' | 'accepted' | 'rejected' | 'none';
  dedicatedAssistants: IDedicatedAssistant[];
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
    status: { type: String, enum: ['Draft', 'Pending_Editor', 'Pending_EB', 'Active', 'Rejected', 'Completed', 'Hiatus', 'Cancelled'], default: 'Draft' },
    rejectionNotes: { type: String },
    totalChapters: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    weeklyVotes: { type: Number, default: 0 },
    readerCount: { type: Number, default: 0 },
    publicationSchedule: { type: String, enum: ['weekly', 'monthly'] },
    cancellationRisk: { type: Boolean, default: false },
    deadline: { type: Date },
    editorStatus: { type: String, enum: ['pending', 'accepted', 'rejected', 'none'], default: 'none' },
    dedicatedAssistants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

seriesSchema.index({ mangakaId: 1 });
seriesSchema.index({ status: 1 });
seriesSchema.index({ weeklyVotes: -1 });

export const Series = mongoose.model<ISeries>('Series', seriesSchema);
