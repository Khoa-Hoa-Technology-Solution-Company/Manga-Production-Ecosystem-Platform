import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  description?: string;
  dateTime: Date;
  location?: string;
  purpose: 'proposal_review' | 'cancellation_review';
  decisionStatus: 'open' | 'cancelled' | 'continued';
  decisionReason?: string;
  finalizedAt?: Date;
  finalizedBy?: mongoose.Types.ObjectId;
  seriesIds: mongoose.Types.ObjectId[];
  participants: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  rubricTemplateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    dateTime: { type: Date, required: true },
    location: { type: String, trim: true },
    purpose: {
      type: String,
      enum: ['proposal_review', 'cancellation_review'],
      default: 'proposal_review',
    },
    decisionStatus: {
      type: String,
      enum: ['open', 'cancelled', 'continued'],
      default: 'open',
    },
    decisionReason: { type: String, trim: true },
    finalizedAt: { type: Date },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    seriesIds: [{ type: Schema.Types.ObjectId, ref: 'Series' }],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rubricTemplateId: { type: Schema.Types.ObjectId, ref: 'RubricTemplate' },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
