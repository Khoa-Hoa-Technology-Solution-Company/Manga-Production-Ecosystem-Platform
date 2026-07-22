import mongoose, { Document, Schema } from 'mongoose';

export interface ISeriesRating extends Document {
  userId: mongoose.Types.ObjectId;
  seriesId: mongoose.Types.ObjectId;
  rating: number;
  source: 'reader' | 'chapter_rating_migration';
  createdAt: Date;
  updatedAt: Date;
}

const seriesRatingSchema = new Schema<ISeriesRating>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    seriesId: { type: Schema.Types.ObjectId, ref: 'Series', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    source: { type: String, enum: ['reader', 'chapter_rating_migration'], default: 'reader' },
  },
  { timestamps: true }
);

seriesRatingSchema.index({ userId: 1, seriesId: 1 }, { unique: true });
seriesRatingSchema.index({ seriesId: 1, createdAt: -1 });

export const SeriesRating = mongoose.model<ISeriesRating>('SeriesRating', seriesRatingSchema);
