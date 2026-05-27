import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { User } from '../models/User';
import { uploadToR2 } from '../services/storage.service';
import {
  notifySeriesSubmitted,
  notifySeriesApproved,
  notifySeriesRejected,
  notifySeriesPublished,
  notifySeriesEBRejected,
} from '../services/notification.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { status, genre, sort, limit = '20', page = '1' } = req.query;
    const filter: any = {};

    if (status) filter.status = status;
    if (genre) filter.genre = { $in: [genre] };

    // Role-based filtering
    if (req.user?.role === 'mangaka') {
      filter.mangakaId = req.user._id;
    } else if (req.user?.role === 'editor') {
      filter.editorId = req.user._id;
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

    res.json({ series, total, page: parseInt(page as string), totalPages: Math.ceil(total / parseInt(limit as string)) });
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
    res.json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { title, description } = req.body;
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

    const series = await Series.create({
      title,
      description,
      genre,
      coverImage,
      mangakaId: req.user?._id,
    });
    res.status(201).json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, status, editorId } = req.body;
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

    const updateData: any = { title, description, status, editorId };
    if (genre) updateData.genre = genre;
    if (typeof req.body.coverImage === 'string') updateData.coverImage = req.body.coverImage;
    if (req.file) updateData.coverImage = await uploadToR2(req.file, 'series');

    // Role-based status transitions validation
    if (status && status !== oldSeries.status) {
      const userRole = req.user?.role;
      
      // 1. Draft -> Pending_Editor
      if (oldSeries.status === 'Draft' && status === 'Pending_Editor') {
        if (userRole !== 'mangaka' || oldSeries.mangakaId.toString() !== req.user?._id.toString()) {
          res.status(403).json({ error: 'Only the owning mangaka can submit a series to the Tantou Editor.' });
          return;
        }
        const targetEditorId = editorId || oldSeries.editorId;
        if (!targetEditorId) {
          res.status(400).json({ error: 'A Tantou Editor must be assigned before submitting for review.' });
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
      req.params.id,
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
        }
        
        // 3. Pending_Editor -> Draft (Reject)
        else if (oldSeries.status === 'Pending_Editor' && status === 'Draft') {
          const notes = req.body.rejectionNotes || 'Rejected by Tantou Editor';
          await notifySeriesRejected(mangakaIdStr, series?.title || oldSeries.title, notes, oldSeries._id.toString());
        }
        
        // 4. Pending_EB -> Active (Publish)
        else if (oldSeries.status === 'Pending_EB' && status === 'Active') {
          await notifySeriesPublished(mangakaIdStr, editorIdStr, series?.title || oldSeries.title, oldSeries._id.toString());
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
