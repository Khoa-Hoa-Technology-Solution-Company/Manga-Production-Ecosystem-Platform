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
  /** Editorial Board members who may cast a vote. */
  participants: mongoose.Types.ObjectId[];
  /** Editors invited to attend the meeting without voting rights. */
  attendees: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  rubricTemplateId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    dateTime: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 200 },
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
    decisionReason: { type: String, trim: true, maxlength: 2000 },
    finalizedAt: { type: Date },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    seriesIds: [{ type: Schema.Types.ObjectId, ref: 'Series' }],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    attendees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rubricTemplateId: { type: Schema.Types.ObjectId, ref: 'RubricTemplate' },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
