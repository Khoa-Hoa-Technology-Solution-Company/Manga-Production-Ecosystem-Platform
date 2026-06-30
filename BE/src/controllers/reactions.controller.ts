import { Request, Response } from 'express';
import { Reaction } from '../models/Reaction';
import mongoose from 'mongoose';

/**
 * POST /api/reactions/:targetType/:targetId
 * Toggle emoji reaction for a series or chapter.
 * Params: targetType ('series' | 'chapter'), targetId
 * Body: { emoji: string | null } (null to remove/clear)
 */
export async function toggleReaction(req: Request, res: Response): Promise<void> {
  try {
    const targetType = req.params.targetType as string;
    const targetId = req.params.targetId as string;
    const { emoji } = req.body;
    const userId = req.user!._id;

    if (!['series', 'chapter'].includes(targetType)) {
      res.status(400).json({ error: 'Invalid target type. Must be series or chapter.' });
      return;
    }

    let seriesId: mongoose.Types.ObjectId;
    let chapterId: mongoose.Types.ObjectId | undefined;

    if (targetType === 'chapter') {
      chapterId = new mongoose.Types.ObjectId(targetId);
      // We need to fetch the chapter to get its seriesId
      const ChapterModel = mongoose.model('Chapter');
      const chapter: any = await ChapterModel.findById(targetId);
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      seriesId = chapter.seriesId;
    } else {
      seriesId = new mongoose.Types.ObjectId(targetId);
    }

    // If emoji is null/empty, we delete the reaction
    if (!emoji) {
      const deleted = await Reaction.findOneAndDelete({
        userId,
        seriesId,
        chapterId: chapterId || { $exists: false }
      });
      res.json({ message: 'Reaction removed.', removed: !!deleted });
      return;
    }

    // Otherwise, upsert the reaction
    const query: any = { userId, seriesId };
    if (chapterId) {
      query.chapterId = chapterId;
    } else {
      query.chapterId = { $exists: false };
    }

    const update: any = { userId, seriesId, emoji };
    if (chapterId) {
      update.chapterId = chapterId;
    } else {
      update.$unset = { chapterId: '' }; // Clean up field if series-level
    }

    const reaction = await Reaction.findOneAndUpdate(
      query,
      update,
      { upsert: true, new: true, runValidators: true }
    );

    res.json({ reaction, message: 'Reaction saved.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/reactions/:targetType/:targetId
 * Get reaction summary (counts by emoji, and current user's reaction).
 */
export async function getReactions(req: Request, res: Response): Promise<void> {
  try {
    const targetType = req.params.targetType as string;
    const targetId = req.params.targetId as string;
    const userId = req.user?._id;

    if (!['series', 'chapter'].includes(targetType)) {
      res.status(400).json({ error: 'Invalid target type. Must be series or chapter.' });
      return;
    }

    const matchQuery: any = {};
    if (targetType === 'chapter') {
      matchQuery.chapterId = new mongoose.Types.ObjectId(targetId);
    } else {
      matchQuery.seriesId = new mongoose.Types.ObjectId(targetId);
      matchQuery.chapterId = { $exists: false };
    }

    // Aggregate counts
    const aggregation = await Reaction.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$emoji', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Find current user's reaction
    let userReaction = null;
    if (userId) {
      const userReactionObj = await Reaction.findOne({
        userId,
        seriesId: targetType === 'series' ? new mongoose.Types.ObjectId(targetId) : { $exists: true },
        chapterId: targetType === 'chapter' ? new mongoose.Types.ObjectId(targetId) : { $exists: false }
      });
      if (userReactionObj) {
        userReaction = userReactionObj.emoji;
      }
    }

    res.json({
      reactions: aggregation.map(item => ({
        emoji: item._id,
        count: item.count
      })),
      userReaction
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
