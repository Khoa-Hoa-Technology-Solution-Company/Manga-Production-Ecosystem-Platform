import { Request, Response } from 'express';
import { Series } from '../models/Series';
import { uploadToR2 } from '../services/storage.service';

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

    const updateData: any = { title, description, status, editorId };
    if (genre) updateData.genre = genre;
    if (typeof req.body.coverImage === 'string') updateData.coverImage = req.body.coverImage;
    if (req.file) updateData.coverImage = await uploadToR2(req.file, 'series');

    const series = await Series.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!series) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }
    res.json({ series });
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
