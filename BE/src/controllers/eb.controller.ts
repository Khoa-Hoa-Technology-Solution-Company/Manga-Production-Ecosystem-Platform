import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { EBVote } from '../models/EBVote';
import { User } from '../models/User';
import { Chapter } from '../models/Chapter';
import { Vote } from '../models/Vote';
import { Meeting } from '../models/Meeting';
import { RubricTemplate } from '../models/RubricTemplate';
import { DEFAULT_CRITERIA } from './rubric-template.controller';
import {
  notifySeriesPublished,
  notifySeriesEBRejected,
  notifySeriesScheduled,
  createNotification,
  notifyNewSeriesToSubscribers,
} from '../services/notification.service';
import { finalizeSeriesByEditorialBoard } from '../services/series-workflow.service';
import { computeSeriesPerformance } from '../services/series-performance.service';

export async function getPerformanceRankings(req: Request, res: Response): Promise<void> {
  try {
    const periodType = req.query.period === 'monthly' ? 'monthly' : 'weekly';
    const referenceDate = req.query.date ? new Date(String(req.query.date)) : new Date();
    if (Number.isNaN(referenceDate.getTime())) {
      res.status(400).json({ error: 'date must be a valid ISO date.' });
      return;
    }

    const rankings = await computeSeriesPerformance(periodType, referenceDate);
    const order = req.query.order === 'asc' ? 1 : -1;
    if (order === 1) {
      const riskOrder: Record<string, number> = { closure_review: 0, at_risk: 1, watch: 2, healthy: 3, insufficient_data: 4 };
      rankings.sort((a, b) => (riskOrder[a.riskLevel] ?? 5) - (riskOrder[b.riskLevel] ?? 5) || a.score - b.score);
    } else {
      rankings.sort((a, b) => b.score - a.score);
    }
    res.json({
      periodType,
      periodStart: rankings[0]?.periodStart || null,
      periodEnd: rankings[0]?.periodEnd || null,
      rankings: rankings.map((item, index) => ({
        ...item.series,
        ...item,
        _id: item.series._id,
        performanceId: item._id,
        rank: index + 1,
      })),
      thresholds: {
        minimumRatings: 20,
        minimumPublishedChapters: 3,
        minimumActiveDays: 30,
        lowRating: 3,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/eb/pending
 * Returns series with status Pending_EB, enriched with EB vote aggregation.
 */
export async function getPendingReview(req: Request, res: Response): Promise<void> {
  try {
    const activeTemplate = await RubricTemplate.findOne({ isActive: true });
    const criteriaList = activeTemplate ? activeTemplate.criteria : DEFAULT_CRITERIA;

    const seriesList = await Series.find({ status: 'Pending_EB' })
      .populate('mangakaId', 'displayName avatar')
      .populate('editorId', 'displayName avatar')
      .sort({ createdAt: -1 });

    const enriched = await Promise.all(
      seriesList.map(async (s) => {
        const [votes, chapterCount, meeting] = await Promise.all([
          EBVote.find({ seriesId: s._id }).populate('memberId', 'displayName avatar role'),
          Chapter.countDocuments({ seriesId: s._id }),
          Meeting.findOne({
            seriesIds: s._id,
            ...(s.ebReviewStartedAt ? { createdAt: { $gte: s.ebReviewStartedAt } } : {}),
          }).sort({ createdAt: -1 })
            .populate('participants', 'displayName email avatar role')
            .populate('rubricTemplateId'),
        ]);

        const seriesTemplate = (meeting?.rubricTemplateId as any) || activeTemplate;
        const seriesCriteriaList = seriesTemplate ? seriesTemplate.criteria : DEFAULT_CRITERIA;

        const votesFor = votes.filter((v) => v.decision === 'approved').length;
        const votesAgainst = votes.filter((v) => v.decision === 'rejected').length;
        const userVoteObj = votes.find((v) => v.memberId && (v.memberId as any)._id.toString() === req.user!._id.toString());
        const userVote = userVoteObj ? userVoteObj.decision : null;
        const userVoteRubric = userVoteObj ? userVoteObj.rubric : null;

        const sums: Record<string, number> = {};
        seriesCriteriaList.forEach((c: any) => { sums[c.key] = 0; });
        let votesWithRubricCount = 0;

        votes.forEach((v) => {
          if (v.rubric) {
            let hasAny = false;
            seriesCriteriaList.forEach((c: any) => {
              const val = v.rubric?.[c.key];
              if (typeof val === 'number') {
                sums[c.key] += val;
                hasAny = true;
              }
            });
            if (hasAny) votesWithRubricCount++;
          }
        });

        const averageRubric: Record<string, number> = {};
        let totalSum = 0;
        let totalCount = 0;
        if (votesWithRubricCount > 0) {
          seriesCriteriaList.forEach((c: any) => {
            const avg = Math.round((sums[c.key] / votesWithRubricCount) * 10) / 10;
            averageRubric[c.key] = avg;
            totalSum += avg;
            totalCount++;
          });
        }

        const totalAverage = totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : null;

        const memberVotes = votes.map((v) => ({
          _id: v._id,
          member: v.memberId,
          decision: v.decision,
          comments: v.comments,
          rubric: v.rubric,
          createdAt: v.createdAt,
        }));

        const meetingParticipantsCount = meeting ? meeting.participants.length : 0;
        const meetingVotesCount = meeting ? votes.filter(v => v.memberId && meeting.participants.some(p => p._id.toString() === (v.memberId as any)._id.toString())).length : 0;
        const isParticipant = meeting ? meeting.participants.some(p => p._id.toString() === req.user!._id.toString()) : false;

        return {
          ...s.toObject(),
          votesFor,
          votesAgainst,
          totalChapters: chapterCount,
          userVote,
          userVoteRubric,
          averageRubric: totalCount > 0 ? { ...averageRubric, totalAverage } : null,
          memberVotes,
          rubricTemplate: seriesTemplate || { name: 'Default Rubric', criteria: DEFAULT_CRITERIA },
          meeting: meeting ? {
            _id: meeting._id,
            title: meeting.title,
            dateTime: meeting.dateTime,
            participants: meeting.participants,
            participantsCount: meetingParticipantsCount,
            votesCount: meetingVotesCount,
            isParticipant,
          } : null,
        };
      })
    );

    res.json({
      series: enriched,
      activeTemplate: activeTemplate || { name: 'Default Rubric', criteria: DEFAULT_CRITERIA }
    });
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

    // Overdue chapters (status is NOT Published, and publicationDeadline is in the past)
    const overdueChapters = await Chapter.find({
      status: { $ne: 'Published' },
      publicationDeadline: { $lt: new Date() }
    })
      .populate('seriesId', 'title coverImage')
      .sort({ publicationDeadline: 1 })
      .lean();

    res.json({
      stats: {
        pendingCount,
        activeCount,
        cancellationRiskCount,
        totalDecisions,
        overdueCount: overdueChapters.length
      },
      atRiskSeries,
      recentDecisions,
      lowRatingChapters,
      overdueChapters
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
    const seriesId = String(req.params.seriesId);
    const { decision, comments, rubric } = req.body;
    let finalDecision = decision;

    const meeting = await Meeting.findOne({ seriesIds: seriesId }).sort({ createdAt: -1 }).populate('rubricTemplateId');
    const meetingTemplate = meeting?.rubricTemplateId as any;
    const activeTemplate = meetingTemplate || await RubricTemplate.findOne({ isActive: true });
    const criteriaList = activeTemplate ? activeTemplate.criteria : DEFAULT_CRITERIA;

    if (rubric) {
      let sum = 0;
      let count = 0;
      const checkVal = (val: any) => typeof val === 'number' && val >= 1 && val <= 10;

      for (const criterion of criteriaList) {
        const val = rubric[criterion.key];
        if (!checkVal(val)) {
          res.status(400).json({ error: `Rubric score for "${criterion.label}" must be a number between 1 and 10.` });
          return;
        }
        sum += val;
        count++;
      }

      const average = count > 0 ? sum / count : 5;
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

    if (!meeting || (series.ebReviewStartedAt && meeting.createdAt < series.ebReviewStartedAt)) {
      res.status(400).json({ error: 'Voting is not allowed until a review meeting is scheduled for this series.' });
      return;
    }

    const isParticipant = meeting.participants.some(
      (pId) => pId.toString() === req.user!._id.toString()
    );
    if (!isParticipant) {
      res.status(403).json({ error: 'You are not a participant in the scheduled review meeting for this series.' });
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
    if (!req.user?.isEbHead) {
      res.status(403).json({ error: 'Only the Head of the Editorial Board can finalize a series decision.' });
      return;
    }
    const seriesId = String(req.params.seriesId);
    const { publicationMode, publicationSchedule, publicationStartAt, comments } = req.body;

    const series = await Series.findById(seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    if (series.status !== 'Pending_EB') {
      res.status(400).json({ error: 'Series is not pending EB review.' });
      return;
    }

    const meeting = await Meeting.findOne({
      seriesIds: series._id,
      ...(series.ebReviewStartedAt ? { createdAt: { $gte: series.ebReviewStartedAt } } : {}),
    }).sort({ createdAt: -1 });
    if (!meeting) {
      res.status(400).json({ error: 'Voting cannot be finalized because no review meeting has been scheduled for this series.' });
      return;
    }

    const participantsCount = meeting.participants.length;
    if (participantsCount === 0) {
      res.status(400).json({ error: 'The review meeting has no voting participants.' });
      return;
    }
    const votesCount = await EBVote.countDocuments({
      seriesId,
      memberId: { $in: meeting.participants },
    });

    if (votesCount < participantsCount) {
      res.status(400).json({
        error: `Cannot finalize decision. Only ${votesCount}/${participantsCount} meeting participants have voted.`,
      });
      return;
    }

    // Determine decision based on highest vote counts (majority vote) if not explicitly provided
    const [votesFor, votesAgainst] = await Promise.all([
      EBVote.countDocuments({ seriesId, memberId: { $in: meeting.participants }, decision: 'approved' }),
      EBVote.countDocuments({ seriesId, memberId: { $in: meeting.participants }, decision: 'rejected' }),
    ]);

    const finalDecision = votesFor > votesAgainst ? 'approved' : 'rejected';

    const mangakaId = series.mangakaId.toString();
    const editorId = series.editorId?.toString();

    const normalizedMode = publicationMode ? String(publicationMode).toLowerCase() : 'immediate';
    const normalizedSchedule = publicationSchedule ? String(publicationSchedule).toLowerCase() : undefined;
    let scheduledStart: Date | undefined;
    if (finalDecision === 'approved') {
      if (!['immediate', 'scheduled'].includes(normalizedMode)) {
        res.status(400).json({ error: 'Publication mode must be "immediate" or "scheduled".' });
        return;
      }
      if (normalizedMode === 'scheduled') {
        if (!normalizedSchedule || !['weekly', 'monthly'].includes(normalizedSchedule)) {
          res.status(400).json({ error: 'Scheduled publication must be weekly or monthly.' });
          return;
        }
        scheduledStart = new Date(publicationStartAt);
        if (!publicationStartAt || Number.isNaN(scheduledStart.getTime())) {
          res.status(400).json({ error: 'A valid publication start date is required.' });
          return;
        }
        if (scheduledStart.getTime() <= Date.now()) {
          res.status(400).json({ error: 'Publication start date must be in the future.' });
          return;
        }
      }
    }

    const updatedSeries = await finalizeSeriesByEditorialBoard(
      seriesId,
      finalDecision,
      req.user!,
      comments,
      {
        mode: normalizedMode as 'immediate' | 'scheduled',
        schedule: normalizedSchedule as 'weekly' | 'monthly' | undefined,
        startAt: scheduledStart,
      }
    );

    if (finalDecision === 'approved') {
      try {
        if (normalizedMode === 'scheduled' && scheduledStart && normalizedSchedule) {
          await notifySeriesScheduled(
            mangakaId,
            editorId,
            series.title,
            series._id.toString(),
            normalizedSchedule as 'weekly' | 'monthly',
            scheduledStart
          );
        } else {
          await notifySeriesPublished(mangakaId, editorId, series.title, series._id.toString());
          await notifyNewSeriesToSubscribers(series._id.toString(), series.title);
        }
      } catch (err) {
        console.error('Failed to send publish notification:', err);
      }
    } else {
      try {
        await notifySeriesEBRejected(mangakaId, series.title, updatedSeries.rejectionNotes!, series._id.toString());
      } catch (err) {
        console.error('Failed to send EB rejection notification:', err);
      }
    }

    const publicationMessage = finalDecision === 'approved'
      ? normalizedMode === 'scheduled'
        ? ` Publication starts on ${scheduledStart!.toISOString()} (${normalizedSchedule}).`
        : ' The launch chapter was published immediately.'
      : '';
    res.json({
      series: updatedSeries,
      message: `Series ${finalDecision} by participant majority (${votesFor} for vs ${votesAgainst} against).${publicationMessage}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * PATCH /api/eb/schedule/:seriesId
 * Change the cadence for an already active series. The next approved chapter
 * is placed on the next cadence slot; this does not reopen EB review.
 */
export async function updatePublicationSchedule(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.isEbHead) {
      res.status(403).json({ error: 'Only the Head of the Editorial Board can change publication schedules.' });
      return;
    }
    const schedule = String(req.body.publicationSchedule || '').toLowerCase();
    if (!['weekly', 'monthly'].includes(schedule)) {
      res.status(400).json({ error: 'Publication schedule must be weekly or monthly.' });
      return;
    }
    const series = await Series.findById(req.params.seriesId);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }
    if (series.status !== 'Active') {
      res.status(400).json({ error: 'Only active series can have their publication schedule changed.' });
      return;
    }

    const nextPublicationAt = new Date();
    if (schedule === 'weekly') nextPublicationAt.setUTCDate(nextPublicationAt.getUTCDate() + 7);
    else nextPublicationAt.setUTCMonth(nextPublicationAt.getUTCMonth() + 1);

    series.publicationMode = 'scheduled';
    series.publicationSchedule = schedule as 'weekly' | 'monthly';
    series.publicationStartAt = nextPublicationAt;
    series.nextPublicationAt = nextPublicationAt;
    const nextChapter = await Chapter.findOne({ seriesId: series._id, status: 'Approved' }).sort({ chapterNumber: 1 });
    if (nextChapter) {
      nextChapter.scheduledPublishAt = nextPublicationAt;
      await nextChapter.save();
    }
    await series.save();

    try {
      await notifySeriesScheduled(
        series.mangakaId.toString(),
        series.editorId?.toString(),
        series.title,
        series._id.toString(),
        schedule as 'weekly' | 'monthly',
        nextPublicationAt
      );
    } catch (notificationError) {
      console.error('Failed to notify about updated publication schedule:', notificationError);
    }
    res.json({ series, message: `Publication schedule changed to ${schedule}.` });
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
    res.status(410).json({ error: 'Manual reader vote input has been retired. Rankings now use reader ratings and chapter reactions.' });
    return;
    /*
    if (!req.user?.isEbHead) {
      res.status(403).json({ error: 'Only the Head of the Editorial Board can record reader vote metrics.' });
      return;
    }
    const seriesId = String(req.params.seriesId);
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
    */
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
    if (!req.user?.isEbHead) {
      res.status(403).json({ error: 'Only the Head of the Editorial Board can cancel a series.' });
      return;
    }
    const seriesId = String(req.params.seriesId);
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
        target: 'mangaka_series',
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
          target: 'editor_portfolio',
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
