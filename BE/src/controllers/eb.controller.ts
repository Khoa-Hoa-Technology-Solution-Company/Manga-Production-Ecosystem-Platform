import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { EBVote } from '../models/EBVote';
import { User } from '../models/User';
import { Chapter } from '../models/Chapter';
import { Vote } from '../models/Vote';
import {
  notifySeriesPublished,
  notifySeriesEBRejected,
  createNotification,
  notifyNewSeriesToSubscribers,
} from '../services/notification.service';

const CANCELLATION_RISK_THRESHOLD = 10;

/**
 * GET /api/eb/pending
 * Returns series with status Pending_EB, enriched with EB vote aggregation.
 */
export async function getPendingReview(req: Request, res: Response): Promise<void> {
  try {
    const seriesList = await Series.find({ status: 'Pending_EB' })
      .populate('mangakaId', 'displayName avatar')
      .populate('editorId', 'displayName avatar')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      seriesList.map(async (s) => {
        const [votes, chapterCount] = await Promise.all([
          EBVote.find({ seriesId: s._id }).populate('memberId', 'displayName avatar role'),
          Chapter.countDocuments({ seriesId: s._id }),
        ]);

        const votesFor = votes.filter((v) => v.decision === 'approved').length;
        const votesAgainst = votes.filter((v) => v.decision === 'rejected').length;
        const userVoteObj = votes.find((v) => v.memberId && (v.memberId as any)._id.toString() === req.user!._id.toString());
        const userVote = userVoteObj ? userVoteObj.decision : null;
        const userVoteRubric = userVoteObj ? userVoteObj.rubric : null;

        let artStyleSum = 0;
        let storytellingSum = 0;
        let characterDesignSum = 0;
        let pacingSum = 0;
        let commercialPotentialSum = 0;
        let votesWithRubricCount = 0;

        votes.forEach((v) => {
          if (v.rubric) {
            artStyleSum += v.rubric.artStyle;
            storytellingSum += v.rubric.storytelling;
            characterDesignSum += v.rubric.characterDesign;
            pacingSum += v.rubric.pacing;
            commercialPotentialSum += v.rubric.commercialPotential;
            votesWithRubricCount++;
          }
        });

        const averageRubric = votesWithRubricCount > 0 ? {
          artStyle: Math.round((artStyleSum / votesWithRubricCount) * 10) / 10,
          storytelling: Math.round((storytellingSum / votesWithRubricCount) * 10) / 10,
          characterDesign: Math.round((characterDesignSum / votesWithRubricCount) * 10) / 10,
          pacing: Math.round((pacingSum / votesWithRubricCount) * 10) / 10,
          commercialPotential: Math.round((commercialPotentialSum / votesWithRubricCount) * 10) / 10,
        } : null;

        const totalAverage = averageRubric
          ? Math.round(((averageRubric.artStyle + averageRubric.storytelling + averageRubric.characterDesign + averageRubric.pacing + averageRubric.commercialPotential) / 5) * 10) / 10
          : null;

        const memberVotes = votes.map((v) => ({
          _id: v._id,
          member: v.memberId,
          decision: v.decision,
          comments: v.comments,
          rubric: v.rubric,
          createdAt: v.createdAt,
        }));

        return {
          ...s.toObject(),
          votesFor,
          votesAgainst,
          totalChapters: chapterCount,
          userVote,
          userVoteRubric,
          averageRubric: averageRubric ? { ...averageRubric, totalAverage } : null,
          memberVotes,
        };
      })
    );

    res.json({ series: enriched });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/eb/dashboard
 * Returns EB dashboard data: stats + low-voted series + low-rating chapter alerts.
 */
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [pendingCount, activeCount, totalDecisions] = await Promise.all([
      Series.countDocuments({ status: 'Pending_EB' }),
      Series.countDocuments({ status: 'Active' }),
      EBVote.countDocuments({ memberId: req.user!._id }),
    ]);

    const atRiskSeries = await Series.find({
      status: 'Active',
      cancellationRisk: true,
    })
      .populate('mangakaId', 'displayName avatar')
      .sort({ weeklyVotes: 1 })
      .lean();

    const cancellationRiskCount = atRiskSeries.length;

    // Recent EB decisions (series that moved out of Pending_EB recently)
    const recentDecisions = await Series.find({
      status: { $in: ['Active', 'Draft', 'Cancelled'] },
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    })
      .populate('mangakaId', 'displayName avatar')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();

    // Low-rating chapter alerts (published chapters with avgRating < 3 and >= 3 votes)
    const LOW_RATING_THRESHOLD = 3;
    const MIN_VOTES_FOR_ALERT = 3;

    const lowRatingAgg = await Vote.aggregate([
      { $match: { rating: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$chapterId',
          avgRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 },
        },
      },
      {
        $match: {
          avgRating: { $lt: LOW_RATING_THRESHOLD },
          ratingCount: { $gte: MIN_VOTES_FOR_ALERT },
        },
      },
      { $sort: { avgRating: 1 } },
      { $limit: 20 },
    ]);

    const lowRatingChapters = await Promise.all(
      lowRatingAgg.map(async (item) => {
        const chapter = await Chapter.findById(item._id)
          .populate('seriesId', 'title coverImage status mangakaId')
          .lean();
        if (!chapter || chapter.status !== 'Published') return null;
        return {
          chapterId: item._id,
          chapterNumber: chapter.chapterNumber,
          chapterTitle: chapter.title,
          avgRating: Math.round(item.avgRating * 10) / 10,
          ratingCount: item.ratingCount,
          series: chapter.seriesId,
        };
      })
    ).then((results) => results.filter(Boolean));

    res.json({
      stats: {
        pendingCount,
        activeCount,
        cancellationRiskCount,
        totalDecisions,
      },
      atRiskSeries,
      recentDecisions,
      lowRatingChapters,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/eb/vote/:seriesId
 * Cast or update an EB member's vote on a Pending_EB series.
 */
export async function castVote(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId } = req.params;
    const { decision, comments, rubric } = req.body;
    let finalDecision = decision;
    if (rubric) {
      const { artStyle, storytelling, characterDesign, pacing, commercialPotential } = rubric;
      const checkVal = (val: any) => typeof val === 'number' && val >= 1 && val <= 10;
      if (
        !checkVal(artStyle) ||
        !checkVal(storytelling) ||
        !checkVal(characterDesign) ||
        !checkVal(pacing) ||
        !checkVal(commercialPotential)
      ) {
        res.status(400).json({ error: 'All rubric criteria scores must be numbers between 1 and 10.' });
        return;
      }
      const average = (artStyle + storytelling + characterDesign + pacing + commercialPotential) / 5;
      finalDecision = average >= 5 ? 'approved' : 'rejected';
    }

    if (!finalDecision || !['approved', 'rejected'].includes(finalDecision)) {
      res.status(400).json({ error: 'Decision must be "approved" or "rejected".' });
      return;
    }

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    if (series.status !== 'Pending_EB') {
      res.status(400).json({ error: 'Series is not pending EB review.' });
      return;
    }

    await EBVote.findOneAndUpdate(
      { seriesId, memberId: req.user!._id },
      { seriesId, memberId: req.user!._id, decision: finalDecision, comments, rubric },
      { upsert: true, new: true, runValidators: true }
    );

    const [votesFor, votesAgainst] = await Promise.all([
      EBVote.countDocuments({ seriesId, decision: 'approved' }),
      EBVote.countDocuments({ seriesId, decision: 'rejected' }),
    ]);

    res.json({
      message: 'Vote recorded.',
      votesFor,
      votesAgainst,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/eb/decision/:seriesId
 * Make the final EB decision: approve (publish) or reject a series.
 */
export async function makeFinalDecision(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId } = req.params;
    const { publicationSchedule, comments } = req.body;

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    if (series.status !== 'Pending_EB') {
      res.status(400).json({ error: 'Series is not pending EB review.' });
      return;
    }

    // Determine decision based on highest vote counts (majority vote)
    const [votesFor, votesAgainst] = await Promise.all([
      EBVote.countDocuments({ seriesId, decision: 'approved' }),
      EBVote.countDocuments({ seriesId, decision: 'rejected' }),
    ]);

    const decision = votesFor >= votesAgainst ? 'approved' : 'rejected';

    const mangakaId = series.mangakaId.toString();
    const editorId = series.editorId?.toString();

    if (decision === 'approved') {
      if (publicationSchedule && !['weekly', 'monthly'].includes(publicationSchedule)) {
        res.status(400).json({ error: 'Publication schedule must be "weekly" or "monthly".' });
        return;
      }

      series.status = 'Active';
      series.publicationSchedule = publicationSchedule || 'weekly';
      series.rejectionNotes = '';
      await series.save();

      try {
        await notifySeriesPublished(mangakaId, editorId, series.title, series._id.toString());
        await notifyNewSeriesToSubscribers(series._id.toString(), series.title);
      } catch (err) {
        console.error('Failed to send publish notification:', err);
      }
    } else {
      series.status = 'Draft';
      series.rejectionNotes = comments || 'Rejected by Editorial Board';
      await series.save();

      try {
        await notifySeriesEBRejected(mangakaId, series.title, series.rejectionNotes!, series._id.toString());
      } catch (err) {
        console.error('Failed to send EB rejection notification:', err);
      }
    }

    res.json({ series, message: `Series ${decision} based on majority vote (${votesFor} for vs ${votesAgainst} against).` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * POST /api/eb/reader-votes/:seriesId
 * Input weekly reader vote count for a series.
 */
export async function inputReaderVotes(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId } = req.params;
    const { weeklyVotes } = req.body;

    if (typeof weeklyVotes !== 'number' || weeklyVotes < 0) {
      res.status(400).json({ error: 'weeklyVotes must be a non-negative number.' });
      return;
    }

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    series.weeklyVotes = weeklyVotes;
    series.totalVotes = (series.totalVotes || 0) + weeklyVotes;
    series.cancellationRisk = series.status === 'Active' && weeklyVotes < CANCELLATION_RISK_THRESHOLD;
    await series.save();

    res.json({ series, message: 'Weekly votes updated.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/eb/cancel/:seriesId
 * Cancel an active series (low performance, EB decision to discontinue).
 */
export async function cancelSeries(req: Request, res: Response): Promise<void> {
  try {
    const { seriesId } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ error: 'A cancellation reason is required.' });
      return;
    }

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    if (series.status !== 'Active') {
      res.status(400).json({ error: 'Only active series can be cancelled.' });
      return;
    }

    series.status = 'Cancelled';
    series.rejectionNotes = reason;
    series.cancellationRisk = false;
    await series.save();

    // Notify mangaka and editor
    const mangakaId = series.mangakaId.toString();
    try {
      await createNotification({
        userId: mangakaId,
        type: 'system',
        title: 'Series Cancelled',
        message: `Your series "${series.title}" has been cancelled by the Editorial Board. Reason: ${reason}`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
      });
    } catch (err) {
      console.error('Failed to send cancellation notification:', err);
    }

    if (series.editorId) {
      try {
        await createNotification({
          userId: series.editorId.toString(),
          type: 'system',
          title: 'Series Cancelled',
          message: `Series "${series.title}" has been cancelled by the Editorial Board. Reason: ${reason}`,
          relatedId: series._id.toString(),
          relatedType: 'Series',
        });
      } catch (err) {
        console.error('Failed to send editor cancellation notification:', err);
      }
    }

    res.json({ series, message: 'Series cancelled.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
