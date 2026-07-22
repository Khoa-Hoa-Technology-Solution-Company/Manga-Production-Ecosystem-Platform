import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Series } from '../models/Series';
import { Chapter } from '../models/Chapter';
import { User } from '../models/User';
import { uploadToR2 } from '../services/storage.service';
import {
  assignSeriesEditor,
  respondToSeriesAssignment,
  reviewSeriesByEditor,
  submitSeries,
} from '../services/series-workflow.service';
import {
  notifySeriesSubmitted,
  notifySeriesApproved,
  notifySeriesRejected,
  notifySeriesPublished,
  notifySeriesEBRejected,
  createNotification,
  notifyNewSeriesToSubscribers,
} from '../services/notification.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { status, genre, sort, limit = '20', page = '1' } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (genre) filter.genre = { $in: [genre] };

    if (req.user?.role === 'mangaka') {
      const accessibleChapterSeriesIds = await Chapter.find({
        $or: [
          { mangakaId: req.user._id },
          { 'collaborators.userId': req.user._id },
        ],
      }).distinct('seriesId');

      filter.$or = [
        { mangakaId: req.user._id },
        { _id: { $in: accessibleChapterSeriesIds } },
      ];
    } else if (req.user?.role === 'editor') {
      filter.editorId = req.user._id;
      filter.editorStatus = 'accepted';
    } else if (req.user?.role === 'editorial_board') {
      // EB can view all series
    } else {
      // Readers and guests can only view Active and Completed series
      if (filter.status) {
        if (!['Active', 'Completed'].includes(filter.status)) {
          filter.status = { $in: [] }; // Yield empty result
        }
      } else {
        filter.status = { $in: ['Active', 'Completed'] };
      }
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sortBy: Record<string, 1 | -1> = sort === 'votes' ? { weeklyVotes: -1 } : { createdAt: -1 };

    const [series, total] = await Promise.all([
      Series.find(filter)
        .populate('mangakaId', 'displayName avatar')
        .populate('editorId', 'displayName avatar')
        .sort(sortBy)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Series.countDocuments(filter),
    ]);

    const chapterCounts = await Chapter.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { seriesId: { $in: series.map((item) => item._id) } } },
      { $group: { _id: '$seriesId', count: { $sum: 1 } } },
    ]);
    const chapterCountBySeries = new Map(chapterCounts.map((item) => [item._id.toString(), item.count]));
    const seriesWithCounts = series.map((item) => ({
      ...item.toObject(),
      totalChapters: chapterCountBySeries.get(item._id.toString()) || 0,
    }));

    res.json({ series: seriesWithCounts, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getById(req: Request, res: Response): Promise<void> {
  try {
    const series = await Series.findById(req.params.id)
      .populate('mangakaId', 'displayName avatar bio')
      .populate('editorId', 'displayName avatar');
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    const requesterId = req.user?._id?.toString();
    const mangakaId = (series.mangakaId as any)?._id?.toString() || series.mangakaId?.toString();
    const editorId = (series.editorId as any)?._id?.toString() || series.editorId?.toString();
    const isPublic = ['Active', 'Completed'].includes(series.status);
    const mayView = isPublic
      || req.user?.role === 'editorial_board'
      || (req.user?.role === 'mangaka' && mangakaId === requesterId)
      || (req.user?.role === 'editor' && editorId === requesterId && ['pending', 'accepted'].includes(String(series.editorStatus)));

    if (!mayView) {
      res.status(403).json({ error: 'Access denied for this series.' });
      return;
    }

    res.json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, script, scriptFile, characterDesigns } = req.body;
    const genre = Array.isArray(req.body.genre)
      ? req.body.genre
      : String(req.body.genre || '')
        .split(',')
        .map((item: string) => item.trim())
        .filter(Boolean);

    let coverImage = typeof req.body.coverImage === 'string' ? req.body.coverImage : undefined;

    if (req.file) {
      coverImage = await uploadToR2(req.file, 'series');
    }

    let parsedCharacterDesigns = [];
    if (characterDesigns) {
      if (typeof characterDesigns === 'string') {
        try {
          parsedCharacterDesigns = JSON.parse(characterDesigns);
        } catch (e) {
          parsedCharacterDesigns = [];
        }
      } else if (Array.isArray(characterDesigns)) {
        parsedCharacterDesigns = characterDesigns;
      }
    }

    const series = await Series.create({
      title,
      description,
      genre,
      coverImage,
      mangakaId: req.user?._id,
      editorStatus: 'none',
      script,
      scriptFile,
      characterDesigns: parsedCharacterDesigns,
    });

    res.status(201).json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateMetadata(req: Request, res: Response): Promise<void> {
  try {
    if (req.body.status !== undefined || req.body.editorId !== undefined || req.body.editorStatus !== undefined) {
      res.status(400).json({ error: 'Workflow state and editor assignment must use the dedicated workflow endpoints.' });
      return;
    }

    const series = await Series.findById(req.params.id);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    const role = req.user?.role;
    const userId = req.user?._id;
    const isOwner = role === 'mangaka' && series.mangakaId.toString() === userId;
    const isAssignedEditor = role === 'editor' && series.editorId?.toString() === userId && series.editorStatus === 'accepted';

    if (isOwner) {
      if (!['Draft', 'Rejected'].includes(series.status)) {
        res.status(403).json({ error: 'Series metadata is locked while it is under review or active.' });
        return;
      }

      const allowed = ['title', 'description', 'script', 'scriptFile', 'characterDesigns'];
      for (const key of allowed) {
        if (req.body[key] !== undefined) (series as any)[key] = req.body[key];
      }
      if (req.body.genre !== undefined) {
        series.genre = Array.isArray(req.body.genre)
          ? req.body.genre
          : String(req.body.genre).split(',').map((item) => item.trim()).filter(Boolean);
      }
      if (typeof req.body.coverImage === 'string') series.coverImage = req.body.coverImage;
      if (req.file) series.coverImage = await uploadToR2(req.file, 'series');
      if (typeof req.body.characterDesigns === 'string') {
        try {
          series.characterDesigns = JSON.parse(req.body.characterDesigns);
        } catch {
          res.status(400).json({ error: 'characterDesigns must be valid JSON.' });
          return;
        }
      }
    } else if (isAssignedEditor) {
      const suppliedKeys = Object.keys(req.body).filter((key) => req.body[key] !== undefined);
      if (suppliedKeys.some((key) => key !== 'deadline')) {
        res.status(403).json({ error: 'The assigned editor may only update the production deadline.' });
        return;
      }
      series.deadline = req.body.deadline ? new Date(req.body.deadline) : undefined;
    } else {
      res.status(403).json({ error: 'You are not authorized to update this series.' });
      return;
    }

    await series.save();
    await series.populate('mangakaId', 'displayName avatar');
    await series.populate('editorId', 'displayName avatar');
    res.json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function submitForReview(req: Request, res: Response): Promise<void> {
  try {
    const series = await submitSeries(String(req.params.id), req.user!);
    if (series.editorId && series.editorStatus === 'accepted') {
      await notifySeriesSubmitted(
        series.editorId.toString(),
        req.user?.displayName || 'Mangaka',
        series.title,
        series._id.toString()
      );
    } else {
      const ebHeads = await User.find({ role: 'editorial_board', isEbHead: true, isActive: true });
      await Promise.all(ebHeads.map((member) => createNotification({
        userId: member._id.toString(),
        type: 'system',
        title: 'Series Awaiting Editor Assignment',
        message: `"${series.title}" was submitted and needs a Tantou Editor assignment.`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
        target: 'eb_assign_editor',
      })));
    }
    res.json({ series, message: 'Series submitted for Tantou Editor review.' });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
}

export async function assignEditor(req: Request, res: Response): Promise<void> {
  try {
    const { editorId } = req.body;
    if (!editorId) {
      res.status(400).json({ error: 'editorId is required.' });
      return;
    }
    const series = await assignSeriesEditor(String(req.params.id), String(editorId), req.user!);
    const editor = await User.findById(editorId).select('displayName');
    await Promise.all([
      createNotification({
        userId: String(editorId),
        type: 'system',
        title: 'Tantou Editor Invitation',
        message: `You were invited to review "${series.title}". Accept the assignment before reviewing.`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
        target: 'editor_portfolio',
      }),
      createNotification({
        userId: series.mangakaId.toString(),
        type: 'system',
        title: 'Editor Invited',
        message: `${editor?.displayName || 'An editor'} was invited to review "${series.title}".`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
        target: 'mangaka_series',
      }),
    ]);
    res.json({ series, message: 'Tantou Editor invitation sent.' });
  } catch (error: any) {
    res.status(error.message.includes('Only the Head') ? 403 : 400).json({ error: error.message });
  }
}

export async function editorDecision(req: Request, res: Response): Promise<void> {
  try {
    const rawDecision = String(req.body.decision || '');
    const decision = rawDecision === 'approve' || rawDecision === 'approved' || rawDecision === 'submit_eb'
      ? 'approve'
      : rawDecision === 'request_changes' || rawDecision === 'rejected'
        ? 'request_changes'
        : null;
    if (!decision) {
      res.status(400).json({ error: 'Decision must be approve or request_changes.' });
      return;
    }

    const series = await reviewSeriesByEditor(String(req.params.id), decision, req.user!, req.body.comments);
    if (decision === 'approve') {
      await notifySeriesApproved(series.mangakaId.toString(), series.title, series._id.toString());
      const ebMembers = await User.find({ role: 'editorial_board', isActive: true });
      await Promise.all(ebMembers.map((member) => createNotification({
        userId: member._id.toString(),
        type: 'system',
        title: 'New Series Pending Vote',
        message: `Tantou Editor endorsed "${series.title}" for Editorial Board review.`,
        relatedId: series._id.toString(),
        relatedType: 'Series',
        target: 'eb_votes',
      })));
    } else {
      await notifySeriesRejected(
        series.mangakaId.toString(),
        series.title,
        series.rejectionNotes || '',
        series._id.toString()
      );
    }
    res.json({ series, message: decision === 'approve' ? 'Series sent to Editorial Board.' : 'Changes requested.' });
  } catch (error: any) {
    res.status(error.message.startsWith('Only the assigned') ? 403 : 400).json({ error: error.message });
  }
}

/**
 * Legacy implementation retained temporarily for migration reference.
 * It is intentionally not exported or routed; all writes use updateMetadata
 * and the dedicated workflow endpoints above.
 */
async function legacyUpdate(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, status, editorId, deadline, script, scriptFile, characterDesigns } = req.body;
    const genre = Array.isArray(req.body.genre)
      ? req.body.genre
      : typeof req.body.genre === 'string'
        ? req.body.genre.split(',').map((item: string) => item.trim()).filter(Boolean)
        : undefined;

    const oldSeries = await Series.findById(req.params.id);
    if (!oldSeries) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    const updateData: any = { title, description, status };
    if (genre) updateData.genre = genre;
    if (typeof req.body.coverImage === 'string') updateData.coverImage = req.body.coverImage;
    if (req.file) updateData.coverImage = await uploadToR2(req.file, 'series');
    if (deadline !== undefined) {
      updateData.deadline = deadline ? new Date(deadline) : null;
    }
    if (script !== undefined) updateData.script = script;
    if (scriptFile !== undefined) updateData.scriptFile = scriptFile;
    if (characterDesigns !== undefined) {
      let parsedCharacterDesigns = [];
      if (typeof characterDesigns === 'string') {
        try {
          parsedCharacterDesigns = JSON.parse(characterDesigns);
        } catch (e) {
          parsedCharacterDesigns = [];
        }
      } else if (Array.isArray(characterDesigns)) {
        parsedCharacterDesigns = characterDesigns;
      }
      updateData.characterDesigns = parsedCharacterDesigns;
    }

    // Automatically manage editor Status assignment when editorId changes
    if (editorId !== undefined) {
      const oldEditorIdStr = oldSeries.editorId?.toString() || '';
      const newEditorIdStr = (editorId && editorId !== 'none' && editorId !== 'null' && editorId !== 'undefined') ? editorId.toString() : '';
      if (oldEditorIdStr !== newEditorIdStr) {
        if (req.user?.role !== 'editorial_board') {
          res.status(403).json({ error: 'Only the Editorial Board can assign or change the designated Tantou Editor.' });
          return;
        }
        if (newEditorIdStr) {
          updateData.editorId = editorId;
          updateData.editorStatus = 'accepted'; // Bypass handshake and set directly to accepted
        } else {
          updateData.editorId = null;
          updateData.editorStatus = 'none';
        }
      }
    }

    // Role-based status transitions validation
    if (status && status !== oldSeries.status) {
      const userRole = req.user?.role;

      // 1. Draft -> Pending_Editor
      if (oldSeries.status === 'Draft' && status === 'Pending_Editor') {
        if (userRole !== 'mangaka' || oldSeries.mangakaId.toString() !== req.user?._id.toString()) {
          res.status(403).json({ error: 'Only the owning mangaka can submit a series to the Tantou Editor.' });
          return;
        }
        // Enforce at least 1 draft chapter exists before submitting
        const draftChaptersCount = await Chapter.countDocuments({ seriesId: req.params.id });
        if (draftChaptersCount === 0) {
          res.status(400).json({ error: 'Series must have at least one draft chapter before submitting for review.' });
          return;
        }
        updateData.rejectionNotes = ''; // clear previous comments
      }

      // 2. Pending_Editor -> Pending_EB
      else if (oldSeries.status === 'Pending_Editor' && status === 'Pending_EB') {
        if (userRole !== 'editor' || oldSeries.editorId?.toString() !== req.user?._id.toString()) {
          res.status(403).json({ error: 'Only the assigned Tantou Editor can approve and submit this series to the Editorial Board.' });
          return;
        }
      }

      // 3. Pending_Editor -> Draft (Reject)
      else if (oldSeries.status === 'Pending_Editor' && status === 'Draft') {
        if (userRole !== 'editor' || oldSeries.editorId?.toString() !== req.user?._id.toString()) {
          res.status(403).json({ error: 'Only the assigned Tantou Editor can review and reject this series draft.' });
          return;
        }
        updateData.rejectionNotes = req.body.rejectionNotes || 'Rejected by Tantou Editor';
      }

      // 4. Pending_EB -> Active (Publish)
      else if (oldSeries.status === 'Pending_EB' && status === 'Active') {
        if (userRole !== 'editorial_board') {
          res.status(403).json({ error: 'Only the Editorial Board can approve and publish a series.' });
          return;
        }
      }

      // 5. Pending_EB -> Draft (Reject)
      else if (oldSeries.status === 'Pending_EB' && status === 'Draft') {
        if (userRole !== 'editorial_board') {
          res.status(403).json({ error: 'Only the Editorial Board can review and reject this series draft.' });
          return;
        }
        updateData.rejectionNotes = req.body.rejectionNotes || 'Rejected by Editorial Board';
      }

      else {
        if (userRole !== 'mangaka' && userRole !== 'editor' && userRole !== 'editorial_board') {
          res.status(403).json({ error: 'Unauthorized status transition.' });
          return;
        }
      }
    }

    const series = await Series.findByIdAndUpdate(
      String(req.params.id),
      updateData,
      { new: true, runValidators: true }
    )
      .populate('mangakaId', 'displayName avatar')
      .populate('editorId', 'displayName avatar');

    // Trigger real-time notifications for Series workflow
    if (status && status !== oldSeries.status) {
      try {
        const mangakaIdStr = oldSeries.mangakaId.toString();
        const editorIdStr = (editorId || oldSeries.editorId)?.toString();

        // 1. Draft -> Pending_Editor
        if (oldSeries.status === 'Draft' && status === 'Pending_Editor') {
          if (editorIdStr) {
            const mangakaUser = await User.findById(mangakaIdStr);
            const mangakaName = mangakaUser?.displayName || 'Mangaka';
            await notifySeriesSubmitted(editorIdStr, mangakaName, series?.title || oldSeries.title, oldSeries._id.toString());
          }
        }

        // 2. Pending_Editor -> Pending_EB
        else if (oldSeries.status === 'Pending_Editor' && status === 'Pending_EB') {
          await notifySeriesApproved(mangakaIdStr, series?.title || oldSeries.title, oldSeries._id.toString());
          try {
            const ebMembers = await User.find({ role: 'editorial_board', isActive: true });
            for (const member of ebMembers) {
              await createNotification({
                userId: member._id.toString(),
                type: 'system',
                title: 'New Series Pending Vote',
                message: `Tantou Editor approved and submitted "${series?.title || oldSeries.title}" for Editorial Board vote.`,
                relatedId: oldSeries._id.toString(),
                relatedType: 'Series',
                target: 'eb_votes',
              });
            }
          } catch (ebErr) {
            console.error('Failed to notify EB members:', ebErr);
          }
        }

        // 3. Pending_Editor -> Draft (Reject)
        else if (oldSeries.status === 'Pending_Editor' && status === 'Draft') {
          const notes = req.body.rejectionNotes || 'Rejected by Tantou Editor';
          await notifySeriesRejected(mangakaIdStr, series?.title || oldSeries.title, notes, oldSeries._id.toString());
        }

        // 4. Pending_EB -> Active (Publish)
        else if (oldSeries.status === 'Pending_EB' && status === 'Active') {
          await notifySeriesPublished(mangakaIdStr, editorIdStr, series?.title || oldSeries.title, oldSeries._id.toString());
          await notifyNewSeriesToSubscribers(oldSeries._id.toString(), series?.title || oldSeries.title);
        }

        // 5. Pending_EB -> Draft (Reject)
        else if (oldSeries.status === 'Pending_EB' && status === 'Draft') {
          const notes = req.body.rejectionNotes || 'Rejected by Editorial Board';
          await notifySeriesEBRejected(mangakaIdStr, series?.title || oldSeries.title, notes, oldSeries._id.toString());
        }
      } catch (notifErr) {
        console.error('Failed to trigger series notification:', notifErr);
      }
    }

    const oldEditorIdStr = oldSeries.editorId?.toString();
    const newEditorIdStr = (editorId !== undefined)
      ? (editorId && editorId !== 'none' && editorId !== 'null' && editorId !== 'undefined' ? editorId.toString() : '')
      : oldEditorIdStr;

    if (editorId !== undefined && newEditorIdStr && oldEditorIdStr !== newEditorIdStr) {
      try {
        const editorUser = await User.findById(newEditorIdStr);
        const editorName = editorUser?.displayName || 'Editor';
        const mangakaIdStr = oldSeries.mangakaId.toString();

        // 1. Notify the assigned Editor
        await createNotification({
          userId: newEditorIdStr,
          type: 'system',
          title: 'Tantou Editor Assignment',
          message: `You have been assigned as the Tantou Editor for the series "${series?.title || oldSeries.title}" by the Editorial Board.`,
          relatedId: oldSeries._id.toString(),
          relatedType: 'Series',
          target: 'editor_portfolio',
        });

        // 2. Notify the Mangaka
        await createNotification({
          userId: mangakaIdStr,
          type: 'system',
          title: 'Editor Assigned to Series',
          message: `Editor ${editorName} has been assigned as the Tantou Editor for your series "${series?.title || oldSeries.title}".`,
          relatedId: oldSeries._id.toString(),
          relatedType: 'Series',
          target: 'mangaka_series',
        });
      } catch (err) {
        console.error('Failed to trigger assignment notifications during series update:', err);
      }
    }

    res.json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getEditors(req: Request, res: Response): Promise<void> {
  try {
    const editors = await User.find({ role: 'editor', isActive: true }, 'displayName email avatar');
    res.json({ editors });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    const series = await Series.findOneAndDelete({ _id: req.params.id, mangakaId: req.user?._id });
    if (!series) {
      res.status(404).json({ error: 'Series not found or you do not own it.' });
      return;
    }
    res.json({ message: 'Series deleted.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function handleHandshake(req: Request, res: Response): Promise<void> {
  try {
    const { action } = req.body;
    if (action !== 'accept' && action !== 'decline') {
      res.status(400).json({ error: 'Invalid handshake action. Must be "accept" or "decline".' });
      return;
    }

    const series = await respondToSeriesAssignment(String(req.params.id), action, req.user!);
    await createNotification({
      userId: series.mangakaId.toString(),
      type: 'system',
      title: action === 'accept' ? 'Handshake Accepted' : 'Handshake Declined',
      message: `Editor ${req.user?.displayName || 'Editor'} has ${action === 'accept' ? 'accepted' : 'declined'} the invitation for "${series.title}".`,
      relatedId: series._id.toString(),
      relatedType: 'Series',
      target: 'mangaka_series',
    });

    res.json({ series, message: `Successfully responded with ${action}.` });
  } catch (error: any) {
    res.status(error.message.startsWith('Only the invited') ? 403 : 400).json({ error: error.message });
  }
}

export async function toggleSubscribe(req: Request, res: Response): Promise<void> {
  try {
    const series = await Series.findById(req.params.id);
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    if (!Array.isArray(series.subscribers)) {
      series.subscribers = [];
    }

    const userIdStr = req.user!._id.toString();
    const index = series.subscribers.findIndex((subId) => subId.toString() === userIdStr);

    let isSubscribed = false;
    if (index === -1) {
      series.subscribers.push(new Types.ObjectId(req.user!._id));
      isSubscribed = true;
    } else {
      series.subscribers.splice(index, 1);
      isSubscribed = false;
    }

    await series.save();
    res.json({
      message: isSubscribed ? 'Subscribed successfully.' : 'Unsubscribed successfully.',
      subscribed: isSubscribed,
      subscribersCount: series.subscribers.length,
      series,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
