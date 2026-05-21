import mongoose, { Schema, Document } from 'mongoose';

export type ZoneType = 'background' | 'characters' | 'effects' | 'dialog' | 'sfx';

export interface IZone extends Document {
  pageId: mongoose.Types.ObjectId;
  name: string;
  type: ZoneType;
  color: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  assignedTo?: mongoose.Types.ObjectId;
  status: 'open' | 'assigned' | 'in_progress' | 'review' | 'done';
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}

const zoneSchema = new Schema<IZone>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['background', 'characters', 'effects', 'dialog', 'sfx'], required: true },
    color: { type: String, default: '#3b82f6' },
    boundingBox: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['open', 'assigned', 'in_progress', 'review', 'done'], default: 'open' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
  },
  { timestamps: true }
);

zoneSchema.index({ pageId: 1 });

export const Zone = mongoose.model<IZone>('Zone', zoneSchema);
