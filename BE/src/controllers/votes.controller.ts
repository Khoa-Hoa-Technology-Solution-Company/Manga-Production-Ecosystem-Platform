import { Request, Response } from 'express';
import { Vote } from '../models/Vote';
import { Series } from '../models/Series';
import { emitToRoom } from '../socket';

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

    // Emit the updated stats to the chapter room
    const [newTotalVotes, avgRatingData, reactions] = await Promise.all([
      Vote.countDocuments({ chapterId }),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, reaction: { $ne: null } } },
        { $group: { _id: '$reaction', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    emitToRoom(`chapter:${chapterId}`, 'vote:new', {
      totalVotes: newTotalVotes,
      avgRating: avgRatingData[0]?.avg || 0,
      ratingCount: avgRatingData[0]?.count || 0,
      reactions,
    });

    res.json({ vote, message: 'Vote recorded.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getVotes(req: Request, res: Response): Promise<void> {
  try {
    const chapterId = req.params.id;
    const [totalVotes, avgRatingData, reactions] = await Promise.all([
      Vote.countDocuments({ chapterId }),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, reaction: { $ne: null } } },
        { $group: { _id: '$reaction', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const userVote = await Vote.findOne({ userId: req.user!._id, chapterId });

    res.json({
      totalVotes,
      avgRating: avgRatingData[0]?.avg || 0,
      ratingCount: avgRatingData[0]?.count || 0,
      reactions,
      userVote: userVote ? { rating: userVote.rating, reaction: userVote.reaction, voted: true } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
