import mongoose, { Schema, Document } from 'mongoose';

export interface IMeeting extends Document {
  title: string;
  description?: string;
  dateTime: Date;
  location?: string;
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
    seriesIds: [{ type: Schema.Types.ObjectId, ref: 'Series' }],
    participants: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rubricTemplateId: { type: Schema.Types.ObjectId, ref: 'RubricTemplate' },
  },
  { timestamps: true }
);

export const Meeting = mongoose.model<IMeeting>('Meeting', meetingSchema);
