import mongoose, { Schema, Document } from 'mongoose';

export interface IPage extends Document {
  chapterId: mongoose.Types.ObjectId;
  pageNumber: number;
  originalImage: string;
  processedImage?: string;
  compositeImage?: string;
  layerOrder: Array<{ taskId: mongoose.Types.ObjectId; position: number }>;
  width: number;
  height: number;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    pageNumber: { type: Number, required: true },
    originalImage: { type: String, required: true },
    processedImage: { type: String },
    compositeImage: { type: String },
    layerOrder: [
      {
        taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
        position: { type: Number },
      },
    ],
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { timestamps: true }
);

pageSchema.index({ chapterId: 1, pageNumber: 1 }, { unique: true });

export const Page = mongoose.model<IPage>('Page', pageSchema);
