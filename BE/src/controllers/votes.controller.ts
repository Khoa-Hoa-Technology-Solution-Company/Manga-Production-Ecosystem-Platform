import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Vote } from '../models/Vote';
import { Series } from '../models/Series';
import { Reaction } from '../models/Reaction';
import { emitToRoom } from '../socket';

export async function voteForChapter(req: Request, res: Response): Promise<void> {
  try {
    const { rating } = req.body;
    const chapterId = req.params.id as string;
    const userId = req.user!._id;

    // Upsert vote (one per user per chapter)
    const vote = await Vote.findOneAndUpdate(
      { userId, chapterId },
      { userId, chapterId, seriesId: req.body.seriesId, rating },
      { upsert: true, new: true, runValidators: true }
    );

    // Update series vote count, average rating, and rating count
    if (req.body.seriesId) {
      const seriesIdObj = new mongoose.Types.ObjectId(req.body.seriesId);
      const [totalVotes, avgRatingData] = await Promise.all([
        Vote.countDocuments({ seriesId: seriesIdObj }),
        Vote.aggregate([
          { $match: { seriesId: seriesIdObj, rating: { $exists: true, $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
        ]),
      ]);

      const averageRating = avgRatingData[0]?.avg || 0;
      const ratingCount = avgRatingData[0]?.count || 0;

      await Series.findByIdAndUpdate(seriesIdObj, {
        totalVotes,
        averageRating: Math.round(averageRating * 10) / 10,
        ratingCount,
      });
    }

    // Emit the updated stats to the chapter room
    const [newTotalVotes, avgRatingData, reactions] = await Promise.all([
      Vote.countDocuments({ chapterId }),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Reaction.aggregate([
        { $match: { chapterId: new mongoose.Types.ObjectId(chapterId) } },
        { $group: { _id: '$emoji', count: { $sum: 1 } } },
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
    const chapterId = req.params.id as string;
    const [totalVotes, avgRatingData, reactions] = await Promise.all([
      Vote.countDocuments({ chapterId }),
      Vote.aggregate([
        { $match: { chapterId: chapterId as any, rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
      Reaction.aggregate([
        { $match: { chapterId: new mongoose.Types.ObjectId(chapterId) } },
        { $group: { _id: '$emoji', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const userVote = await Vote.findOne({ userId: req.user!._id, chapterId });
    const userReactionObj = await Reaction.findOne({ userId: req.user!._id, chapterId });

    res.json({
      totalVotes,
      avgRating: avgRatingData[0]?.avg || 0,
      ratingCount: avgRatingData[0]?.count || 0,
      reactions,
      userVote: userVote || userReactionObj ? {
        rating: userVote ? userVote.rating : null,
        reaction: userReactionObj ? userReactionObj.emoji : null,
        voted: !!userVote
      } : null
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
