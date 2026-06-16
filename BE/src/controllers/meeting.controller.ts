import { Request, Response } from 'express';
import { Meeting } from '../models/Meeting';
import { createNotification } from '../services/notification.service';
import { Series } from '../models/Series';

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

    const { title, description, dateTime, location, seriesId, participants } = req.body;

    if (!title || !dateTime || !participants || !Array.isArray(participants) || participants.length === 0) {
      res.status(400).json({ error: 'Title, date/time, and at least one participant are required.' });
      return;
    }

    // Ensure the creator is also listed as a participant, or at least has view access.
    // We can add them to participants if they are not there, or keep it as is.
    const uniqueParticipants = Array.from(new Set([...participants, req.user!._id.toString()]));

    const meeting = await Meeting.create({
      title,
      description,
      dateTime: new Date(dateTime),
      location,
      seriesId: seriesId || undefined,
      participants: uniqueParticipants,
      createdBy: req.user!._id,
    });

    const populatedMeeting = await Meeting.findById(meeting._id)
      .populate('createdBy', 'displayName avatar role')
      .populate('participants', 'displayName email avatar role')
      .populate('seriesId', 'title coverImage');

    // Notify all participants (excluding the creator themselves)
    const formattedDate = new Date(dateTime).toLocaleString();
    let seriesTitle = '';
    if (seriesId) {
      const seriesObj = await Series.findById(seriesId);
      if (seriesObj) seriesTitle = ` for series "${seriesObj.title}"`;
    }

    const creatorName = req.user!.displayName || 'The Editorial Board Head';

    for (const participantId of uniqueParticipants) {
      if (participantId.toString() === req.user!._id.toString()) continue;

      await createNotification({
        userId: participantId,
        type: 'system',
        title: 'New Review Meeting Scheduled',
        message: `${creatorName} scheduled a review meeting "${title}"${seriesTitle} on ${formattedDate}.`,
        relatedId: meeting._id.toString(),
        relatedType: 'Meeting',
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
      .populate('seriesId', 'title coverImage')
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

    // Send cancellation notifications before deletion
    const creatorName = req.user!.displayName || 'An organizer';
    const formattedDate = new Date(meeting.dateTime).toLocaleString();

    for (const participantId of meeting.participants) {
      if (participantId.toString() === userId.toString()) continue;

      await createNotification({
        userId: participantId.toString(),
        type: 'system',
        title: 'Review Meeting Cancelled',
        message: `The review meeting "${meeting.title}" originally scheduled on ${formattedDate} has been cancelled by ${creatorName}.`,
        relatedId: meeting._id.toString(),
        relatedType: 'Meeting',
      });
    }

    await Meeting.findByIdAndDelete(id);

    res.json({ message: 'Meeting cancelled successfully.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
