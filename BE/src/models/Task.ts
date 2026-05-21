import mongoose, { Schema, Document } from 'mongoose';

export type TaskType = 'inking' | 'background' | 'tone' | 'lettering' | 'effects';
export type TaskStatus = 'open' | 'assigned' | 'in_progress' | 'review' | 'done';

export interface ITask extends Document {
  zoneId?: mongoose.Types.ObjectId;
  pageId?: mongoose.Types.ObjectId;
  chapterId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  type: TaskType;
  title: string;
  description?: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  status: TaskStatus;
  wage: number;
  deadline: Date;
  submittedFile?: string;
  reviewNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    zoneId: { type: Schema.Types.ObjectId, ref: 'Zone' },
    pageId: { type: Schema.Types.ObjectId, ref: 'Page' },
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    type: { type: String, enum: ['inking', 'background', 'tone', 'lettering', 'effects'], required: true },
    title: { type: String, required: true },
    description: { type: String },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'review', 'done'], default: 'open' },
    wage: { type: Number, required: true, default: 0 },
    deadline: { type: Date, required: true },
    submittedFile: { type: String },
    reviewNotes: { type: String },
  },
  { timestamps: true }
);

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ seriesId: 1 });
taskSchema.index({ chapterId: 1 });

export const Task = mongoose.model<ITask>('Task', taskSchema);
