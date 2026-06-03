import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { EBVote } from '../models/EBVote';
import { User } from '../models/User';
import { Chapter } from '../models/Chapter';
import {
  notifySeriesPublished,
  notifySeriesEBRejected,
  createNotification,
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
        const [votesFor, votesAgainst, chapterCount] = await Promise.all([
          EBVote.countDocuments({ seriesId: s._id, decision: 'approved' }),
          EBVote.countDocuments({ seriesId: s._id, decision: 'rejected' }),
          Chapter.countDocuments({ seriesId: s._id }),
        ]);

        const userVote = await EBVote.findOne({
          seriesId: s._id,
          memberId: req.user!._id,
        });

        return {
          ...s.toObject(),
          votesFor,
          votesAgainst,
          totalChapters: chapterCount,
          userVote: userVote?.decision || null,
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
 * Returns EB dashboard data: stats + low-voted series for cancellation review.
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

    res.json({
      stats: {
        pendingCount,
        activeCount,
        cancellationRiskCount,
        totalDecisions,
      },
      atRiskSeries,
      recentDecisions,
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
    const { decision, comments } = req.body;

    if (!decision || !['approved', 'rejected'].includes(decision)) {
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
      { seriesId, memberId: req.user!._id, decision, comments },
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
