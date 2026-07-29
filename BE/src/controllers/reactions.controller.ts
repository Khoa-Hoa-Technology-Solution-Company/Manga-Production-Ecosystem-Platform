import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Chapter } from '../models/Chapter';
import { Reaction } from '../models/Reaction';
import { ReactionEvent } from '../models/ReactionEvent';
import { emitToRoom } from '../socket';
import { Series } from '../models/Series';
import { canAccessChapterDocument } from '../middleware/chapterAccess';
import { Task } from '../models/Task';

const REACTION_OPTIONS = new Set(['🔥', '❤️', '😮', '😭', '👏']);
const PUBLIC_SERIES_STATUSES = new Set(['Active', 'Completed']);

function canAccessSeriesReactions(series: any, user: { _id: string; role: string } | undefined): boolean {
  if (PUBLIC_SERIES_STATUSES.has(String(series?.status))) return true;
  if (!series || !user) return false;
  const userId = String(user._id);
  return String(series.mangakaId?._id || series.mangakaId) === userId
    || (user.role === 'editor'
      && String(series.editorId?._id || series.editorId) === userId
      && series.editorStatus === 'accepted')
    || user.role === 'editorial_board';
}

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
      const chapter = await Chapter.findById(targetId).select('seriesId mangakaId collaborators status');
      if (!chapter) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      const series = await Series.findById(chapter.seriesId).select('status editorId editorStatus mangakaId');
      const assignedAssistant = req.user?.role === 'assistant'
        ? await Task.exists({ chapterId: chapter._id, assignedTo: req.user._id })
        : false;
      if (!series || (!canAccessChapterDocument(chapter, series, req.user as any, 'comment') && !assignedAssistant)) {
        res.status(403).json({ error: 'You do not have access to this chapter.' });
        return;
      }
      chapterId = chapter._id;
      seriesId = chapter.seriesId;
    } else {
      const series = await Series.findById(targetId).select('_id status mangakaId editorId editorStatus');
      if (!series) {
        res.status(404).json({ error: 'Series not found.' });
        return;
      }
      if (!canAccessSeriesReactions(series, req.user as any)) {
        res.status(403).json({ error: 'This series is not available for reactions.' });
        return;
      }
      seriesId = series._id;
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

    if (targetType === 'chapter') {
      const chapter = await Chapter.findById(targetId).select('seriesId mangakaId collaborators status');
      const series = chapter ? await Series.findById(chapter.seriesId).select('status editorId editorStatus mangakaId') : null;
      if (!chapter || !series) {
        res.status(404).json({ error: 'Chapter not found.' });
        return;
      }
      const assignedAssistant = req.user?.role === 'assistant'
        ? await Task.exists({ chapterId: chapter._id, assignedTo: req.user._id })
        : false;
      if (!canAccessChapterDocument(chapter, series, req.user as any, 'read') && !assignedAssistant) {
        res.status(403).json({ error: 'You do not have access to this chapter.' });
        return;
      }
    } else {
      const series = await Series.findById(targetId).select('_id status mangakaId editorId editorStatus');
      if (!series) {
        res.status(404).json({ error: 'Series not found.' });
        return;
      }
      if (!canAccessSeriesReactions(series, req.user as any)) {
        res.status(403).json({ error: 'This series is not available for reactions.' });
        return;
      }
    }

    const summary = await summarizeReaction(targetType, targetId, req.user?._id);
    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
