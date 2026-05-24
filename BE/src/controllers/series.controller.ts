import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { uploadToR2 } from '../services/storage.service';
import { notifySeriesReview } from '../services/notification.service';

export async function getAll(req: Request, res: Response): Promise<void> {
  try {
    const { status, genre, sort, limit = '20', page = '1' } = req.query;
    const filter: Record<string, unknown> = {};

    if (status) filter.status = status;
    if (genre) filter.genre = { $in: [genre] };

    // Role-based filtering
    if (req.user?.role === 'mangaka') {
      filter.mangakaId = req.user._id;
    } else if (req.user?.role === 'editor') {
      filter.workflowStage = 'editor';
      if (!status) filter.status = { $in: ['Submitted', 'Needs Revision'] };
    } else if (req.user?.role === 'editorial_board') {
      filter.workflowStage = 'board';
      if (!status) filter.status = { $in: ['Approved by Editor', 'Board Review'] };
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
    const { title, description, genre, status } = req.body;
    const normalizedGenre = Array.isArray(genre)
      ? genre
      : typeof genre === 'string'
        ? genre.split(',').map((item: string) => item.trim()).filter(Boolean)
        : [];

    if (!title || !description || normalizedGenre.length === 0) {
      res.status(400).json({ error: 'Title, description, and genre are required.' });
      return;
    }

    const coverImage = req.file ? await uploadToR2(req.file, 'series-covers') : undefined;

    const series = await Series.create({
      title: String(title).trim(),
      description: String(description).trim(),
      genre: normalizedGenre,
      coverImage,
      status: status || 'Draft',
      workflowStage: 'mangaka',
      mangakaId: req.user?._id,
    });
    res.status(201).json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const { title, description, genre, coverImage, status, editorId } = req.body;
    const normalizedGenre = Array.isArray(genre)
      ? genre
      : typeof genre === 'string'
        ? genre.split(',').map((item: string) => item.trim()).filter(Boolean)
        : undefined;

    const isEditorAction = req.user?.role === 'editor' || req.user?.role === 'editorial_board';
    const isMangakaOwner = req.user?.role === 'mangaka';

    const series = await Series.findOneAndUpdate(
      {
        _id: req.params.id,
        ...(isMangakaOwner ? { mangakaId: req.user._id } : {}),
      },
      {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(normalizedGenre ? { genre: normalizedGenre } : {}),
        ...(coverImage !== undefined ? { coverImage } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(editorId !== undefined ? { editorId } : {}),
      },
      { new: true, runValidators: true }
    );
    if (!series) {
      res.status(404).json({ error: 'Series not found or you do not own it.' });
      return;
    }

    if (status && isEditorAction) {
      await notifySeriesReview(String(series.mangakaId), series.title, String(status), String(series._id), typeof req.body.reviewNotes === 'string' ? req.body.reviewNotes : undefined);
    }

    res.json({ series });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function submit(req: Request, res: Response): Promise<void> {
  try {
    const { submissionNotes } = req.body;
    const series = await Series.findOneAndUpdate(
      { _id: req.params.id, mangakaId: req.user?._id },
      {
        status: 'Submitted',
        workflowStage: 'editor',
        ...(submissionNotes !== undefined ? { submissionNotes: String(submissionNotes).trim() } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!series) {
      res.status(404).json({ error: 'Series not found or you do not own it.' });
      return;
    }

    res.json({ series, message: 'Series submitted for review.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function review(req: Request, res: Response): Promise<void> {
  try {
    const { status, reviewNotes, editorId } = req.body;
    const allowedStatuses = ['Needs Revision', 'Approved by Editor', 'Board Review', 'Rejected', 'Published', 'Active'];
    if (!allowedStatuses.includes(String(status))) {
      res.status(400).json({ error: 'Invalid review status.' });
      return;
    }

    const nextStatus = String(status);
    const nextWorkflowStage = nextStatus === 'Board Review' ? 'board' : nextStatus === 'Published' ? 'published' : 'editor';

    const series = await Series.findByIdAndUpdate(
      req.params.id,
      {
        status: nextStatus,
        workflowStage: nextWorkflowStage,
        ...(reviewNotes !== undefined ? { reviewNotes: String(reviewNotes).trim() } : {}),
        ...(editorId !== undefined ? { editorId } : {}),
      },
      { new: true, runValidators: true }
    );

    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }

    if (req.user?.role === 'editor' || req.user?.role === 'editorial_board') {
      await notifySeriesReview(String(series.mangakaId), series.title, nextStatus, String(series._id), series.reviewNotes);
    }

    res.json({ series, message: `Series moved to ${status}.` });
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
