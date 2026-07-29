import { Request, Response } from 'express';
import { Meeting } from '../models/Meeting';
import { createNotification } from '../services/notification.service';
import { Series } from '../models/Series';
import { User } from '../models/User';

/**
 * POST /api/meetings
 * Create a new review meeting event.
 */
export async function createMeeting(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.isEbHead) {
      res.status(403).json({ error: 'Only the Head of the Editorial Board can schedule a review meeting.' });
      return;
    }

    const {
      title,
      description,
      dateTime,
      location,
      seriesId,
      seriesIds,
      participants,
      rubricTemplateId,
      purpose = 'proposal_review',
    } = req.body;

    if (!title || !dateTime || !participants || !Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({ error: 'Title, date/time, and at least one participant are required.' });
      return;
    }
    if (!['proposal_review', 'cancellation_review'].includes(purpose)) {
      res.status(400).json({ error: 'Meeting purpose must be proposal_review or cancellation_review.' });
      return;
    }

    const scheduledDate = new Date(dateTime);
    if (!Number.isFinite(scheduledDate.getTime())) {
      res.status(400).json({ error: 'A valid meeting date/time is required.' });
      return;
    }
    if (scheduledDate.getTime() <= Date.now()) {
      res.status(400).json({ error: 'Meeting date/time must be in the future.' });
      return;
    }

    // Ensure the creator is also listed as a participant, or at least has view access.
    const uniqueParticipants = Array.from(new Set([...participants, req.user!._id.toString()]));

    // Validation: Number of participants must be odd
    if (uniqueParticipants.length % 2 === 0) {
      res.status(400).json({ error: 'The number of participants (including the organizer) must be an odd number to prevent voting ties.' });
      return;
    }

    // Support both seriesId (backward compat) and seriesIds
    let finalSeriesIds: string[] = [];
    if (Array.isArray(seriesIds)) {
      finalSeriesIds = seriesIds;
    } else if (seriesId) {
      finalSeriesIds = [seriesId];
    }

    if (finalSeriesIds.length === 0) {
      res.status(400).json({ error: 'At least one series is required for a review meeting.' });
      return;
    }

    const requiredSeriesStatus = purpose === 'cancellation_review' ? 'Active' : 'Pending_EB';
    const [eligibleParticipants, eligibleSeries, existingCancellationMeeting] = await Promise.all([
      User.countDocuments({
        _id: { $in: uniqueParticipants },
        role: 'editorial_board',
        isActive: true,
      }),
      Series.countDocuments({ _id: { $in: finalSeriesIds }, status: requiredSeriesStatus }),
      purpose === 'cancellation_review'
        ? Meeting.findOne({
            purpose: 'cancellation_review',
            decisionStatus: 'open',
            seriesIds: { $in: finalSeriesIds },
          }).select('_id')
        : Promise.resolve(null),
    ]);
    if (eligibleParticipants !== uniqueParticipants.length) {
      res.status(400).json({ error: 'All voting participants must be active Editorial Board members.' });
      return;
    }
    if (eligibleSeries !== finalSeriesIds.length) {
      res.status(400).json({
        error: purpose === 'cancellation_review'
          ? 'Cancellation review meetings can only include active series.'
          : 'Proposal review meetings can only include series currently pending Editorial Board review.',
      });
      return;
    }
    if (existingCancellationMeeting) {
      res.status(409).json({ error: 'An open cancellation review meeting already exists for one of the selected series.' });
      return;
    }

    const meeting = await Meeting.create({
      title,
      description,
      dateTime: scheduledDate,
      location,
      seriesIds: finalSeriesIds,
      participants: uniqueParticipants,
      createdBy: req.user!._id,
      purpose,
      rubricTemplateId: purpose === 'proposal_review' && rubricTemplateId ? rubricTemplateId : undefined,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('createdBy', 'displayName avatar role')
      .populate('participants', 'displayName email avatar role')
      .populate('seriesIds', 'title coverImage')
      .populate('rubricTemplateId');

    const formattedDate = scheduledDate.toLocaleString();
    const creatorName = req.user!.displayName || 'The Editorial Board Head';

    // Fetch series details to generate notifications
    const seriesObjects = await Series.find({ _id: { $in: finalSeriesIds } });
    const seriesTitles = seriesObjects.map(s => `"${s.title}"`).join(', ');
    const seriesTitleMsg = seriesTitles ? ` for series ${seriesTitles}` : '';
    const meetingKind = purpose === 'cancellation_review' ? 'cancellation review meeting' : 'review meeting';

    // Notify all participants (excluding the creator themselves)
    for (const participantId of uniqueParticipants) {
      if (participantId.toString() === req.user!._id.toString()) continue;

      // Meeting schedule notification
      await createNotification({
        userId: participantId,
        type: 'system',
        title: purpose === 'cancellation_review' ? 'Cancellation Vote Meeting Scheduled' : 'New Review Meeting Scheduled',
        message: `${creatorName} scheduled a ${meetingKind} "${title}"${seriesTitleMsg} on ${formattedDate}.`,
        relatedId: meeting._id.toString(),
        relatedType: 'Meeting',
        target: 'eb_meetings',
      });

      // Additional notification for Series Review
      for (const seriesObj of seriesObjects) {
        await createNotification({
          userId: participantId,
          type: 'system',
          title: purpose === 'cancellation_review' ? 'Series Cancellation Vote Invitation' : 'Series Review Invitation',
          message: purpose === 'cancellation_review'
            ? `You are invited to vote on whether series "${seriesObj.title}" should be cancelled in meeting "${title}" on ${formattedDate}.`
            : `You are invited to review the series "${seriesObj.title}" in the meeting "${title}" on ${formattedDate}.`,
          relatedId: seriesObj._id.toString(),
          relatedType: 'Series',
          target: 'eb_meetings',
        });
      }
    }

    // Notify the Mangakas of the series
    for (const seriesObj of seriesObjects) {
      await createNotification({
        userId: seriesObj.mangakaId.toString(),
        type: 'system',
        title: purpose === 'cancellation_review' ? 'Cancellation Review Meeting Scheduled' : 'Review Meeting Scheduled',
        message: purpose === 'cancellation_review'
          ? `The Editorial Board scheduled a meeting "${title}" to vote on whether your series "${seriesObj.title}" should continue on ${formattedDate}.`
          : `A review meeting "${title}" has been scheduled for your series "${seriesObj.title}" on ${formattedDate}.`,
        relatedId: seriesObj._id.toString(),
        relatedType: 'Series',
        target: 'mangaka_series',
      });
    }

    res.status(201).json({ meeting: populatedMeeting, message: 'Meeting scheduled successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * GET /api/meetings
 * Get meetings the current user is participating in or created.
 */
export async function getMeetings(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!._id;

    const meetings = await Meeting.find({
      $or: [{ createdBy: userId }, { participants: userId }],
    })
      .populate('createdBy', 'displayName avatar role')
      .populate('participants', 'displayName email avatar role')
      .populate('seriesIds', 'title coverImage')
      .populate('rubricTemplateId')
      .sort({ dateTime: 1 });

    res.json({ meetings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * DELETE /api/meetings/:id
 * Cancel/Delete a scheduled meeting.
 */
export async function deleteMeeting(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!._id;

    if (!req.user?.isEbHead) {
      res.status(403).json({ error: 'Only the Head of the Editorial Board can cancel meetings.' });
      return;
    }

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found.' });
      return;
    }

    // Only creator/EB Head can delete
    const isCreator = meeting.createdBy.toString() === userId.toString();
    if (!isCreator) {
      res.status(403).json({ error: 'You do not have permission to cancel this meeting.' });
      return;
    }

    const creatorName = req.user!.displayName || 'An organizer';
    const formattedDate = new Date(meeting.dateTime).toLocaleString();

    const seriesObjects = await Series.find({ _id: { $in: meeting.seriesIds } });

    for (const participantId of meeting.participants) {
      if (participantId.toString() === userId.toString()) continue;

      await createNotification({
        userId: participantId.toString(),
        type: 'system',
        title: 'Review Meeting Cancelled',
        message: `The review meeting "${meeting.title}" originally scheduled on ${formattedDate} has been cancelled by ${creatorName}.`,
        relatedId: meeting._id.toString(),
        relatedType: 'Meeting',
        target: 'eb_meetings',
      });

      for (const seriesObj of seriesObjects) {
        await createNotification({
          userId: participantId.toString(),
          type: 'system',
          title: 'Series Review Cancelled',
          message: `The review meeting for series "${seriesObj.title}" on ${formattedDate} has been cancelled.`,
          relatedId: seriesObj._id.toString(),
          relatedType: 'Series',
          target: 'eb_meetings',
        });
      }
    }

    for (const seriesObj of seriesObjects) {
      await createNotification({
        userId: seriesObj.mangakaId.toString(),
        type: 'system',
        title: 'Review Meeting Cancelled',
        message: `The review meeting scheduled for your series "${seriesObj.title}" on ${formattedDate} has been cancelled.`,
        relatedId: seriesObj._id.toString(),
        relatedType: 'Series',
        target: 'mangaka_series',
      });
    }

    await Meeting.findByIdAndDelete(id);

    res.json({ message: 'Meeting cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

