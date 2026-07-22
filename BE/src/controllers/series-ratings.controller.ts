import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Chapter } from '../models/Chapter';
import { Series } from '../models/Series';
import { SeriesRating } from '../models/SeriesRating';
import { SeriesRatingEvent } from '../models/SeriesRatingEvent';
import { emitToRoom } from '../socket';
import { recalculateSeriesRating } from '../services/series-rating.service';

async function findRateableSeries(seriesId: string) {
  if (!Types.ObjectId.isValid(seriesId)) return null;
  return Series.findOne({ _id: seriesId, status: { $in: ['Active', 'Completed'] } });
}

export async function getSeriesRating(req: Request, res: Response): Promise<void> {
  try {
    const seriesId = String(req.params.id);
    if (!Types.ObjectId.isValid(seriesId)) {
      res.status(400).json({ error: 'Invalid series ID.' });
      return;
    }

    const series = await Series.findById(seriesId).select('averageRating ratingCount status');
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    const userRating = await SeriesRating.findOne({ userId: req.user!._id, seriesId }).select('rating updatedAt');
    res.json({
      averageRating: series.averageRating || 0,
      ratingCount: series.ratingCount || 0,
      userRating: userRating?.rating || 0,
      updatedAt: userRating?.updatedAt,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function rateSeries(req: Request, res: Response): Promise<void> {
  try {
    const seriesId = String(req.params.id);
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'Rating must be an integer from 1 to 5.' });
      return;
    }

    const series = await findRateableSeries(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Published series not found.' });
      return;
    }

    const hasPublishedChapter = await Chapter.exists({ seriesId: series._id, status: 'Published' });
    if (!hasPublishedChapter) {
      res.status(400).json({ error: 'A series can only be rated after it has a published chapter.' });
      return;
    }

    const existing = await SeriesRating.findOne({ userId: req.user!._id, seriesId: series._id });
    const action = existing ? 'updated' : 'created';
    const previousRating = existing?.rating;
    const userRating = await SeriesRating.findOneAndUpdate(
      { userId: req.user!._id, seriesId: series._id },
      { $set: { rating, source: 'reader' }, $setOnInsert: { userId: req.user!._id, seriesId: series._id } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (!existing || previousRating !== rating) {
      await SeriesRatingEvent.create({
        userId: req.user!._id,
        seriesId: series._id,
        action,
        rating,
        previousRating,
      });
    }

    const summary = await recalculateSeriesRating(series._id);
    const payload = { ...summary, userRating: userRating.rating };
    emitToRoom(`series:${seriesId}`, 'series:rating:updated', summary);
    res.json(payload);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteSeriesRating(req: Request, res: Response): Promise<void> {
  try {
    const seriesId = String(req.params.id);
    if (!Types.ObjectId.isValid(seriesId)) {
      res.status(400).json({ error: 'Invalid series ID.' });
      return;
    }

    const existing = await SeriesRating.findOneAndDelete({ userId: req.user!._id, seriesId });
    if (existing) {
      await SeriesRatingEvent.create({
        userId: req.user!._id,
        seriesId: existing.seriesId,
        action: 'deleted',
        previousRating: existing.rating,
      });
    }

    const summary = await recalculateSeriesRating(seriesId);
    emitToRoom(`series:${seriesId}`, 'series:rating:updated', summary);
    res.json({ ...summary, userRating: 0, removed: !!existing });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
