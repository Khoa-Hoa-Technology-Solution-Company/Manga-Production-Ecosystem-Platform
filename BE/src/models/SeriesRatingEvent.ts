import mongoose, { Document, Schema } from 'mongoose';

export interface ISeriesRatingEvent extends Document {
  userId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  action: 'created' | 'updated' | 'deleted';
  rating?: number;
  previousRating?: number;
  createdAt: Date;
}

const seriesRatingEventSchema = new Schema<ISeriesRatingEvent>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    action: { type: String, enum: ['created', 'updated', 'deleted'], required: true },
    rating: { type: Number, min: 1, max: 5 },
    previousRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

seriesRatingEventSchema.index({ seriesId: 1, createdAt: -1 });
seriesRatingEventSchema.index({ userId: 1, seriesId: 1, createdAt: -1 });

export const SeriesRatingEvent = mongoose.model<ISeriesRatingEvent>('SeriesRatingEvent', seriesRatingEventSchema);
