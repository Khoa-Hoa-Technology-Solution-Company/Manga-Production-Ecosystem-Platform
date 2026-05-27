import { Request, Response } from 'express';
import { Annotation } from '../models/Annotation';

export async function getByChapterId(req: Request, res: Response): Promise<void> {
  try {
    const filter: Record<string, unknown> = { chapterId: req.params.chapterId };
    const { source } = req.query;
    if (source === 'review' || source === 'tracking') {
      filter.source = source;
    }
    const annotations = await Annotation.find(filter)
      .populate('authorId', 'displayName avatar role')
      .sort({ createdAt: 1 });
    res.json({ annotations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const { chapterId, pageId, x, y, note, source } = req.body;
    if (!chapterId || !pageId || x === undefined || y === undefined || !note) {
      res.status(400).json({ error: 'Missing required annotation fields.' });
      return;
    }

    const annotation = await Annotation.create({
      chapterId,
      pageId,
      authorId: req.user?._id,
      x,
      y,
      note,
      source: source === 'review' ? 'review' : 'tracking',
      status: 'open',
    });

    const populated = await Annotation.findById(annotation._id).populate('authorId', 'displayName avatar role');
    res.status(201).json({ annotation: populated });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function resolve(req: Request, res: Response): Promise<void> {
  try {
    const annotation = await Annotation.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    ).populate('authorId', 'displayName avatar role');

    if (!annotation) {
      res.status(404).json({ error: 'Annotation not found.' });
      return;
    }
    res.json({ annotation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
