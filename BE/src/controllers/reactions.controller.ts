import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Chapter } from '../models/Chapter';
import { Reaction } from '../models/Reaction';
import { ReactionEvent } from '../models/ReactionEvent';
import { emitToRoom } from '../socket';

const REACTION_OPTIONS = new Set(['🔥', '❤️', '😮', '😭', '👏']);

async function summarizeReaction(targetType: string, targetId: string, userId?: string) {
  const matchQuery: any = {};
  if (targetType === 'chapter') {
    matchQuery.chapterId = new mongoose.Types.ObjectId(targetId);
  } else {
    matchQuery.seriesId = new mongoose.Types.ObjectId(targetId);
    matchQuery.chapterId = { $exists: false };
  }

  const aggregation = await Reaction.aggregate([
    { $match: matchQuery },
    { $group: { _id: '$emoji', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const userReactionObj = userId
    ? await Reaction.findOne({
        ...matchQuery,
        userId,
      }).select('emoji')
    : null;

  return {
    reactions: aggregation.map((item) => ({ emoji: item._id, count: item.count })),
    userReaction: userReactionObj?.emoji || null,
  };
}

/** POST /api/reactions/:targetType/:targetId */
export async function toggleReaction(req: Request, res: Response): Promise<void> {
  try {
    const targetType = String(req.params.targetType);
    const targetId = String(req.params.targetId);
    const requestedEmoji = typeof req.body.emoji === 'string' ? req.body.emoji.trim() : null;
    const userId = req.user!._id;

    if (!['series', 'chapter'].includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
      res.status(400).json({ error: 'Invalid reaction target.' });
      return;
    }
    if (requestedEmoji && !REACTION_OPTIONS.has(requestedEmoji)) {
      res.status(400).json({ error: 'Invalid reaction emoji.' });
      return;
    }

    let seriesId: mongoose.Types.ObjectId;
    let chapterId: mongoose.Types.ObjectId | undefined;
    if (targetType === 'chapter') {
      const chapter = await Chapter.findById(targetId).select('seriesId');
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      chapterId = chapter._id;
      seriesId = chapter.seriesId;
    } else {
      seriesId = new mongoose.Types.ObjectId(targetId);
    }

    const query: any = { userId, seriesId };
    query.chapterId = chapterId || { $exists: false };
    const existing = await Reaction.findOne(query);
    const shouldRemove = !requestedEmoji || existing?.emoji === requestedEmoji;

    if (shouldRemove) {
      if (existing) {
        await Reaction.deleteOne({ _id: existing._id });
        if (chapterId) {
          await ReactionEvent.create({
            userId,
            seriesId,
            chapterId,
            action: 'removed',
            previousEmoji: existing.emoji,
          });
        }
      }
    } else {
      const update: any = { $set: { userId, seriesId, emoji: requestedEmoji } };
      if (chapterId) update.$set.chapterId = chapterId;
      else update.$unset = { chapterId: 1 };
      await Reaction.findOneAndUpdate(
        query,
        update,
        { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
      );
      if (chapterId) {
        await ReactionEvent.create({
          userId,
          seriesId,
          chapterId,
          action: 'set',
          emoji: requestedEmoji,
          previousEmoji: existing?.emoji,
        });
      }
    }

    const summary = await summarizeReaction(targetType, targetId, userId);
    if (chapterId) emitToRoom(`chapter:${targetId}`, 'reaction:updated', summary);
    res.json({ ...summary, removed: shouldRemove, message: shouldRemove ? 'Reaction removed.' : 'Reaction saved.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/** GET /api/reactions/:targetType/:targetId */
export async function getReactions(req: Request, res: Response): Promise<void> {
  try {
    const targetType = String(req.params.targetType);
    const targetId = String(req.params.targetId);
    if (!['series', 'chapter'].includes(targetType) || !mongoose.Types.ObjectId.isValid(targetId)) {
      res.status(400).json({ error: 'Invalid reaction target.' });
      return;
    }

    const summary = await summarizeReaction(targetType, targetId, req.user?._id);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
