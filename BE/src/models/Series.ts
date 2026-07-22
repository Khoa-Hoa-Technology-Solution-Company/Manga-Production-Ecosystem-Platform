import mongoose, { Schema, Document } from 'mongoose';
import { SERIES_TAG_OPTIONS } from '../constants/series-tags';

export interface IDedicatedAssistant {
  userId: mongoose.Types.ObjectId;
  addedAt: Date;
}

export interface ICharacterDesign {
  name: string;
  role: string;
  description?: string;
  image?: string;
}

export interface ISeries extends Document {
  title: string;
  description: string;
  genre: string[];
  tags?: string[];
  coverImage?: string;
  mangakaId: mongoose.Types.ObjectId;
  editorId?: mongoose.Types.ObjectId;
  status: 'Draft' | 'Pending_Editor' | 'Pending_EB' | 'Active' | 'Rejected' | 'Completed' | 'Hiatus' | 'Cancelled';
  rejectionNotes?: string;
  totalChapters: number;
  totalVotes: number;
  weeklyVotes: number;
  readerCount: number;
  averageRating: number;
  ratingCount: number;
  publicationMode?: 'immediate' | 'scheduled';
  publicationSchedule?: 'weekly' | 'monthly';
  publicationStartAt?: Date;
  nextPublicationAt?: Date;
  publicationStartedAt?: Date;
  lastPublishedAt?: Date;
  publicationApprovedBy?: mongoose.Types.ObjectId;
  cancellationRisk: boolean;
  deadline?: Date;
  editorStatus?: 'pending' | 'accepted' | 'rejected' | 'none';
  editorInvitedBy?: mongoose.Types.ObjectId;
  editorInvitedAt?: Date;
  editorRespondedAt?: Date;
  ebReviewStartedAt?: Date;
  dedicatedAssistants: IDedicatedAssistant[];
  subscribers?: mongoose.Types.ObjectId[];
  script?: string;
  scriptFile?: string;
  characterDesigns: ICharacterDesign[];
  createdAt: Date;
  updatedAt: Date;
}

const seriesSchema = new Schema<ISeries>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    genre: [{ type: String, required: true }],
    tags: [{ type: String, enum: SERIES_TAG_OPTIONS }],
    coverImage: { type: String },
    mangakaId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    editorId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Draft', 'Pending_Editor', 'Pending_EB', 'Active', 'Rejected', 'Completed', 'Hiatus', 'Cancelled'], default: 'Draft' },
    rejectionNotes: { type: String },
    totalChapters: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    weeklyVotes: { type: Number, default: 0 },
    readerCount: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    publicationMode: { type: String, enum: ['immediate', 'scheduled'] },
    publicationSchedule: { type: String, enum: ['weekly', 'monthly'] },
    publicationStartAt: { type: Date },
    nextPublicationAt: { type: Date },
    publicationStartedAt: { type: Date },
    lastPublishedAt: { type: Date },
    publicationApprovedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    cancellationRisk: { type: Boolean, default: false },
    deadline: { type: Date },
    editorStatus: { type: String, enum: ['pending', 'accepted', 'rejected', 'none'], default: 'none' },
    editorInvitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    editorInvitedAt: { type: Date },
    editorRespondedAt: { type: Date },
    ebReviewStartedAt: { type: Date },
    dedicatedAssistants: [
      {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    subscribers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    script: { type: String },
    scriptFile: { type: String },
    characterDesigns: [
      {
        name: { type: String, required: true },
        role: { type: String },
        description: { type: String },
        image: { type: String },
      },
    ],
  },
  { timestamps: true }
);

seriesSchema.index({ mangakaId: 1 });
seriesSchema.index({ status: 1 });
seriesSchema.index({ weeklyVotes: -1 });
seriesSchema.index({ publicationMode: 1, nextPublicationAt: 1 });

export const Series = mongoose.model<ISeries>('Series', seriesSchema);
