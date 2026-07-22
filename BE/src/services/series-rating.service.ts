import { Types } from 'mongoose';
import { Series } from '../models/Series';
import { SeriesRating } from '../models/SeriesRating';

export async function recalculateSeriesRating(seriesId: string | Types.ObjectId) {
  const objectId = typeof seriesId === 'string' ? new Types.ObjectId(seriesId) : seriesId;
  const [summary] = await SeriesRating.aggregate<{ averageRating: number; ratingCount: number }>([
    { $match: { seriesId: objectId } },
    { $group: { _id: null, averageRating: { $avg: '$rating' }, ratingCount: { $sum: 1 } } },
  ]);

  const averageRating = Math.round((summary?.averageRating || 0) * 10) / 10;
  const ratingCount = summary?.ratingCount || 0;
  await Series.findByIdAndUpdate(objectId, {
    averageRating,
    ratingCount,
    totalVotes: ratingCount,
  });

  return { averageRating, ratingCount };
}
