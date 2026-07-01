import mongoose, { Schema, Document } from 'mongoose';

export interface ILayer extends Document {
  pageId: mongoose.Types.ObjectId;
  name: string;
  imageUrl: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const layerSchema = new Schema<ILayer>(
  {
    pageId: { type: Schema.Types.ObjectId, ref: 'Page', required: true },
    name: { type: String, required: true },
    imageUrl: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

layerSchema.index({ pageId: 1 });

export const Layer = mongoose.model<ILayer>('Layer', layerSchema);
