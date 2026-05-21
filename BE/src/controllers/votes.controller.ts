import { Request, Response } from 'express';
import { Vote } from '../models/Vote';
import { Series } from '../models/Series';

export async function voteForChapter(req: Request, res: Response): Promise<void> {
  try {
    const { rating, reaction } = req.body;
    const chapterId = req.params.id;
    const userId = req.user!._id;

    // Upsert vote (one per user per chapter)
    const vote = await Vote.findOneAndUpdate(
      { userId, chapterId },
      { userId, chapterId, seriesId: req.body.seriesId, rating, reaction },
      { upsert: true, new: true, runValidators: true }
    );

    // Update series vote count
    if (req.body.seriesId) {
      const totalVotes = await Vote.countDocuments({ seriesId: req.body.seriesId });
      await Series.findByIdAndUpdate(req.body.seriesId, { totalVotes });
    }

    res.json({ vote, message: 'Vote recorded.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getVotes(req: Request, res: Response): Promise<void> {
  try {
    const chapterId = req.params.id;
    const [totalVotes, avgRating, reactions] = await Promise.all([
      Vote.countDocuments({ chapterId }),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, reaction: { $ne: null } } },
        { $group: { _id: '$reaction', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      totalVotes,
      avgRating: avgRating[0]?.avg || 0,
      reactions,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
