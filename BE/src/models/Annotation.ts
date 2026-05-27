import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnotation extends Document {
  chapterId: mongoose.Types.ObjectId;
  pageId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  x: number; // percentage coordinate (0 to 100)
  y: number; // percentage coordinate (0 to 100)
  note: string;
  source: 'review' | 'tracking';
  status: 'open' | 'resolved';
  createdAt: Date;
  updatedAt: Date;
}

const annotationSchema = new Schema<IAnnotation>(
  {
    chapterId: { type: Schema.Types.ObjectId, ref: 'Chapter', required: true },
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    x: { type: Number, required: true, min: 0, max: 100 },
    y: { type: Number, required: true, min: 0, max: 100 },
    note: { type: String, required: true, trim: true },
    source: { type: String, enum: ['review', 'tracking'], default: 'tracking' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  },
  { timestamps: true }
);

annotationSchema.index({ chapterId: 1 });
annotationSchema.index({ pageId: 1 });

export const Annotation = mongoose.model<IAnnotation>('Annotation', annotationSchema);
